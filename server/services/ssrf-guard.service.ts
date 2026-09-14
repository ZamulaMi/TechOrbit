export interface SafeFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes?: number;
  method?: 'GET' | 'HEAD' | 'POST';
  body?: string;
}

export interface SafeFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

export class SsrfGuardService {
  private static readonly BLOCKED_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    'metadata.google.internal',
    '169.254.169.254',
    'instance-data'
  ]);

  /**
   * Validates whether a given URL is safe to fetch from an external server.
   * Blocks:
   * - non http/https protocols
   * - localhost & loopback addresses
   * - RFC1918 private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
   * - Link-local & cloud metadata (169.254.0.0/16)
   * - .local, .internal, .lan top-level internal domains
   */
  static isSafeUrl(inputUrl: string): { safe: boolean; reason?: string; normalizedUrl?: string } {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { safe: false, reason: 'URL must be a non-empty string' };
    }

    try {
      const parsed = new URL(inputUrl.trim());

      // 1. Protocol check
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { safe: false, reason: `Unsupported protocol "${parsed.protocol}". Only http: and https: are permitted.` };
      }

      const hostname = parsed.hostname.toLowerCase();

      // 2. Exact match blocked hosts
      if (this.BLOCKED_HOSTS.has(hostname)) {
        return { safe: false, reason: `Direct loopback or metadata host "${hostname}" is blocked.` };
      }

      // 3. Internal domain suffixes
      if (
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.lan') ||
        hostname.endsWith('.corp') ||
        hostname.endsWith('.home') ||
        hostname.endsWith('.localhost')
      ) {
        return { safe: false, reason: `Internal domain suffix in "${hostname}" is blocked.` };
      }

      // 4. IPv4 checks
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
      const match = hostname.match(ipv4Regex);
      if (match) {
        const octets = [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          parseInt(match[4], 10)
        ];

        // Valid range check
        if (octets.some(o => o < 0 || o > 255)) {
          return { safe: false, reason: 'Invalid IP octets' };
        }

        // Loopback 127.0.0.0/8
        if (octets[0] === 127) {
          return { safe: false, reason: 'Loopback IP range is blocked' };
        }

        // 0.0.0.0/8
        if (octets[0] === 0) {
          return { safe: false, reason: 'Current network IP range is blocked' };
        }

        // 10.0.0.0/8
        if (octets[0] === 10) {
          return { safe: false, reason: 'Private network 10.0.0.0/8 is blocked' };
        }

        // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
        if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
          return { safe: false, reason: 'Private network 172.16.0.0/12 is blocked' };
        }

        // 192.168.0.0/16
        if (octets[0] === 192 && octets[1] === 168) {
          return { safe: false, reason: 'Private network 192.168.0.0/16 is blocked' };
        }

        // 169.254.0.0/16 (Link local / AWS / GCP metadata)
        if (octets[0] === 169 && octets[1] === 254) {
          return { safe: false, reason: 'Link-local and metadata address 169.254.0.0/16 is blocked' };
        }

        // Broadcast 255.255.255.255
        if (octets[0] === 255 && octets[1] === 255 && octets[2] === 255 && octets[3] === 255) {
          return { safe: false, reason: 'Broadcast address is blocked' };
        }
      }

      // 5. Port check: allow standard 80, 443, 8080, 8443
      if (parsed.port) {
        const port = parseInt(parsed.port, 10);
        const allowedPorts = [80, 443, 8080, 8443];
        if (!allowedPorts.includes(port)) {
          return { safe: false, reason: `Port ${port} is not in the allowed list for external scraping.` };
        }
      }

      return { safe: true, normalizedUrl: parsed.toString() };
    } catch (err: any) {
      return { safe: false, reason: `URL parsing failure: ${err.message}` };
    }
  }

  /**
   * Safe fetch with SSRF verification, custom timeout, User-Agent, and max body size guards.
   */
  static async safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResponse> {
    const check = this.isSafeUrl(url);
    if (!check.safe) {
      throw new Error(`SSRF Guard blocked request to "${url}": ${check.reason}`);
    }

    const targetUrl = check.normalizedUrl || url;
    const timeoutMs = options.timeoutMs || 15000;
    const maxBytes = options.maxBytes || 10 * 1024 * 1024; // 10MB limit

    const headers: Record<string, string> = {
      'User-Agent': 'TechOrbitBot/1.0 (+https://techorbit.media/bot; aggregator; contact: bot@techorbit.media)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6',
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method: options.method || 'GET',
        headers,
        body: options.body,
        signal: controller.signal,
        redirect: 'follow'
      });

      // Verify redirect target if any
      if (response.url && response.url !== targetUrl) {
        const redirectCheck = this.isSafeUrl(response.url);
        if (!redirectCheck.safe) {
          throw new Error(`SSRF Guard blocked redirect to "${response.url}": ${redirectCheck.reason}`);
        }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });

      const resObj: SafeFetchResponse = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        text: async () => {
          const text = await response.text();
          if (text.length > maxBytes) {
            throw new Error(`Response size (${text.length} bytes) exceeds safety limit of ${maxBytes} bytes`);
          }
          return text;
        },
        json: async () => {
          const json = await response.json();
          return json;
        }
      };

      return resObj;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms for ${targetUrl}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
