-- ============================================================================
-- Prime Home Care — Catalog taxonomy + BHK packages (0005)
-- Applied to the live project on 2026-07-08. Idempotent.
--
-- Services were previously lumped into a single "Deep Cleaning" bucket. This
-- splits them into real, browsable categories and adds BHK-sized deep-clean
-- packages (the website filters by these categories).
--
-- Resulting taxonomy:
--   1 Home Deep Cleaning (BHK)   2 Residential Cleaning   3 Corporate & Commercial
--   4 Pest Control   5 Marble & Floor Polishing   6 Painting   7 Disinfection
-- ============================================================================

update service_categories set name='Residential Cleaning',   slug='residential-cleaning', icon='Sparkles',  sort_order=2 where slug='deep-cleaning';
update service_categories set name='Corporate & Commercial', slug='corporate-commercial', icon='Building2', sort_order=3 where slug='corporate-services';
update service_categories set sort_order=4 where slug='pest-control';
update service_categories set sort_order=5 where slug='marble-floor-polishing';
update service_categories set sort_order=6 where slug='painting';
update service_categories set sort_order=7 where slug='disinfection';

insert into service_categories (name, slug, icon, sort_order)
values ('Home Deep Cleaning', 'home-deep-cleaning-bhk', 'Home', 1)
on conflict (slug) do update
  set name = excluded.name, icon = excluded.icon, sort_order = excluded.sort_order;

-- Re-assign services
update services set category_id = (select id from service_categories where slug='corporate-commercial')
  where slug in ('office-deep-cleaning','exterior-cleaning');

update services set category_id = (select id from service_categories where slug='home-deep-cleaning-bhk')
  where slug = 'home-deep-cleaning';

-- BHK packages
insert into services (slug, name, tagline, category_id, price, price_unit, display_price_label,
                      duration, hero_img, gallery_imgs, description, what_we_clean, how_it_works,
                      whats_included, not_included, faqs, rating, reviews_count, bookings_count, is_active)
select v.slug, v.name, v.tagline,
       (select id from service_categories where slug='home-deep-cleaning-bhk'),
       v.price, 'fixed', '₹' || v.label, v.duration, '/fan%20cleaning%20PC.jpg',
       '["/Wodrobe%20cleaning%20PC.jpg","/Kitchen%20Sink%20cleaning%20PC.jpg","/bathroom%20fixures%20Cleaning%20PC.jpg"]'::jsonb,
       v.descr,
       '["All rooms - floors swept, mopped and scrubbed","Kitchen platform, sink, tiles and cabinet fronts degreased","Bathrooms scrubbed, descaled and sanitised","Fans, lights, switchboards and AC vents dusted","Windows, grills and window sills cleaned","Wardrobes and cabinets cleaned inside-out","Balcony and utility area washed","Sofa and furniture surfaces wiped"]'::jsonb,
       '[{"step":1,"title":"Book Online","desc":"Pick your home size, city and a convenient date."},{"step":2,"title":"Team Assigned","desc":"You get instant confirmation and the technician details."},{"step":3,"title":"Deep Clean","desc":"A background-verified team arrives with all equipment."},{"step":4,"title":"Walkthrough","desc":"Inspect every room and rate the service."}]'::jsonb,
       '["All equipment and eco-friendly agents","Trained, background-verified professionals","Post-clean inspection walkthrough","48-hour free re-clean warranty"]'::jsonb,
       '["Exterior facade or terrace (add-on)","Pest control (separate service)","Deep stain removal from walls"]'::jsonb,
       v.faqs, 4.8, v.reviews, v.bookings, true
from (values
  ('1-bhk-deep-cleaning', '1 BHK Home Deep Cleaning', 'Complete top-to-bottom deep clean for a 1 BHK home', 2499::numeric, '2,499', '4-5 hours',
   'A full room-by-room deep clean designed for a 1 BHK home. Our trained team uses professional equipment and hospital-grade agents to remove grime, dust and allergens from every surface - kitchen, bathroom, bedroom, hall and balcony included.',
   '[{"q":"How many professionals will come?","a":"Typically 2 professionals for a 1 BHK."},{"q":"Do I need to provide anything?","a":"No. The team brings all equipment and cleaning agents."},{"q":"Is there a warranty?","a":"Yes - a free re-clean within 48 hours if you are not satisfied."}]'::jsonb, 3200, '30K+'),
  ('2-bhk-deep-cleaning', '2 BHK Home Deep Cleaning', 'Complete top-to-bottom deep clean for a 2 BHK home', 3499::numeric, '3,499', '5-7 hours',
   'The most popular package. A thorough deep clean of every room in a 2 BHK home - two bedrooms, hall, kitchen, bathrooms, balconies and all fixtures - restoring your home to a like-new condition.',
   '[{"q":"How many professionals will come?","a":"Typically 2 to 3 professionals for a 2 BHK."},{"q":"Should I be at home?","a":"You can stay or step out. We only need access to the home."},{"q":"Is there a warranty?","a":"Yes - a free re-clean within 48 hours if you are not satisfied."}]'::jsonb, 5400, '60K+'),
  ('3-bhk-deep-cleaning', '3 BHK Home Deep Cleaning', 'Complete top-to-bottom deep clean for a 3 BHK home', 4499::numeric, '4,499', '7-9 hours',
   'A comprehensive deep clean for larger homes. Every bedroom, bathroom, the kitchen, living and dining areas, balconies, wardrobes and fixtures are cleaned by a larger dedicated team.',
   '[{"q":"How many professionals will come?","a":"Typically 3 to 4 professionals for a 3 BHK."},{"q":"How long does it take?","a":"Usually 7 to 9 hours depending on the condition of the home."},{"q":"Is there a warranty?","a":"Yes - a free re-clean within 48 hours if you are not satisfied."}]'::jsonb, 2800, '25K+'),
  ('4-bhk-deep-cleaning', '4 BHK / Villa Deep Cleaning', 'Premium deep clean for large homes, duplexes and villas', 5999::numeric, '5,999', '8-10 hours',
   'Our premium package for 4 BHK homes, duplexes and villas. A large dedicated crew deep-cleans every room, staircase, balcony and utility area, including high-reach fixtures and hard-to-access corners.',
   '[{"q":"How many professionals will come?","a":"Typically 4 to 6 professionals depending on the property."},{"q":"Do you cover duplex staircases?","a":"Yes, staircases and internal common areas are included."},{"q":"Is there a warranty?","a":"Yes - a free re-clean within 48 hours if you are not satisfied."}]'::jsonb, 1600, '12K+')
) as v(slug, name, tagline, price, label, duration, descr, faqs, reviews, bookings)
on conflict (slug) do nothing;
