/**
 * Bilingual copy for the marketing site.
 *
 * The site used to print English and Amharic together in every heading. The
 * client asked for a real switch so they can read - and comment on - a proper
 * Amharic version, so each string now has an `en` and an `am` form and the
 * chosen language rides in a cookie (server-rendered, no flash of the wrong
 * language).
 *
 * The Amharic below is a working draft: the client offered to correct it, and
 * anything they send back only needs editing here.
 */

export type Lang = 'en' | 'am';

export const LANG_COOKIE = 'tg_lang';

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'am';

/** One string in both languages. */
type S = { en: string; am: string };

const pick = (s: S, lang: Lang) => s[lang];

// ── the copy ─────────────────────────────────────────────────────────────────

const COPY = {
  nav: {
    services: { en: 'Services', am: 'አገልግሎቶች' },
    pricing: { en: 'Pricing', am: 'ዋጋዎች' },
    faq: { en: 'FAQ', am: 'ጥያቄዎች' },
    bookings: { en: 'My bookings', am: 'ማስያዣዎቼ' },
    provider: { en: 'For technicians', am: 'ለባለሙያዎች' },
    admin: { en: 'Admin', am: 'አስተዳደር' },
    signIn: { en: 'Sign in', am: 'ይግቡ' },
    signOut: { en: 'Sign out', am: 'ውጣ' },
    book: { en: 'Book now', am: 'አሁን ይዘዙ' },
    city: { en: 'Addis Ababa', am: 'አዲስ አበባ' },
  },

  hero: {
    line1: { en: 'A verified technician,', am: 'ማንነቱ የተረጋገጠ የጥገና ባለሙያ' },
    line2: { en: 'at your door in minutes.', am: 'በደቂቃ ውስጥ በርዎ ላይ' },
    lede: {
      en: 'Mitad, wiring, plumbing, appliances, Wi-Fi - pick a service, pin your location, and the nearest Woreda-cleared, CoC-certified technician is dispatched to you. As easy as ordering a ride.',
      am: 'ምጣድ፣ ሽቦ፣ ቧንቧ፣ የቤት እቃዎች፣ ዋይ-ፋይ - አገልግሎት ይምረጡ፣ ቦታዎን ይግለፁ፣ በአቅራቢያዎ ያለው በወረዳ የተረጋገጠና በCoC የተመሰከረለት ባለሙያ ወደ እርስዎ ይላካል። እንደ መኪና ማዘዝ ቀላል ነው።',
    },
    searchBtn: { en: 'Find a technician', am: 'ባለሙያ ያግኙ' },
    searchLabel: { en: 'Search services', am: 'አገልግሎቶችን ይፈልጉ' },
    statArrival: { en: 'Avg. arrival', am: 'አማካይ የመድረሻ ጊዜ' },
    statGuarantee: { en: 'Guarantee', am: 'ዋስትና' },
    statHours: { en: 'Open daily · 6am-8pm', am: 'በየቀኑ ክፍት · ከ12:00 እስከ 2:00' },
    statSubCities: { en: 'Sub-cities covered', am: 'የተሸፈኑ ክፍለ ከተሞች' },
    verified: { en: 'Verified', am: 'የተረጋገጠ' },
    verifiedSub: { en: 'Woreda ✓ · CoC ✓ · Fayda ID ✓', am: 'ወረዳ ✓ · CoC ✓ · ፋይዳ መታወቂያ ✓' },
    cta: { en: 'Book a service', am: 'አገልግሎት ይዘዙ' },
  },

  services: {
    kicker: { en: 'Services', am: 'አገልግሎቶች' },
    title: { en: 'All categories', am: 'ሁሉም ዘርፎች' },
    sub: { en: 'What can we fix for you?', am: 'ምን እንጠግንልዎ?' },
    seeAll: { en: 'See full price list', am: 'ሙሉ የዋጋ ዝርዝር ይመልከቱ' },
    from: { en: 'from ETB', am: 'ከ ብር' },
    offline: {
      en: 'The service list is unavailable right now - please try again shortly.',
      am: 'የአገልግሎት ዝርዝሩ በአሁኑ ጊዜ አይገኝም - እባክዎ ትንሽ ቆይተው ይሞክሩ።',
    },
  },

  popular: {
    kicker: { en: 'Popular right now', am: 'በአሁኑ ጊዜ ተፈላጊ' },
    title: { en: 'Transparent standard rates', am: 'ግልፅ የዋጋ ተመን' },
    seeAll: { en: 'Full price list', am: 'ሙሉ የዋጋ ዝርዝር' },
    book: { en: 'Book this service', am: 'ይህን አገልግሎት ይዘዙ' },
    note: {
      en: "Rates are base inspection + labor ranges set by the platform - you pay the technician directly, and spare parts are best purchased by you with the technician's specifications.",
      am: 'ዋጋዎቹ በመድረኩ የተቀመጡ የምርመራና የጉልበት ዋጋ ተመኖች ናቸው - ክፍያው በቀጥታ ለባለሙያው ነው፣ መለዋወጫዎችን በባለሙያው ምክር እርስዎ ቢገዙ ይመረጣል።',
    },
  },

  steps: {
    kicker: { en: 'How it works', am: 'እንዴት ይሰራል' },
    title: { en: 'Four steps, one visit', am: 'አራት ቀላል ደረጃዎችን ይከውኑ' },
    s1t: { en: 'Choose a service', am: 'አገልግሎት ይምረጡ' },
    s1: {
      en: 'Pick the repair you need - Mitad, wiring, plumbing, appliances, Wi-Fi and more - then briefly describe the problem.',
      am: 'የሚፈልጉትን ጥገና ይምረጡ - ምጣድ፣ ሽቦ፣ ቧንቧ፣ የቤት እቃ፣ ዋይ-ፋይ እና ሌሎችም - ከዚያ ችግሩን በአጭሩ ይግለጹ።',
    },
    s2t: { en: 'Pin your location', am: 'ቦታዎን ይግለፁ' },
    s2: {
      en: 'Drop a pin, pick your sub-city and add a landmark note - the flow is built for real Addis Ababa addresses.',
      am: 'ቦታዎን ምልክት ያድርጉ፣ ክፍለ ከተማዎን ይምረጡ እና የሚታወቅ ምልክት ይጨምሩ - ለአዲስ አበባ አድራሻዎች ተብሎ የተሰራ ነው።',
    },
    s3t: { en: 'Technician dispatched', am: 'ባለሙያ ይላካል' },
    s3: {
      en: 'The nearest verified technician in your surroundings accepts the job and heads over - arriving in 15-30 minutes on average.',
      am: 'በአካባቢዎ የሚገኘው በአቅራቢያዎ ያለ የተረጋገጠ ባለሙያ ስራውን ተቀብሎ ይነሳል - በአማካይ በ15-30 ደቂቃ ይደርሳል።',
    },
    s4t: { en: 'Pay the technician directly', am: 'ለባለሙያው በቀጥታ ይክፈሉ' },
    s4: {
      en: 'Cash, Telebirr, CBE Birr or mobile banking - at the standard platform rate. Every repair carries a 5-day guarantee.',
      am: 'በጥሬ ገንዘብ፣ በቴሌብር፣ በCBE ብር ወይም በሞባይል ባንኪንግ - በመደበኛው የመድረክ ተመን። እያንዳንዱ ጥገና የ5 ቀናት ዋስትና አለው።',
    },
  },

  trust: {
    kicker: { en: 'Trust & safety', am: 'እምነት እና ደህንነት' },
    title: {
      en: 'Trust arrives before the technician does',
      am: 'ባለሙያው ከመድረሱ በፊት እምነት ይደርሳል',
    },
    lede: {
      en: 'Skill and trust over certification - no degree required, but every professional passes a 5-step vetting pipeline before their profile goes live.',
      am: 'ችሎታና ታማኝነት ከሰርተፍኬት ይቀድማሉ - ዲግሪ አያስፈልግም፣ ነገር ግን እያንዳንዱ ባለሙያ መገለጫው ከመታየቱ በፊት የ5 ደረጃ ማጣሪያ ያልፋል።',
    },
    c1t: { en: 'Woreda recommendation', am: 'የወረዳ የድጋፍ ደብዳቤ' },
    c1: {
      en: 'Every technician presents an official clearance letter from their residential Woreda administration.',
      am: 'እያንዳንዱ ባለሙያ ከሚኖርበት ወረዳ አስተዳደር ይፋዊ የሥነ ምግባር ማረጋገጫ ደብዳቤ ያቀርባል።',
    },
    c2t: { en: 'Government CoC certified', am: 'በመንግስት CoC የተመሰከረለት' },
    c2: {
      en: 'Practical skill validated at government Certificate of Competency assessment centers - per service line.',
      am: 'የተግባር ብቃት በመንግስት የሙያ ብቃት ማረጋገጫ (CoC) ማዕከላት በየአገልግሎት ዘርፉ ይረጋገጣል።',
    },
    c3t: { en: 'Fayda ID verified', am: 'በፋይዳ መታወቂያ የተረጋገጠ' },
    c3: {
      en: 'National Digital ID (Fayda) or Resident ID checked, plus police clearance and a local guarantor on file.',
      am: 'የፋይዳ ዲጂታል መታወቂያ ወይም የነዋሪነት መታወቂያ ተረጋግጦ፣ የፖሊስ ማረጋገጫና የአካባቢ ዋስ ተመዝግቧል።',
    },
    c4t: { en: 'The Tiggena Guarantee - 5 days', am: 'የጥገና ዋስትና - 5 ቀናት' },
    c4: {
      en: 'If the exact issue reoccurs within 5 days of completion, it is re-inspected and fixed at no additional service cost. If the technician is unresponsive, call us and it will be handled.',
      am: 'ችግሩ ስራው ከተጠናቀቀ በ5 ቀናት ውስጥ እንደገና ከተከሰተ ያለ ተጨማሪ የአገልግሎት ክፍያ በድጋሚ ታይቶ ይስተካከላል። ባለሙያው ምላሽ ካልሰጠ ይደውሉልን፣ እኛ እንፈታዋለን።',
    },
  },

  story: {
    kicker: { en: 'Our story', am: 'ታሪካችን' },
    plate: {
      en: 'From one broken Injera baking plate to a citywide network of verified technicians - backed by Amnen Marketing & Promotion.',
      am: 'ከአንድ የተሰበረ ምጣድ ተነስቶ በከተማ አቀፍ ደረጃ የተረጋገጡ ባለሙያዎች መረብ ሆኗል - በአምነን ማርኬቲንግ እና ፕሮሞሽን የተደገፈ።',
    },
    lead: { en: 'It all started with a broken Mitad.', am: 'ሁሉም የተጀመረው በተሰበረ ምጣድ ነው' },
    p1: {
      en: 'It all started on an ordinary afternoon with a very familiar household staple: the Mitad (ምጣድ) - the traditional Injera baking plate. It broke down mid-bake, and what should have been a quick fix turned into a days-long headache. No reliable technician could be found, and the family ended up buying injera from local shops for almost a week before finally giving up and purchasing a brand-new one.',
      am: 'ሁሉም የተጀመረው በተለመደ ከሰዓት በኋላ በአንድ በጣም በሚታወቅ የቤት እቃ ነው፦ ምጣድ። እንጀራ በመጋገር ላይ እያለ ተበላሸ፣ በፍጥነት መስተካከል የነበረበት ጉዳይም የቀናት ራስ ምታት ሆነ። አስተማማኝ ባለሙያ ማግኘት ስላልተቻለ ቤተሰቡ ለሳምንት ያህል ከአካባቢው ሱቆች እንጀራ ሲገዛ ቆይቶ በመጨረሻ አዲስ ምጣድ ለመግዛት ተገደደ።',
    },
    p2: {
      en: 'A simple thought struck: why should finding a trustworthy technician be so difficult? If we need transportation, we open an app and a vehicle arrives in minutes. Why couldn’t home and business maintenance work with the very same convenience?',
      am: 'ቀላል ሀሳብ መጣ፦ ታማኝ ባለሙያ ማግኘት ለምን ይህን ያህል ከባድ ይሆናል? መጓጓዣ ስንፈልግ አፕሊኬሽን ከፍተን በደቂቃዎች ውስጥ መኪና ይደርሳል። የቤትና የንግድ ጥገናስ ለምን በዚያው ቅለት አይሰራም?',
    },
    p3: {
      en: 'That moment of frustration became a vision. Backed by the corporate and promotional strength of Amnen Marketing & Promotion, Addis Tiggena has grown into a reliable, technology-driven platform connecting skilled field technicians directly with clients across Addis Ababa - with a target of onboarding up to 30,000 professionals across every maintenance discipline.',
      am: 'ያ የብስጭት ቅጽበት ወደ ራዕይ ተለወጠ። በአምነን ማርኬቲንግ እና ፕሮሞሽን ጥንካሬ ተደግፎ፣ አዲስ ጥገና ብቁ ባለሙያዎችን በአዲስ አበባ ካሉ ደንበኞች ጋር በቀጥታ የሚያገናኝ አስተማማኝና በቴክኖሎጂ የሚመራ መድረክ ሆኗል - በሁሉም የጥገና ዘርፎች እስከ 30,000 ባለሙያዎችን የማካተት ግብ አለው።',
    },
  },

  testimonials: {
    kicker: { en: 'Customers feedback', am: 'የደንበኞች አስተያየት' },
    title: { en: 'What do our customers say?', am: 'ደንበኞቻችን ምን ይላሉ?' },
  },

  coverage: {
    kicker: { en: 'Coverage', am: 'የአገልግሎት ሽፋን' },
    title: { en: 'All 11 sub-cities of Addis Ababa', am: 'በሁሉም 11 ክፍለ ከተሞች እንገኛለን' },
    note: {
      en: 'Technicians are matched from your own surroundings - tap a sub-city to see the neighbourhoods we map for dispatch.',
      am: 'ባለሙያዎች ከአካባቢዎ ይመደባሉ - ለስምሪት የምንጠቀምባቸውን ሰፈሮች ለማየት ክፍለ ከተማውን ይንኩ።',
    },
  },

  pro: {
    kicker: { en: 'For Professionals & Technicians', am: 'ለባለሙያዎች እና ቴክኒሽያኖች' },
    title: { en: 'Skill and trust over certification.', am: 'ችሎታዎና ታማኝነትዎ ብቻ በቂ ነው' },
    lede: {
      en: 'No BA, MA or TVET diploma required - whether you learned your craft in school or through years of hands-on work, proven skill, verified character, and a smartphone are all you need to join. Clients pay you directly; the platform brings you the jobs.',
      am: 'የመጀመሪያ ዲግሪ፣ ማስተርስ ወይም የቴክኒክ ዲፕሎማ አያስፈልግም - ሙያዎን በትምህርት ቤት ወይም በዓመታት ልምድ ቢማሩ፣ የተረጋገጠ ችሎታ፣ መልካም ስነ ምግባርና ስማርት ስልክ ብቻ በቂ ናቸው። ደንበኞች በቀጥታ ይከፍሉዎታል፤ መድረኩ ስራ ያመጣልዎታል።',
    },
    cta: { en: 'Register as a technician', am: 'እንደ ባለሙያ ይመዝገቡ' },
    cta2: { en: 'How vetting works', am: 'ማጣሪያው እንዴት ነው' },
    v1t: { en: 'Registration & documents', am: 'ምዝገባና ሰነዶች' },
    v1: { en: 'Fayda / Resident ID + Woreda recommendation letter', am: 'ፋይዳ / የነዋሪነት መታወቂያ እና የወረዳ ደብዳቤ' },
    v2t: { en: 'Skill verification', am: 'የክህሎት ማረጋገጫ' },
    v2: { en: 'Practical CoC assessment at a government center', am: 'በመንግስት ማዕከል የተግባር CoC ምዘና' },
    v3t: { en: 'Security clearance', am: 'የደህንነት ማረጋገጫ' },
    v3: { en: 'Police clearance + local guarantor reference', am: 'የፖሊስ ማረጋገጫና የአካባቢ ዋስ' },
    v4t: { en: 'Digital readiness', am: 'ዲጂታል ዝግጁነት' },
    v4: { en: 'Smartphone with GPS + a working toolkit', am: 'ጂፒኤስ ያለው ስማርት ስልክና የስራ መሳሪያ' },
    v5t: { en: 'Orientation & activation', am: 'ስልጠናና ማስጀመር' },
    v5: { en: 'Ethics training, app tutorial - then you go live', am: 'የስነ ምግባር ስልጠና፣ የአፕ ትምህርት - ከዚያ ስራ ይጀምራሉ' },
    vetting: { en: 'Vetting pipeline', am: 'የማጣሪያ ሂደት' },
  },

  band: {
    word: { en: 'እንጠግናለን', am: 'እንጠግናለን' },
    caption: { en: 'We fix. - every trade, one platform', am: 'እንጠግናለን - ሁሉም ሙያ በአንድ መድረክ' },
  },

  footer: {
    tagline: {
      en: 'Verified maintenance technicians across Addis Ababa. Connect. Fix. Care.',
      am: 'በአዲስ አበባ ሁሉ የተረጋገጡ የጥገና ባለሙያዎች። ያገናኙ። ይጠግኑ። ይንከባከቡ።',
    },
    company: { en: 'Company', am: 'ስለ እኛ' },
    legal: { en: 'Legal', am: 'ሕጋዊ' },
    contact: { en: 'Contact', am: 'አግኙን' },
    hours: { en: 'Open 6:00 AM - 8:00 PM, every day', am: 'በየቀኑ ከጠዋቱ 12:00 እስከ ምሽቱ 2:00 ክፍት ነው' },
    rights: { en: 'All rights reserved.', am: 'መብቱ በህግ የተጠበቀ ነው።' },
  },
} as const;

