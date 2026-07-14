import type { MetadataRoute } from 'next'

/**
 * The CRM is an internal admin console — it must never be indexed. This backs
 * up the `X-Robots-Tag: noindex, nofollow` header set in vercel.json (belt and
 * braces: the header covers assets and API routes, robots.txt covers crawlers
 * that only read robots.txt).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
