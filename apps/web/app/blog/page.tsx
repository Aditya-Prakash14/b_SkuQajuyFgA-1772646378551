import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageShell, PageHero } from '@/components/page-shell'
import { BLOG_POSTS } from '@/lib/blog-data'

export const metadata: Metadata = {
  title: 'Blog | MyPrimeCompany',
  description: 'Cleaning tips, service guides and expert insights from the MyPrimeCompany team.',
}

export default function BlogPage() {
  return (
    <PageShell>
      <PageHero title="Cleaning Tips & Guides" subtitle="Expert insights from the people who do this every day." />

      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all flex flex-col"
            >
              <div className="h-44 overflow-hidden">
                <img src={post.img} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{post.category}</span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
                <h2 className="font-bold text-gray-900 leading-snug group-hover:text-primary transition-colors">{post.title}</h2>
                <p className="text-sm text-gray-500 mt-2 line-clamp-3 flex-1">{post.excerpt}</p>
                <span className="mt-4 text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
