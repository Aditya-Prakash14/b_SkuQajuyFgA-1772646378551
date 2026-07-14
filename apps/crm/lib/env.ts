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
