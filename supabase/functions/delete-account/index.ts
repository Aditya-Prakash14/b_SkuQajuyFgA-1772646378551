// delete-account — the customer app's "Delete account".
//
// Called with the customer's own JWT (verify_jwt: true). Anonymises the
// customer through delete_my_account() as that user, then removes the auth
// user with the service role — the one step a client can never do itself.
// The app signs out locally as soon as this returns.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Sign in first' }, 401)

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: who, error: whoErr } = await asUser.auth.getUser()
  if (whoErr || !who.user) return json({ error: 'Sign in first' }, 401)

  const { error: rpcErr } = await asUser.rpc('delete_my_account')
  if (rpcErr) return json({ error: rpcErr.message }, 400)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error: delErr } = await admin.auth.admin.deleteUser(who.user.id)
  if (delErr) return json({ error: delErr.message }, 500)

  return json({ deleted: true })
})