// ── resolver ─────────────────────────────────────────────────────────────────

type Copy = typeof COPY;
/** The dictionary flattened into one language: `t.hero.line1` is a string. */
export type Dict = { [S in keyof Copy]: { [K in keyof Copy[S]]: string } };

/** Resolve every string to one language - call once per render, server-side. */
export function dict(lang: Lang): Dict {
  const out = {} as Record<string, Record<string, string>>;
  for (const [section, strings] of Object.entries(COPY)) {
    out[section] = Object.fromEntries(
      Object.entries(strings as Record<string, S>).map(([k, v]) => [k, pick(v, lang)]),
    );
  }
  return out as Dict;
}

/** The hero's live-dispatch ticker. */
export interface FeedJob {
  ic: string;
  b: string;
  small: string;
  ok: string;
  live?: boolean;
}

export const JOB_FEED: Record<Lang, FeedJob[]> = {
  en: [
    { ic: '⚡', b: 'Electric Mitad repair', small: 'Bole Medhanialem · today 10:24', ok: '✓ Fixed · 650 ETB' },
    { ic: '🚰', b: 'Pipe leakage repair', small: 'Jemo 1 condominium · en route', ok: '18 min', live: true },
    { ic: '🔌', b: 'Socket & breaker fix', small: 'Piassa · today 11:02', ok: '✓ Fixed · 400 ETB' },
    { ic: '📶', b: 'Wi-Fi router setup', small: 'CMC Michael · en route', ok: '9 min', live: true },
    { ic: '🧊', b: 'Fridge not cooling', small: 'Gerji Mebrat Hail · on site', ok: 'diagnosing', live: true },
    { ic: '🚪', b: 'Door lock replacement', small: 'Lideta condominium · today 09:40', ok: '✓ Fixed · 500 ETB' },
    { ic: '🖥️', b: 'Office printer repair', small: 'Kazanchis · en route', ok: '12 min', live: true },
  ],
  am: [
    { ic: '⚡', b: 'የኤሌክትሪክ ምጣድ ጥገና', small: 'ቦሌ መድሃኒዓለም · ዛሬ 10:24', ok: '✓ ተጠግኗል · 650 ብር' },
    { ic: '🚰', b: 'የቧንቧ ፍሳሽ ጥገና', small: 'ጀሞ 1 ኮንዶሚኒየም · በመንገድ ላይ', ok: '18 ደቂቃ', live: true },
    { ic: '🔌', b: 'የሶኬትና ብሬከር ጥገና', small: 'ፒያሳ · ዛሬ 11:02', ok: '✓ ተጠግኗል · 400 ብር' },
    { ic: '📶', b: 'የዋይ-ፋይ ራውተር ተከላ', small: 'ሲኤምሲ ሚካኤል · በመንገድ ላይ', ok: '9 ደቂቃ', live: true },
    { ic: '🧊', b: 'ፍሪጅ አያቀዘቅዝም', small: 'ገርጂ መብራት ሃይል · ስራ ላይ', ok: 'በምርመራ ላይ', live: true },
    { ic: '🚪', b: 'የበር ቁልፍ መቀየር', small: 'ልደታ ኮንዶሚኒየም · ዛሬ 09:40', ok: '✓ ተጠግኗል · 500 ብር' },
    { ic: '🖥️', b: 'የቢሮ ፕሪንተር ጥገና', small: 'ካዛንቺስ · በመንገድ ላይ', ok: '12 ደቂቃ', live: true },
  ],
};

