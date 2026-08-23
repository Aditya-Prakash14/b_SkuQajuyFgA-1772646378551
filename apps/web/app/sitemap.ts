import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/env'
import { getAllCategorySlugs, getAllServiceSlugs } from '@/lib/services-data'
import { BLOG_POSTS } from '@/lib/blog-data'

// Regenerate alongside the catalog pages, so a service added in the CRM shows
// up in the sitemap within the same window it appears on the site.
export const revalidate = 300

const STATIC_PATHS = [
  '/',
  // The two business domains. /services now redirects to /deep-cleaning, so it
  // is deliberately not listed.
  '/deep-cleaning',
  '/prime-now',
  '/about',
  '/contact',
  '/become-partner',
  '/careers',
  '/blog',
  '/faq',
  '/privacy',
  '/terms',
  '/refund-policy',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, categories] = await Promise.all([getAllServiceSlugs(), getAllCategorySlugs()])
  const now = new Date()

  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...categories.map((slug) => ({
      url: `${SITE_URL}/deep-cleaning/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/services/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...BLOG_POSTS.map((post) => {
      // Hand-authored dates ('02 Mar 2026'). An unparseable one would otherwise
      // fail the build inside Next's toISOString() serialization.
      const published = new Date(post.date)
      return {
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: Number.isNaN(published.getTime()) ? now : published,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }
    }),
  ]
}
