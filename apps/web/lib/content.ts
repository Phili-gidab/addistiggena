/**
 * Brand + business facts - single source of truth, taken verbatim from the
 * official Addis Tiggena company documents (Aug 2026 hand-off).
 */

export const SLOGAN = 'CONNECT • FIX • CARE';
export const SLOGAN_SENTENCE = 'Connect. Fix. Care.';

export const COMPANY = {
  operator: 'Amnen Marketing and Promotion PLC',
  project: 'Addis Tiggena (አዲስ ጥገና)',
  address: 'Bole Sub-city, Woreda 04, House No. 453ቁ02/05ለ, Addis Ababa',
  phone: '+251914755014',
  phoneDisplay: '+251 91 475 5014',
  licenseNo: 'BL/AA/14/673/1055404/2012',
  /** Social media links - TBA per company docs */
  socials: [] as { label: string; href: string }[],
};

export const HOURS = {
  open: '6:00 AM',
  close: '8:00 PM',
  perDay: 14,
  display: '6:00 AM – 8:00 PM · every day',
  displayAm: 'ከጠዋቱ 12:00 እስከ ምሽቱ 2:00 (የኢት. ሰዓት)',
};

/** Average technician arrival window (FAQ doc). */
export const ARRIVAL = '15–30 min';
/** Labor guarantee (FAQ + Terms docs). */
export const GUARANTEE_DAYS = 5;
/** Diagnostic / on-site inspection fee when the client chooses not to proceed. */
export const DIAGNOSTIC_FEE = { min: 250, max: 350 };

export const PAYMENT_METHODS = ['Cash', 'Telebirr', 'CBE Birr', 'Mobile banking transfer'];

/** Payments are made directly to the technician - the platform sets standard
 *  price ranges but does not hold customer funds (FAQ + Privacy docs). */
export const PAYMENT_NOTE_EN =
  'You pay the technician directly - cash, Telebirr, CBE Birr or mobile banking. Prices follow the standard ranges published on the platform.';

export const TESTIMONIALS = [
  {
    title: 'Finally, no more wasted weekends searching for repairmen.',
    text: "Between long working hours and family life, I simply don't have time to walk around searching for an electrician or plumber whenever something breaks down. Knowing I can request a vetted, CoC-certified technician directly from my smartphone - just like ordering Ride, Feres or Yango - is a complete game-changer. It brings order, speed, and safety to home maintenance.",
    name: 'Tewodros M.',
    role: 'Busy professional',
  },
  {
    title: 'Trust and safety were always my biggest concerns - until now.',
    text: "Managing a small cafe and residential rental units means constant repair work - from circuit breakers to kitchen equipment. My main issue was never just finding a technician; it was finding someone trustworthy who would not overcharge or do sloppy work. Knowing that every technician on Addis Tiggena is skill-verified gives me 100% confidence. It's a dependable standard for our community.",
    name: 'Getachew B.',
    role: 'Property & small business owner',
  },
  {
    title: 'A lifesaver for my live streams and content!',
    text: 'My lighting setup kept flickering out and my Wi-Fi router and PC cut off right in the middle of a live transmission because of a faulty socket circuit. I lost thousands of live viewers in an instant. Knowing I can tap my phone and get a verified, background-checked technician to fix my electrical and setup issues before my next stream is incredible.',
    name: 'Local TikTok streamer',
    role: 'Content creator (name withheld)',
  },
];

/** The Mitad origin story - from the official company profile. */
export const STORY = {
  title: 'It all started with a broken Mitad.',
  titleAm: 'ሁሉም የተጀመረው በተሰበረ ምጣድ ነው።',
  paragraphs: [
    'It all started on an ordinary afternoon with a very familiar household staple: the Mitad (ምጣድ) - the traditional Injera baking plate. It broke down mid-bake, and what should have been a quick fix turned into a days-long headache. No reliable technician could be found, and the family ended up buying a brand-new one.',
    "A simple thought struck: why should finding a trustworthy technician be so difficult? If we need transportation, we open an app and a vehicle arrives in minutes. Why couldn't home and business maintenance work with the very same convenience?",
    'That moment of frustration became a vision. Backed by the corporate and promotional strength of Amnen Marketing & Promotion, Addis Tiggena has grown into a reliable, technology-driven platform connecting skilled field technicians directly with clients across Addis Ababa - with a target of onboarding up to 30,000 professionals across every maintenance discipline.',
  ],
};
