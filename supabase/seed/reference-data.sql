-- ============================================================================
-- Prime Home Care — Reference data seed (idempotent)
-- Run AFTER 0001_schema.sql + 0002_rls.sql, and before `pnpm seed`.
-- Safe to re-run.
-- ============================================================================

-- ─── Service categories (referenced by services.category_id) ─────────────────
insert into service_categories (name, slug, icon, sort_order) values
  ('Deep Cleaning',            'deep-cleaning',            'Sparkles',   1),
  ('Corporate Services',       'corporate-services',       'Building2',  2),
  ('Pest Control',             'pest-control',             'Bug',        3),
  ('Marble & Floor Polishing', 'marble-floor-polishing',   'Gem',        4),
  ('Painting',                 'painting',                 'Paintbrush', 5),
  ('Disinfection',             'disinfection',             'Droplets',   6)
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

-- ─── Cities served ───────────────────────────────────────────────────────────
insert into cities (name) values
  ('Bangalore'), ('Mumbai'), ('Delhi'), ('Hyderabad'), ('Pune'), ('Chennai'),
  ('Kolkata'), ('Ahmedabad'), ('Jaipur'), ('Bhubaneswar'), ('Gurgaon'), ('Noida')
on conflict (name) do nothing;
