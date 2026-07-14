export interface BlogPost {
  slug: string
  title: string
  date: string
  category: string
  img: string
  excerpt: string
  body: string[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'signs-your-marble-floor-needs-polishing',
    title: 'Marble Polishing: Signs Your Marble Floor Needs Polishing',
    date: '02 Mar 2026',
    category: 'Marble Polishing',
    img: '/marble%20polishing%20PC.jpg',
    excerpt: 'Dull patches, water rings and fine scratches are early warnings that your marble needs professional attention.',
    body: [
      'Marble is a soft, porous stone. Over time, foot traffic, spilled liquids and everyday grit wear down its polished surface, leaving it dull and uneven. The good news is that marble can almost always be restored — the earlier you act, the cheaper and faster the job.',
      'Look for four warning signs: a loss of reflection (your floor no longer mirrors light), water rings or etch marks around plant pots and dining areas, fine scratch webbing visible at an angle, and yellowing along grout lines.',
      'Professional polishing is a multi-stage diamond grinding process that removes a microscopic layer of stone to reveal a fresh surface, followed by crystallisation to lock in the shine and a sealant to resist future staining.',
      'For a well-maintained home, marble should be polished once every two to three years. High-traffic commercial lobbies may need it annually.',
    ],
  },
  {
    slug: 'premium-home-deep-cleaning-guide',
    title: 'Premium Home Deep Cleaning: What It Actually Includes',
    date: '06 Jul 2026',
    category: 'Deep Cleaning',
    img: '/Office%20cleaning%20PC.jpg',
    excerpt: 'A deep clean is not a bigger version of your weekly mop. Here is exactly what a professional team covers.',
    body: [
      'A deep clean is a room-by-room reset of your home. Unlike routine housekeeping, it targets the surfaces you never get to: the tops of wardrobes, behind appliances, inside cabinets, switchboards, AC vents and ceiling fans.',
      'Our BHK packages are sized to your home. A 1 BHK typically takes two professionals four to five hours; a 3 BHK needs a crew of three to four and most of a working day.',
      'Kitchens receive an industrial degreaser treatment across the platform, backsplash and cabinet fronts. Bathrooms are descaled with acid-based cleaners to remove hard-water and uric stains, then fully sanitised.',
      'Every deep clean ends with a walkthrough. If anything was missed, we return within 48 hours at no cost.',
    ],
  },
  {
    slug: 'sofa-cleaning-and-shampooing',
    title: 'Sofa Cleaning and Shampooing: Restoring Fabric Without Damage',
    date: '10 Jul 2026',
    category: 'Sofa Cleaning',
    img: '/Sofa%20Shampooing%20PC.jpg',
    excerpt: 'Hot-water extraction lifts years of embedded dust, oils and odours — safely, on almost any fabric.',
    body: [
      'Upholstery absorbs body oils, food particles, pet dander and dust. Vacuuming removes only the surface layer; the rest settles deep into the foam.',
      'Professional shampooing uses an enzyme pre-treatment to break down organic soil, followed by hot-water extraction that injects and immediately vacuums out the solution, carrying the dirt with it.',
      'Fabric type matters. Microfibre, cotton blends and velvet each tolerate different water temperatures and agitation. Our technicians test an inconspicuous patch before starting.',
      'Expect two to four hours of drying time with good ventilation. The sofa is usable the same day.',
    ],
  },
  {
    slug: 'why-busy-families-need-professional-cleaning',
    title: 'Why Every Busy Family Needs a Professional House Cleaning Service',
    date: '05 Nov 2026',
    category: 'House Cleaning',
    img: '/Switch%20board%20cleaning%20PC.jpg',
    excerpt: 'Outsourcing the deep work buys back your weekends — and protects your family from allergens you cannot see.',
    body: [
      'The average household spends six to eight hours a week on cleaning, and it still does not touch the deep-soil areas that matter most for health.',
      'Dust mites, mould spores and pet dander accumulate in mattresses, curtains, carpets and AC filters. These are the primary triggers for indoor allergies and asthma in Indian homes.',
      'A quarterly professional deep clean, paired with your routine housekeeping, keeps allergen loads low without turning your weekend into a chore list.',
      'Look for a provider that background-verifies staff, uses eco-friendly agents that are safe around children and pets, and offers a re-service guarantee.',
    ],
  },
  {
    slug: 'affordable-carpet-and-upholstery-cleaning',
    title: 'Affordable Carpet & Upholstery Cleaning for Stress-Free Weekends',
    date: '18 Nov 2026',
    category: 'Cleaning Tips',
    img: '/Carpet%20cleaning%20PC.jpg',
    excerpt: 'Carpets trap more soil per square foot than any other surface in your home. Here is how to keep them fresh.',
    body: [
      'Carpet fibres act as a filter, trapping dust and allergens that would otherwise circulate in the air. That is useful — until the filter is full.',
      'Vacuum high-traffic areas twice a week, blot spills immediately (never rub), and rotate furniture periodically to even out wear patterns.',
      'Professional hot-water extraction should be done every six to twelve months. It is performed in-situ, so there is no need to roll up and transport the carpet.',
      'A correctly extracted carpet dries in three to five hours and will not shrink — shrinkage is caused by over-wetting, which proper equipment avoids.',
    ],
  },
  {
    slug: 'how-pest-control-protects-your-home',
    title: 'How Professional Pest Control Services Help Protect Your Home',
    date: '19 Nov 2026',
    category: 'Pest Control',
    img: '/Living%20area%20Pest%20PC.jpg',
    excerpt: 'Cockroaches, termites and bed bugs each need a different treatment. Retail sprays rarely address the source.',
    body: [
      'Over-the-counter sprays kill what you can see. They do not reach the harbourage points — cracks, cavities, drains and wall voids — where colonies actually live and breed.',
      'General pest control uses gel baits that insects carry back to the nest, combined with a residual spray in crevices. Results are visible within 48 to 72 hours.',
      'Termites require a chemical barrier injected into the soil and floor-wall junctions. Bed bugs need a dual heat-and-chemical treatment with a mandatory follow-up at 14 days to catch newly hatched eggs.',
      'All treatments use WHO-approved chemicals and are safe for children and pets once the area has been ventilated for the recommended period.',
    ],
  },
]

export function getPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
