import { useEffect } from 'react';

export interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  hreflangs?: { lang: string; href: string }[];
  jsonLd?: any | any[];
  lang?: 'uk' | 'en';
  googleSiteVerification?: string;
  googleAnalyticsId?: string;
}

function setMetaTag(nameOrProperty: 'name' | 'property', attrValue: string, content: string | undefined) {
  if (!content) return;
  let element = document.querySelector(`meta[${nameOrProperty}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(nameOrProperty, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string | undefined, extraAttrs: Record<string, string> = {}) {
  if (!href) return;
  const selector = Object.entries(extraAttrs).reduce(
    (acc, [k, v]) => `${acc}[${k}="${v}"]`,
    `link[rel="${rel}"]`
  );
  let element = document.querySelector(selector) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    for (const [k, v] of Object.entries(extraAttrs)) {
      element.setAttribute(k, v);
    }
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export function SeoHead({
  title,
  description,
  canonical,
  robots = 'index, follow',
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  ogType = 'article',
  twitterTitle,
  twitterDescription,
  twitterImage,
  hreflangs = [],
  jsonLd,
  lang = 'uk',
  googleSiteVerification,
  googleAnalyticsId
}: SeoProps) {
  useEffect(() => {
    // 1. Document Title
    if (title) {
      document.title = title;
    }

    // 2. Standard Meta Tags
    if (description) {
      setMetaTag('name', 'description', description);
    }
    if (robots) {
      setMetaTag('name', 'robots', robots);
    }
    if (googleSiteVerification) {
      setMetaTag('name', 'google-site-verification', googleSiteVerification);
    }

    // 3. Self-referencing Canonical
    const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.href : '');
    // Safety verification: NEVER allow canonical to point to wylsa.com
    const cleanCanonical = currentUrl.includes('wylsa.com')
      ? currentUrl.replace(/https?:\/\/wylsa\.com/g, 'https://techorbit.media')
      : currentUrl;

    if (cleanCanonical) {
      setLinkTag('canonical', cleanCanonical);
    }

    // 4. Hreflang Tags (uk, en, x-default)
    for (const hl of hreflangs) {
      setLinkTag('alternate', hl.href, { hreflang: hl.lang });
    }

    // 5. OpenGraph
    const resolvedOgTitle = ogTitle || title;
    const resolvedOgDesc = ogDescription || description;
    const resolvedOgImage = ogImage || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=630&fit=crop&q=80';
    const resolvedOgUrl = ogUrl || cleanCanonical;

    setMetaTag('property', 'og:title', resolvedOgTitle);
    setMetaTag('property', 'og:description', resolvedOgDesc);
    setMetaTag('property', 'og:image', resolvedOgImage);
    setMetaTag('property', 'og:url', resolvedOgUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'TechOrbit');
    setMetaTag('property', 'og:locale', lang === 'uk' ? 'uk_UA' : 'en_US');

    // 6. Twitter Card
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', twitterTitle || resolvedOgTitle);
    setMetaTag('name', 'twitter:description', twitterDescription || resolvedOgDesc);
    setMetaTag('name', 'twitter:image', twitterImage || resolvedOgImage);
    setMetaTag('name', 'twitter:site', '@techorbit');

    // 7. Structured Data (JSON-LD)
    if (jsonLd) {
      const scriptId = 'techorbit-dynamic-jsonld';
      let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = JSON.stringify(jsonLd);
    }

    // 8. Google Analytics (GA4)
    if (googleAnalyticsId && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
      const gaScriptId = 'techorbit-ga-script';
      if (!document.getElementById(gaScriptId)) {
        const gaScript = document.createElement('script');
        gaScript.id = gaScriptId;
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
        document.head.appendChild(gaScript);

        const gaInitScript = document.createElement('script');
        gaInitScript.id = 'techorbit-ga-init';
        gaInitScript.text = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${googleAnalyticsId}');
        `;
        document.head.appendChild(gaInitScript);
      }
    }
  }, [
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    ogType,
    twitterTitle,
    twitterDescription,
    twitterImage,
    hreflangs,
    jsonLd,
    lang,
    googleSiteVerification,
    googleAnalyticsId
  ]);

  return null;
}
