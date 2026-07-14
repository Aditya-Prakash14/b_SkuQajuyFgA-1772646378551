/**
 * Supabase public env, validated once at module load.
 *
 * NEXT_PUBLIC_* values are inlined by Next at BUILD time, not read at runtime.
 * The public site prerenders its catalog (ISR pages + generateStaticParams), so
 * a missing value does not degrade gracefully — it surfaces as a cryptic
 * "supabaseUrl is required" thrown from inside static generation, with no hint
 * about which env var or which environment. Fail here instead, with an error
 * that says exactly what to do.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
      'Local:  cp apps/web/.env.example apps/web/.env.local  (then fill it in)\n' +
      'Vercel: Project → Settings → Environment Variables → add both to\n' +
      '        Production, Preview and Development, then redeploy.\n\n' +
      'These must exist at BUILD time — the service catalog is prerendered.',
  )
}

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey

/**
 * Absolute origin of the deployed site, used for OG/canonical URLs and the
 * sitemap. Vercel injects VERCEL_PROJECT_PRODUCTION_URL automatically, so this
 * resolves correctly on a fresh deploy with no manual configuration.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
