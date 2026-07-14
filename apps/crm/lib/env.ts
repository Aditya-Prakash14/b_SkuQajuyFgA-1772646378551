/**
 * True when the public Supabase env vars are present. Works in both server and
 * client bundles because NEXT_PUBLIC_* is inlined at build time.
 *
 * Used to run the CRM in a local "dev preview" (shell renders, no live auth)
 * before a Supabase project is wired up.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Supabase env for the auth path, or null in local dev preview.
 *
 * SECURITY: the dev-preview escape hatch must never be reachable in a deployed
 * build. Both the route guard and the /dashboard layout skip their auth checks
 * when Supabase is unconfigured — harmless with `next dev` on localhost, but on
 * a real deployment it would leave the entire admin console readable with no
 * login. So a missing env in production is a hard failure, not a bypass: the
 * CRM fails CLOSED.
 */
export function supabaseAuthEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (url && anonKey) return { url, anonKey }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRM is deployed without Supabase environment variables.\n' +
        'Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n' +
        'Refusing to serve the admin console unauthenticated. Set them in\n' +
        'Vercel → Settings → Environment Variables, then redeploy.',
    )
  }

  return null
}
