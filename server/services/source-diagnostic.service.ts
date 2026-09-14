import * as cheerio from 'cheerio';
import { SsrfGuardService } from './ssrf-guard.service.ts';
import { ParserFactory, ParsedArticle } from './parsers/index.ts';

export interface DiagnosticResult {
  url: string;
  timestamp: string;
  security: {
    safe: boolean;
    reason?: string;
  };
  http: {
    reachable: boolean;
    status?: number;
    statusText?: string;
    responseTimeMs?: number;
    contentType?: string;
    server?: string;
    contentLength?: number;
  };
  robotsTxt: {
    found: boolean;
    url: string;
    allowedForBot: boolean;
    sitemaps: string[];
    rawExcerpt?: string;
  };
  feeds: {
    rssDetected: boolean;
    rssUrls: string[];
    sitemapsDetected: boolean;
    sitemapUrls: string[];
  };
  discoveredUrls: string[];
  sampleArticle?: ParsedArticle;
  blocksCount?: number;
  error?: string;
}

export class SourceDiagnosticService {
  static async runFullDiagnostic(targetUrl: string, parserType: string = 'generic_rss', customConfig?: any): Promise<DiagnosticResult> {
    const start = Date.now();
    const result: DiagnosticResult = {
      url: targetUrl,
      timestamp: new Date().toISOString(),
      security: { safe: true },
      http: { reachable: false },
      robotsTxt: { found: false, url: '', allowedForBot: true, sitemaps: [] },
      feeds: { rssDetected: false, rssUrls: [], sitemapsDetected: false, sitemapUrls: [] },
      discoveredUrls: []
    };

    // 1. SSRF Safety Verification
    const securityCheck = SsrfGuardService.isSafeUrl(targetUrl);
    result.security = {
      safe: securityCheck.safe,
      reason: securityCheck.reason
    };

    if (!securityCheck.safe) {
      result.error = `SSRF Guard blocked URL: ${securityCheck.reason}`;
      return result;
    }

    // 2. Fetch Target URL
    let body = '';
    try {
      const resp = await SsrfGuardService.safeFetch(targetUrl, {
        timeoutMs: 12000,
        headers: customConfig?.headers || {}
      });

      result.http = {
        reachable: true,
        status: resp.status,
        statusText: resp.statusText,
        responseTimeMs: Date.now() - start,
        contentType: resp.headers['content-type'],
        server: resp.headers['server'],
        contentLength: resp.headers['content-length'] ? parseInt(resp.headers['content-length'], 10) : undefined
      };

      body = await resp.text();
    } catch (err: any) {
      result.http.reachable = false;
      result.http.responseTimeMs = Date.now() - start;
      result.error = `HTTP Connection Failed: ${err.message}`;
      return result;
    }

    // 3. Robots.txt Inspection
    try {
      const urlObj = new URL(targetUrl);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      result.robotsTxt.url = robotsUrl;

      const robotsResp = await SsrfGuardService.safeFetch(robotsUrl, { timeoutMs: 5000 });
      if (robotsResp.ok) {
        result.robotsTxt.found = true;
        const robotsText = await robotsResp.text();
        result.robotsTxt.rawExcerpt = robotsText.substring(0, 500);

        // Extract sitemaps listed in robots.txt
        const sitemapMatches = robotsText.match(/^Sitemap:\s*(.+)$/gim);
        if (sitemapMatches) {
          result.robotsTxt.sitemaps = sitemapMatches.map(m => m.replace(/^Sitemap:\s*/i, '').trim());
          result.feeds.sitemapUrls.push(...result.robotsTxt.sitemaps);
          result.feeds.sitemapsDetected = true;
        }

        // Check disallow rules for User-Agent: * or TechOrbitBot
        const disallowMatches = robotsText.match(/Disallow:\s*(\/.*)$/gm);
        if (disallowMatches) {
          for (const d of disallowMatches) {
            const path = d.replace(/Disallow:\s*/i, '').trim();
            if (path === '/' && !robotsText.includes('Allow:')) {
              result.robotsTxt.allowedForBot = false;
            }
          }
        }
      }
    } catch {
      // Non-fatal if robots.txt doesn't exist
    }

    // 4. RSS & Sitemap Auto-Detection
    const isXml = body.includes('<rss') || body.includes('<feed') || body.includes('<channel');
    if (isXml) {
      result.feeds.rssDetected = true;
      result.feeds.rssUrls.push(targetUrl);
    } else {
      // Look for <link rel="alternate" type="application/rss+xml">
      const $ = cheerio.load(body);
      $('link[type*="rss"], link[type*="atom"]').each((_, el) => {
        const href = $(el).attr('href');
        if (href) {
          try {
            const feedUrl = new URL(href, targetUrl).toString();
            if (!result.feeds.rssUrls.includes(feedUrl)) {
              result.feeds.rssUrls.push(feedUrl);
              result.feeds.rssDetected = true;
            }
          } catch {}
        }
      });

      // Probe standard feed locations if none found yet
      if (result.feeds.rssUrls.length === 0) {
        const urlObj = new URL(targetUrl);
        const candidates = ['/feed/', '/feed', '/rss', '/rss.xml', '/atom.xml'];
        for (const path of candidates) {
          const probeUrl = `${urlObj.protocol}//${urlObj.host}${path}`;
          try {
            const probe = await SsrfGuardService.safeFetch(probeUrl, { method: 'HEAD', timeoutMs: 3000 });
            if (probe.ok && (probe.headers['content-type']?.includes('xml') || probe.headers['content-type']?.includes('rss'))) {
              result.feeds.rssUrls.push(probeUrl);
              result.feeds.rssDetected = true;
              break;
            }
          } catch {}
        }
      }
    }

    // 5. Run Parser Discovery & Sample Article Extraction
    try {
      const parser = ParserFactory.getParser(parserType);
      const discovery = await parser.discover(body, targetUrl, customConfig);
      result.discoveredUrls = discovery.articleUrls.slice(0, 15);

      if (discovery.sampleArticles && discovery.sampleArticles.length > 0) {
        result.sampleArticle = discovery.sampleArticles[0];
        result.blocksCount = result.sampleArticle.blocks.length;
      } else if (result.discoveredUrls.length > 0) {
        // Fetch the first discovered article URL to extract sample
        const sampleUrl = result.discoveredUrls[0];
        try {
          const sampleResp = await SsrfGuardService.safeFetch(sampleUrl, { timeoutMs: 10000 });
          if (sampleResp.ok) {
            const sampleBody = await sampleResp.text();
            // Choose html or custom parser for article body
            const articleParser = parserType === 'wylsa_custom' ? ParserFactory.getParser('wylsa_custom') : ParserFactory.getParser('generic_html');
            const parsed = await articleParser.parseArticle(sampleBody, sampleUrl, customConfig);
            result.sampleArticle = parsed;
            result.blocksCount = parsed.blocks.length;
          }
        } catch (sampleErr: any) {
          result.error = `Discovered ${result.discoveredUrls.length} URLs, but sample fetch failed: ${sampleErr.message}`;
        }
      } else if (!isXml) {
        // Maybe targetUrl itself is a direct article! Try parsing it directly
        const articleParser = ParserFactory.getParser(parserType);
        const parsed = await articleParser.parseArticle(body, targetUrl, customConfig);
        if (parsed.title && parsed.blocks.length > 0) {
          result.sampleArticle = parsed;
          result.blocksCount = parsed.blocks.length;
        }
      }
    } catch (parseErr: any) {
      result.error = `Parser error: ${parseErr.message}`;
    }

    return result;
  }
}
