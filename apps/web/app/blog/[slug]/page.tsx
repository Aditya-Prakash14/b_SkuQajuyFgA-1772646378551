import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { BLOG_POSTS, getPost } from '@/lib/blog-data'

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: 'Post not found' }
  return { title: `${post.title} | MyPrimeCompany`, description: post.excerpt }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  const related = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <PageShell>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-primary font-semibold hover:underline mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">{post.category}</span>
          <span className="text-xs text-gray-400">{post.date}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-6">{post.title}</h1>

        <div className="rounded-2xl overflow-hidden mb-8 border border-gray-100">
          <img src={post.img} alt={post.title} className="w-full h-72 object-cover" />
        </div>

        <div className="space-y-5 text-gray-600 leading-relaxed">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/10 p-6 text-center">
          <h2 className="font-black text-gray-900">Need this done professionally?</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">Book a verified MyPrimeCompany team in minutes.</p>
          <Link href="/services" className="inline-block bg-brand text-white px-6 py-3 rounded-xl font-bold hover:bg-brand/90 transition-colors">
            Explore services
          </Link>
        </div>
      </article>

      <section className="bg-gray-50 border-t border-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-black text-gray-900 mb-6">More from the blog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
                <div className="h-36 overflow-hidden">
                  <img src={p.img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
