-- ============================================================================
-- 0011 — KYC review loop fixes (CRM review ↔ partner app resubmission).
--
-- 1. A rejected partner who fixes their documents and taps "Submit for review"
--    must come back to ops as *pending* — previously submit_vendor_for_review()
--    left status = 'rejected', so resubmissions were invisible on the board.
-- 2. A partner must be able to replace a document ops sent back. The delete
--    policy only allowed 'pending' rows; with UNIQUE (vendor_id, doc_type) that
--    made a rejected document impossible to re-upload.
-- ============================================================================

create or replace function public.submit_vendor_for_review()
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid := current_vendor_id();
  v_missing int;
begin
  if v_id is null then
    raise exception 'No vendor profile for this account';
  end if;

  -- Every required document must be present and not currently sent back.
  select count(*) into v_missing
  from (select unnest(array['aadhaar','pan','address_proof','bank_proof']) as t) req
  left join vendor_documents d
    on d.vendor_id = v_id and d.doc_type = req.t and d.status <> 'rejected'
  where d.id is null;
  if v_missing > 0 then
    raise exception 'Please upload all required documents before submitting';
  end if;

  update vendors
  set onboarding_step = 'review',
      submitted_at = now(),
      status = 'pending',            -- a resubmission re-enters the queue
      rejection_reason = null
  where id = v_id and status in ('pending', 'rejected');
end;
$$;

drop policy if exists "vendor deletes own pending docs" on public.vendor_documents;
create policy "vendor deletes own pending docs" on public.vendor_documents
  for delete using (
    vendor_id = public.current_vendor_id()
    and status in ('pending', 'rejected')
  );