/** Customer voices - from the official testimonies document. */
export const QUOTES: Record<Lang, { title: string; text: string; name: string; role: string }[]> = {
  en: [
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
  ],
  am: [
    {
      title: 'ከእንግዲህ ባለሙያ ፍለጋ የሚባክን ቅዳሜና እሁድ የለም።',
      text: 'በረጅም የስራ ሰዓትና በቤተሰብ ህይወት መካከል፣ አንድ ነገር በተበላሸ ቁጥር ኤሌክትሪሺያን ወይም ቧንቧ ሰራተኛ ለመፈለግ መዞር አልችልም። የተጣራና በCoC የተመሰከረለት ባለሙያ በቀጥታ ከስልኬ መጠየቅ መቻሌ - እንደ ራይድ፣ ፈረስ ወይም ያንጎ ማዘዝ - ሙሉ ለውጥ ነው። ለቤት ጥገና ስርዓት፣ ፍጥነትና ደህንነት ያመጣል።',
      name: 'ቴዎድሮስ መ.',
      role: 'ስራ የሚበዛበት ባለሙያ',
    },
    {
      title: 'እምነትና ደህንነት ትልቁ ስጋቴ ነበሩ - እስከ አሁን።',
      text: 'ትንሽ ካፌና የኪራይ ቤቶችን ማስተዳደር ማለት ከኤሌክትሪክ ብሬከር እስከ ወጥ ቤት እቃዎች ድረስ ቀጣይ ጥገና ማለት ነው። ዋናው ችግሬ ባለሙያ ማግኘት ብቻ አልነበረም፤ ከመጠን በላይ የማያስከፍልና ስራውን በአግባቡ የሚሰራ ታማኝ ሰው ማግኘት ነበር። በአዲስ ጥገና ላይ ያለ እያንዳንዱ ባለሙያ ብቃቱ የተረጋገጠ መሆኑ 100% እምነት ይሰጠኛል። ለማህበረሰባችን አስተማማኝ መስፈርት ነው።',
      name: 'ጌታቸው በ.',
      role: 'የንብረትና የአነስተኛ ንግድ ባለቤት',
    },
    {
      title: 'ለቀጥታ ስርጭቶቼና ለይዘቴ ትልቅ እፎይታ ነው!',
      text: 'የመብራት ዝግጅቴ ይቋረጥ ነበር፤ በተበላሸ የሶኬት ዑደት ምክንያት ዋይ-ፋይ ራውተሬና ኮምፒውተሬ በቀጥታ ስርጭት መሃል ጠፉ። በቅጽበት ሺዎችን ተመልካቾች አጣሁ። በሚቀጥለው ስርጭቴ በፊት የተረጋገጠና ማንነቱ የተጣራ ባለሙያ በስልኬ ጠቅ አድርጌ ማግኘት መቻሌ አስደናቂ ነው።',
      name: 'የአገር ውስጥ ቲክቶክ ስትሪመር',
      role: 'የይዘት ፈጣሪ (ስም አልተገለጸም)',
    },
  ],
};

/** Search-box placeholders rotate, so they live outside the flat dictionary. */
export const SEARCH_PLACEHOLDERS: Record<Lang, string[]> = {
  en: [
    'What needs fixing? e.g. Mitad, socket, tap…',
    'Electric Mitad repair…',
    'Leaking pipe in the kitchen…',
    'Wi-Fi router keeps dropping…',
    'Door lock replacement…',
    'Electrician in Bole…',
  ],
  am: [
    'ምን ይጠገን? ለምሳሌ ምጣድ፣ ሶኬት፣ ቧንቧ…',
    'የኤሌክትሪክ ምጣድ ጥገና…',
    'በወጥ ቤት የሚያፈስ ቧንቧ…',
    'ዋይ-ፋይ ራውተር ይቋረጣል…',
    'የበር ቁልፍ መቀየር…',
    'በቦሌ ኤሌክትሪሺያን…',
  ],
};
