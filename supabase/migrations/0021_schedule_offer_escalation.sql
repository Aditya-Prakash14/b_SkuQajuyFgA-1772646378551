-- ============================================================================
-- 0021 — Run the offer escalator on a timer.
--
-- An offer wave expires after two minutes. Without something to retire the dead
-- wave and broadcast the next one, an unanswered Prime Now request would sit
-- there until a human noticed — which is exactly the failure "within the hour"
-- cannot afford.
--
-- escalate_offers() is idempotent and cheap: it only touches jobs that are
-- still unassigned and whose current wave has expired.
-- ============================================================================

create extension if not exists pg_cron;

select cron.unschedule('escalate-job-offers')
where exists (select 1 from cron.job where jobname = 'escalate-job-offers');

select cron.schedule('escalate-job-offers', '* * * * *', $$select public.escalate_offers();$$);
