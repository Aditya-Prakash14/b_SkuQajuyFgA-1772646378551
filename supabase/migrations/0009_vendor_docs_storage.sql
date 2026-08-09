-- ============================================================================
-- Prime Home Care — Vendor document storage (0009)
--
-- Backfilled from the live database (applied there as `vendor_docs_storage`,
-- version 20260728031354). Creates the private bucket the partner app uploads
-- KYC documents into, and the object-level RLS that isolates each partner.
--
-- This closes the "Storage-backed uploads (vendor docs)" follow-up in docs/LLD.md §12.
-- ============================================================================

-- Private bucket. KYC scans (Aadhaar, PAN, bank proof) must never be reachable
-- by URL — the app reads them back through short-lived signed URLs instead.
insert into storage.buckets (id, name, public)
values ('vendor-docs', 'vendor-docs', false)
on conflict (id) do update set public = false;

-- ─── Object RLS ─────────────────────────────────────────────────────────────
-- Layout is '<vendor_id>/<doc_type>.<ext>', so the first path segment is the
-- tenant key. storage.foldername(name))[1] is that segment.

drop policy if exists "vendor rw own folder" on storage.objects;
create policy "vendor rw own folder" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'vendor-docs'
    and (storage.foldername(name))[1] = (current_vendor_id())::text
  )
  with check (
    bucket_id = 'vendor-docs'
    and (storage.foldername(name))[1] = (current_vendor_id())::text
  );

-- Admins review every partner's documents from the CRM.
drop policy if exists "admin read vendor-docs" on storage.objects;
create policy "admin read vendor-docs" on storage.objects
  for select to authenticated
  using (bucket_id = 'vendor-docs' and is_admin());
