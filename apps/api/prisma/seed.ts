import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * The company's official service and price list ("latest service and price",
 * received 2026-09-18). Transcribed line for line: category order, item order,
 * English and Amharic names, and the ETB range for each.
 *
 * `sqm: true` marks items the document prices per square metre (በካሬ) rather
 * than per job.
 *
 * This is the only place prices are written down. The seed loads it into the
 * ServicePrice table, and every screen that shows a price - the web price list,
 * the service pages, the home page, the mobile app - reads it back from the
 * API. When a new price list arrives, edit PRICE_LIST and re-run the seed.
 * (Kept inline rather than in its own module: the seed runs under Node's
 * native ES-module loader on the server, which will not resolve an
 * extensionless relative import.)
 *
 * Two corrections to the source, both obvious typos: "ኦቭን ጠገና" -> "ኦቭን ጥገና",
 * and a missing closing bracket on the electric stove line.
 */

interface PriceLine {
  en: string;
  am: string;
  min: number;
  max: number;
  sqm?: boolean;
}

interface PriceCategory {
  /** matches ServiceCategory.slug */
  slug: string;
  items: PriceLine[];
}

const PRICE_LIST: PriceCategory[] = [
  // 1 · Electrical Installation, Fitting and Repair · የኤሌክትሪክ ዝርጋታ፣ ገጠማ እና ጥገና
  {
    slug: 'electrical',
    items: [
      { en: 'Wire installation and repair', am: 'ኤሌክትሪክ ገመድ ዝርጋታና ጥገና', min: 600, max: 800 },
      { en: 'Socket & switch fixing', am: 'ሶኬትና ማብሪያ ማጥፊያ ገጠማና ጥገና', min: 300, max: 450 },
      { en: 'Breakers and distribution boards', am: 'ብሬከርና ማከፋፈያ ተከላና ጥገና', min: 800, max: 1100 },
    ],
  },

  // 2 · Kitchen & Domestic Appliances · የኪችን እና የቤት ውስጥ መገልገያ ዕቃዎች
  {
    slug: 'appliances',
    items: [
      { en: 'Injera mitad electrical problem', am: 'የእንጀራ ምጣድ የኤሌክትሪክ ችግር', min: 800, max: 1000 },
      { en: 'Injera mitad clay plate', am: 'የምጣድ ሸክላ ብልሽት', min: 1300, max: 1600 },
      { en: 'Bread mitad', am: 'የዳቦ ምጣድ', min: 800, max: 1000 },
      { en: 'Refrigerator electrical repair', am: 'የፍሪጅ ኤሌክትሪካል ጥገና', min: 600, max: 800 },
      { en: 'Refrigerator mechanical', am: 'የፍሪጅ መካኒካል ብልሽት', min: 1800, max: 2500 },
      { en: 'Refrigerator gas refill', am: 'የፍሪጅ ጋዝ መቀየር', min: 2300, max: 2500 },
      { en: 'Electric stove', am: 'የኤሌክትሪክ ስቶቭ ጥገና', min: 500, max: 800 },
      { en: 'Oven repair', am: 'ኦቭን ጥገና', min: 500, max: 800 },
      { en: 'Washing machine repair', am: 'የልብስ ማጠቢያ ማሽን ጥገና', min: 800, max: 1000 },
      { en: 'Microwave repair', am: 'የማይክሮዌቭ ጥገና', min: 600, max: 900 },
      { en: 'Water heater repair', am: 'የውሀ ማሞቂያዎች ጥገና', min: 500, max: 700 },
      { en: 'Coffee machine & water boiler repair', am: 'የቡና ማሽንና ውሀ ማፍያዎች ጥገና', min: 700, max: 1000 },
      { en: 'Grinder & grinding machine repair', am: 'የተለያዩ መፍጫዎች ጥገና', min: 500, max: 800 },
      { en: 'Heavy bakery machine', am: 'ትልቅ የዳቦ ማሽን ጥገና', min: 3500, max: 5000 },
    ],
  },

  // 3 · Plumbing & Sanitary Repair Services · የቧንቧ እና ፍሳሽ ማስወገጃ አገልግሎት
  // (the document files sofa and carpet cleaning under this section)
  {
    slug: 'plumbing',
    items: [
      { en: 'Toilet flush', am: 'የሽንትቤት ውሃ መልቀቂያ', min: 800, max: 1000 },
      { en: 'Toilet spray', am: 'የሽንትቤት ውሃ መርጫ', min: 500, max: 800 },
      { en: 'Toilet seat maintenance', am: 'የሽንት ቤት መቀመጫ', min: 1500, max: 2000 },
      { en: 'Toilet flush tank leakage', am: 'የሽንት ቤት ውሃ ታንከር', min: 1000, max: 1300 },
      { en: 'Toilet pot blockage', am: 'የሽንትቤት ጋን መዘጋት', min: 1200, max: 1500 },
      { en: 'Tap and mixer of hand washes', am: 'የእጅ መታጠቢያ መክፈቻ እና መዝጊያ', min: 500, max: 700 },
      { en: 'Tap and mixer of shower', am: 'የሻወር መክፈቻ እና መዝጊያ', min: 500, max: 700 },
      { en: 'Water pipe and connections', am: 'የውሃ መስመር እና መገጣጠሚያ', min: 900, max: 1100 },
      { en: 'Toilet drainage pipes', am: 'የሽንትቤት ፍሳሽ መውረጃ እና መገጣጠሚያ', min: 900, max: 1100 },
      { en: 'Kitchen drainage system installation and repair', am: 'የኪችን ፍሳሽ ተከላና ጥገና', min: 700, max: 900 },
      { en: 'Water tank & pump maintenance', am: 'የውሀ ማጠራቀሚ እና መሳቢያ', min: 1200, max: 1500 },
      { en: 'Sofa cleaning', am: 'የሶፋ እጥበት', min: 3000, max: 5000 },
      { en: 'Carpet cleaning', am: 'የምንጣፍ እጥበት', min: 250, max: 300, sqm: true },
    ],
  },

  // 4 · Electronics & Entertainment Systems · ኤሌክትሮኒክስና መዝናኛ ዕቃዎች
  {
    slug: 'electronics',
    items: [
      { en: 'TV installation', am: 'ቴሌቪዥን ገጠማ', min: 800, max: 1000 },
      { en: 'TV uninstallation', am: 'ቴሌቭዥን ነቀላ', min: 500, max: 700 },
      { en: 'TV maintenance', am: 'ቴሌቭዥን ጥገና', min: 1200, max: 1500 },
      { en: 'Installing satellite dishes', am: 'ዲሽ መግጠም', min: 500, max: 800 },
      { en: 'Sound system installation', am: 'የድምጽ ሲስተም ተከላ', min: 2500, max: 5000 },
      { en: 'Basic mobile phone maintenance', am: 'መሰረታዊ የሞባይል ጥገና', min: 500, max: 1000 },
    ],
  },

  // 5 · IT & Office Equipment Support · የአይቲ እና የቢሮ ዕቃዎች አገልግሎት
  {
    slug: 'it-office',
    items: [
      { en: 'Computer repair', am: 'የኮምፒውተር ጥገና', min: 1200, max: 1400 },
      { en: 'Printer maintenance', am: 'የፕሪንተር ጥገና', min: 1000, max: 1200 },
      { en: 'Photocopier maintenance', am: 'ፎቶ ኮፒ ማሽኖች ጥገና', min: 1000, max: 1200 },
      { en: 'Network installation and fixation', am: 'የኔትወርክ ዝርጋታ እና ጥገና', min: 2000, max: 2500 },
      { en: 'Software configuration', am: 'ሶፍትዌር መጫን', min: 800, max: 1000 },
      { en: 'PC and workstation power works', am: 'የኮምፒውተር ሃይል ዝርጋታ ስራዎች', min: 800, max: 1100 },
    ],
  },

  // 6 · Gas & Heating Systems Repair Services · በጋዝ የሚሰሩ ዕቃዎች ገጠማና ጥገና አገልግሎት
  {
    slug: 'gas-heating',
    items: [
      { en: 'Gas stove installation & repair', am: 'የጋዝ ስቶቭ ገጠማና ጥገና', min: 300, max: 500 },
      { en: 'Gas cylinder installation & servicing', am: 'የሲሊንደር ገጠማና እድሳት', min: 500, max: 700 },
      { en: 'Gas leak detection & safety inspection', am: 'የጋዝ ፍሰት ደህንነት ቁጥጥር', min: 350, max: 550 },
    ],
  },

  // 7 · Carpentry & Fixtures Repair · የአናጢነት እና የእንጨት ስራ ጥገና
  {
    slug: 'carpentry',
    items: [
      { en: 'Door lock installation and repair', am: 'የበር ቁልፍ ገጠማና ጥገና', min: 600, max: 800 },
      { en: 'Kitchen cabinet fix', am: 'የኪችን ካቢኔት ጥገና', min: 600, max: 900 },
      { en: 'Closet repair', am: 'ቁም ሳጥን መግጠም እና መጠገን', min: 2000, max: 2500 },
      { en: 'Drawer & shelf repair', am: 'የመሳቢያዎችና ሼልፎች ጥገና', min: 600, max: 900 },
      { en: 'Glass wall and mirror installation', am: 'የመስታወት ተከላና ገጠማ', min: 600, max: 800 },
      { en: 'Full sofa maintenance', am: 'ሙሉ ሶፋ ጥገና', min: 2000, max: 3000 },
      { en: 'Single sofa maintenance', am: 'ነጠላ ሶፋ ጥገና', min: 750, max: 1000 },
      { en: 'TV stand installation & repair', am: 'የቴሌቪዥን ማስቀመጫ ስራና ጥገና', min: 500, max: 800 },
      { en: 'Table repair', am: 'የጠረጴዛ ጥገና', min: 250, max: 350 },
      { en: 'Chair repair', am: 'ወንበር ጥገና', min: 150, max: 250 },
      { en: 'Bed repair and adjustments', am: 'አልጋ መጠገን እና ማስተካከል', min: 500, max: 700 },
      { en: 'Wood interiors', am: 'በእንጨት የማስዋብ ስራ', min: 1200, max: 1400, sqm: true },
    ],
  },

  // 8 · Painting & Finishing · የቀለምና ስነ-ውበት ስራዎች (all per m²)
  {
    slug: 'painting',
    items: [
      { en: 'Interior and exterior painting', am: 'የውስጥና የውጭ ቀለም ስራ', min: 400, max: 500, sqm: true },
      { en: 'Wall crack repairs', am: 'የተሰነጠቀ ግድግዳ ጥገና', min: 700, max: 900, sqm: true },
      { en: 'Water proofing and plastering services', am: 'የግድግዳ ፍሳሽ መከላከያ ስራዎች', min: 600, max: 700, sqm: true },
      { en: 'Curtain installation services', am: 'የመጋረጃ ስራዎች', min: 400, max: 500, sqm: true },
    ],
  },

  // 9 · Outdoor & Compound Maintenance Services · የቤት ውጫዊ እና ጊቢ አገልግሎት
  {
    slug: 'outdoor',
    items: [
      { en: 'Water tank cleaning services', am: 'የውሀ ማጠራቀሚያ ታንከር ጽዳት', min: 800, max: 1000 },
      { en: 'Outdoor gate & fence repair', am: 'የውጭ በርና አጥር ጥገና', min: 1000, max: 1200 },
      { en: 'Outdoor lighting installation & repair', am: 'የውጭ መብራት ገጠማና ጥገና', min: 500, max: 600 },
      { en: 'Drainage & sewerage repair services', am: 'የፍሳሽ ማስወገጃ ጥገና', min: 700, max: 800 },
    ],
  },

  // 10 · Light Automotive Assistance · ቀላል የመኪና ጥገና
  {
    slug: 'automotive',
    items: [
      { en: 'Tire change & replacement', am: 'ጎማ መቀየር', min: 300, max: 500 },
      { en: 'Tire air filling', am: 'ጎማ ነፋስ መሙላት', min: 400, max: 600 },
      { en: 'Vehicle battery jump-start', am: 'ባትሪ በጃምፐር ማስነሳት', min: 300, max: 500 },
      { en: 'Car oil change', am: 'የመኪና ዘይት መቀየር', min: 500, max: 700 },
    ],
  },

  // 11 · Apparel & Clothing Services · የጨርቃጨርቅ ማስተካከል ስራዎች
  {
    slug: 'apparel',
    items: [
      { en: 'Clothes size fitting & resizing', am: 'መደበኛ ልብስ ማስተካከል', min: 250, max: 450 },
      { en: 'Suit and jacket fitting', am: 'ሱፍ እና ጃኬት ማስተካከል', min: 800, max: 1000 },
      { en: 'Zipper replacement & repair', am: 'ዚፕ መቀየር እና ማስተካከል', min: 200, max: 300 },
      { en: 'Mattress & cushion renewal', am: 'ፍራሽ ማደስ', min: 600, max: 900 },
    ],
  },
];

/** Demo credentials (all roles) - username/password login for demos alongside phone OTP. */
const DEMO_PASSWORDS: Record<string, string> = {
  admin: 'admin1234',
  technician: 'tech1234',
  customer: 'customer1234',
  ops: 'ops12345',
  verifier: 'verify1234',
  support: 'support1234',
  finance: 'finance1234',
  coordinator: 'coord1234',
};
const hash = (u: string) => hashSync(DEMO_PASSWORDS[u], 10);

// The 11 categories of the company's official service and price list
// (2026-09-18), in the document's order. Display names are the short forms the
// product has always used; the prices come from PRICE_LIST above, and each
// category's "from ETB..." floor is derived from them below.
const categories = [
  { slug: 'electrical', nameEn: 'Electrical', nameAm: 'ኤሌክትሪክ', icon: 'zap' },
  { slug: 'appliances', nameEn: 'Kitchen & Domestic Appliances', nameAm: 'የወጥ ቤት እና የቤት እቃዎች', icon: 'refrigerator' },
  { slug: 'plumbing', nameEn: 'Plumbing & Sanitary', nameAm: 'ቧንቧ እና ሳኒተሪ', icon: 'wrench' },
  { slug: 'electronics', nameEn: 'Electronics & Entertainment', nameAm: 'ኤሌክትሮኒክስ እና መዝናኛ', icon: 'tv' },
  { slug: 'it-office', nameEn: 'IT & Office Equipment', nameAm: 'አይቲ እና የቢሮ መሣሪያ', icon: 'monitor' },
  { slug: 'gas-heating', nameEn: 'Gas & Heating Systems', nameAm: 'ጋዝ እና ማሞቂያ', icon: 'flame' },
  { slug: 'carpentry', nameEn: 'Carpentry & Fixtures', nameAm: 'አናጢነት', icon: 'hammer' },
  { slug: 'painting', nameEn: 'Painting & Finishing', nameAm: 'ቀለም ቅብ', icon: 'paint-roller' },
  { slug: 'outdoor', nameEn: 'Outdoor & Compound Maintenance', nameAm: 'የግቢ ጥገና', icon: 'fence' },
  { slug: 'automotive', nameEn: 'Light Automotive Assistance', nameAm: 'ቀላል የመኪና ጥገና', icon: 'car' },
  { slug: 'apparel', nameEn: 'Apparel & Clothing', nameAm: 'የጨርቃጨርቅ ማስተካከል', icon: 'shirt' },
];

// Categories no longer in the official list. Kept, not deleted - old bookings
// still point at them - but hidden from customers and from dispatch.
// General Handyman was dropped from the 2026-09-18 price list; its work now
// sits under carpentry (TV stands, mirrors, shelves) and painting (curtains).
const retiredSlugs = ['ac-repair', 'locksmith', 'general'];

async function main() {
  for (const [i, c] of categories.entries()) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameAm: c.nameAm, icon: c.icon, isActive: true, sortOrder: i + 1 },
      create: { ...c, sortOrder: i + 1 },
    });
  }
  await prisma.serviceCategory.updateMany({
    where: { slug: { in: retiredSlugs } },
    data: { isActive: false },
  });

  // Load the published price list. Each category's lines are replaced
  // wholesale, so a line dropped from the document disappears too.
  let priceLines = 0;
  for (const group of PRICE_LIST) {
    const category = await prisma.serviceCategory.findUnique({ where: { slug: group.slug } });
    if (!category) throw new Error(`price list names unknown category "${group.slug}"`);

    await prisma.servicePrice.deleteMany({ where: { categoryId: category.id } });
    await prisma.servicePrice.createMany({
      data: group.items.map((item, i) => ({
        categoryId: category.id,
        nameEn: item.en,
        nameAm: item.am,
        minEtb: item.min,
        maxEtb: item.max,
        unit: item.sqm ? ('SQM' as const) : ('JOB' as const),
        sortOrder: i + 1,
      })),
    });
    priceLines += group.items.length;

    // "from ETB..." is the cheapest per-job line. A per-m² rate is not a
    // floor for a whole job, so it only counts when a category has nothing
    // else (painting is priced entirely per m²).
    const perJob = group.items.filter((item) => !item.sqm);
    const floor = Math.min(...(perJob.length ? perJob : group.items).map((item) => item.min));
    await prisma.serviceCategory.update({
      where: { id: category.id },
      data: {
        priceFloorEtb: floor,
        // search finds a category by any of its line items
        subServices: group.items.map((item) => item.en),
      },
    });
  }

  // Platform fee ≈ 14% of the base labor minimum (official price list column).
  await prisma.appConfig.upsert({
    where: { key: 'commission_rate' },
    update: {},
    create: { key: 'commission_rate', value: process.env.COMMISSION_RATE ?? '0.14' },
  });
  // Working hours from the "Expected response time" document: 14h daily.
  await prisma.appConfig.upsert({
    where: { key: 'working_hours' },
    update: { value: '06:00-20:00' },
    create: { key: 'working_hours', value: '06:00-20:00' },
  });

  const admin = await prisma.user.upsert({
    where: { phone: '+251900000001' },
    update: { role: 'ADMIN', username: 'admin', passwordHash: hash('admin') },
    create: {
      phone: '+251900000001',
      name: 'Platform Admin',
      role: 'ADMIN',
      language: 'EN',
      username: 'admin',
      passwordHash: hash('admin'),
    },
  });

  // Day-1 staff roles (roles/workflow spec section 2): Ops Manager,
  // Verification Officer, Support Agent - one demo account each.
  type StaffRole =
    | 'OPS_MANAGER'
    | 'VERIFICATION_OFFICER'
    | 'SUPPORT_AGENT'
    | 'FINANCE_OFFICER'
    | 'SUBCITY_COORDINATOR';
  /** phone, display name, username, role, sub-city (coordinators only) */
  const staff: [string, string, string, StaffRole, string | null][] = [
    ['+251900000004', 'Operations Manager', 'ops', 'OPS_MANAGER', null],
    ['+251900000005', 'Verification Officer', 'verifier', 'VERIFICATION_OFFICER', null],
    ['+251900000006', 'Support Agent', 'support', 'SUPPORT_AGENT', null],
    ['+251900000007', 'Finance Officer', 'finance', 'FINANCE_OFFICER', null],
    ['+251900000008', 'Bole Coordinator', 'coordinator', 'SUBCITY_COORDINATOR', 'Bole'],
  ];
  for (const [phone, name, username, role, subCity] of staff) {
    // the password is reset on every seed so the demo logins never drift
    await prisma.user.upsert({
      where: { phone },
      update: { role, username, subCity, passwordHash: hash(username) },
      create: { phone, name, role, subCity, language: 'EN', username, passwordHash: hash(username) },
    });
  }

  // Support refund auto-approval cap (spec section 5) - above it routes to Ops/Admin.
  await prisma.appConfig.upsert({
    where: { key: 'support_refund_cap_etb' },
    update: {},
    create: { key: 'support_refund_cap_etb', value: '500' },
  });

  // Demo customer (username/password login for demos)
  await prisma.user.upsert({
    where: { phone: '+251900000003' },
    update: { username: 'customer', passwordHash: hash('customer') },
    create: {
      phone: '+251900000003',
      name: 'Marta Abebe',
      role: 'CUSTOMER',
      username: 'customer',
      passwordHash: hash('customer'),
    },
  });

  // Demo provider (verified, available, located near Meskel Square) for local development.
  // DEMO_TECH_PHONE / DEMO_TECH_NAME let a deployment point this account at a
  // REAL technician's handset so dispatch SMS can be demonstrated end to end -
  // keep real numbers and names in the server .env, never in this public repo.
  const plumbing = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'plumbing' } });
  const demoTechPhone = process.env.DEMO_TECH_PHONE ?? '+251911000002';
  const demoTechName = process.env.DEMO_TECH_NAME ?? 'Abebe Tesfaye';
  const providerUser = await prisma.user.upsert({
    where: { phone: demoTechPhone },
    update: {
      role: 'PROVIDER',
      name: demoTechName,
      username: 'technician',
      passwordHash: hash('technician'),
    },
    create: {
      phone: demoTechPhone,
      name: demoTechName,
      role: 'PROVIDER',
      username: 'technician',
      passwordHash: hash('technician'),
    },
  });
  const profile = await prisma.providerProfile.upsert({
    where: { userId: providerUser.id },
    update: {
      verificationStatus: 'VERIFIED',
      isAvailable: true,
      avatarUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=75&w=240&h=240&auto=format&fit=crop&crop=faces',
      subCity: 'Kirkos',
      yearsExperience: 8,
      ratingAvg: 4.8,
      ratingCount: 46,
      jobsCompleted: 112,
    },
    create: {
      userId: providerUser.id,
      categoryId: plumbing.id,
      bio: 'Experienced plumber - demo account',
      avatarUrl: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?q=75&w=240&h=240&auto=format&fit=crop&crop=faces',
      subCity: 'Kirkos',
      yearsExperience: 8,
      ratingAvg: 4.8,
      ratingCount: 46,
      jobsCompleted: 112,
      serviceRadiusKm: 10,
      isAvailable: true,
      verificationStatus: 'VERIFIED',
      lat: 9.0108,
      lng: 38.7613,
    },
  });
  await prisma.$executeRaw`UPDATE "ProviderProfile" SET "location" = ST_SetSRID(ST_MakePoint(38.7613, 9.0108), 4326)::geography WHERE "id" = ${profile.id}`;
  await prisma.wallet.upsert({
    where: { providerId: profile.id },
    update: {},
    create: { providerId: profile.id },
  });

  // ── Demo technician fleet ─────────────────────────────────────────────────
  // Multiple VERIFIED, available technicians per category, spread across real
  // Addis Ababa neighbourhoods so vicinity ranking demos properly. Portraits
  // are visually-verified Ethiopian/Black faces from Unsplash (free license);
  // ratings/jobs varied so featured + dispatch ordering looks alive.
  // Idempotent (upsert by phone).
  const FLEET: {
    phone: string;
    name: string;
    img: string; // Unsplash portrait asset id (visually verified Ethiopian/Black faces)
    slug: string;
    bio: string;
    subCity: string;
    years: number;
    rating: number;
    ratings: number;
    jobs: number;
    lat: number;
    lng: number;
  }[] = [
    // electrical (3)
    { phone: '+251911000101', name: 'Yonas Bekele', img: 'photo-1616805765352-beedbad46b2a', slug: 'electrical', bio: 'House wiring, breaker panels and Mitad repairs - 10 years on the tools.', subCity: 'Bole', years: 10, rating: 4.9, ratings: 87, jobs: 214, lat: 9.0092, lng: 38.786 },
    { phone: '+251911000102', name: 'Hanna Girma', img: 'photo-1598554563873-55ef9dd8428b', slug: 'electrical', bio: 'CoC-certified electrician - lighting, sockets and appliance circuits.', subCity: 'Yeka', years: 6, rating: 4.7, ratings: 52, jobs: 131, lat: 9.033, lng: 38.848 },
    { phone: '+251911000103', name: 'Fitsum Negash', img: 'photo-1612214070475-1e73f478188c', slug: 'electrical', bio: 'Fast diagnosis of trips and shorts; condominium wiring specialist.', subCity: 'Nifas Silk-Lafto', years: 7, rating: 4.6, ratings: 38, jobs: 96, lat: 8.956, lng: 38.71 },
    // plumbing (3, + Abebe above)
    { phone: '+251911000104', name: 'Dawit Lemma', img: 'photo-1506277886164-e25aa3f4ef7f', slug: 'plumbing', bio: 'Pipes, tanks and pumps - clean work, guaranteed seals.', subCity: 'Kolfe Keranio', years: 9, rating: 4.8, ratings: 64, jobs: 172, lat: 8.99, lng: 38.693 },
    { phone: '+251911000105', name: 'Meseret Alemu', img: 'photo-1743871698163-a2e470d8eac7', slug: 'plumbing', bio: 'Bathroom and kitchen plumbing; unclogging without the mess.', subCity: 'Gullele', years: 5, rating: 4.6, ratings: 29, jobs: 74, lat: 9.064, lng: 38.752 },
    { phone: '+251911000106', name: 'Samuel Tadesse', img: 'photo-1531384441138-2736e62e0919', slug: 'plumbing', bio: 'Water heaters and pressure systems - same-day fixes.', subCity: 'Akaky Kaliti', years: 11, rating: 4.9, ratings: 71, jobs: 198, lat: 8.91, lng: 38.745 },
    // electronics (2)
    { phone: '+251911000107', name: 'Kalkidan Assefa', img: 'photo-1531123897727-8f129e1688ce', slug: 'electronics', bio: 'TV, decoder and audio setups - calibration included.', subCity: 'Bole', years: 4, rating: 4.7, ratings: 33, jobs: 81, lat: 9.0155, lng: 38.818 },
    { phone: '+251911000108', name: 'Binyam Worku', img: 'photo-1612213993024-b0ed04dfb248', slug: 'electronics', bio: 'Satellite dish alignment and home cinema installs.', subCity: 'Arada', years: 8, rating: 4.5, ratings: 26, jobs: 67, lat: 9.0356, lng: 38.75 },
    // it-office (2)
    { phone: '+251911000109', name: 'Natnael Fikru', img: 'photo-1566492031773-4f4e44671857', slug: 'it-office', bio: 'Wi-Fi networks, printers and workstation power - office-ready.', subCity: 'Kirkos', years: 6, rating: 4.8, ratings: 44, jobs: 109, lat: 9.018, lng: 38.769 },
    { phone: '+251911000110', name: 'Sara Mekonnen', img: 'photo-1674553095795-c4a2dc2b4436', slug: 'it-office', bio: 'Laptop/desktop repair and software troubleshooting for creators.', subCity: 'Lemi Kura', years: 5, rating: 4.6, ratings: 31, jobs: 77, lat: 9.025, lng: 38.89 },
    // appliances (2)
    { phone: '+251911000111', name: 'Getahun Abera', img: 'photo-1605980776566-0486c3ac7617', slug: 'appliances', bio: 'Fridges, ovens and washing machines - genuine-part repairs.', subCity: 'Addis Ketema', years: 12, rating: 4.8, ratings: 58, jobs: 167, lat: 9.037, lng: 38.74 },
    { phone: '+251911000112', name: 'Lidya Tesfaye', img: 'photo-1628682819415-afbd0eb5f93a', slug: 'appliances', bio: 'Small appliance clinic - blenders, kettles, coffee machines.', subCity: 'Bole', years: 3, rating: 4.5, ratings: 19, jobs: 48, lat: 9.005, lng: 38.788 },
    // gas-heating (2)
    { phone: '+251911000113', name: 'Mulugeta Kassa', img: 'photo-1546456073-92b9f0a8d413', slug: 'gas-heating', bio: 'Gas stove installs and leak safety checks - certified handling.', subCity: 'Lideta', years: 9, rating: 4.7, ratings: 36, jobs: 92, lat: 9.011, lng: 38.742 },
    { phone: '+251911000114', name: 'Eyob Shiferaw', img: 'photo-1612214070442-3c806a722f0b', slug: 'gas-heating', bio: 'Cylinder and regulator setups done right the first time.', subCity: 'Nifas Silk-Lafto', years: 6, rating: 4.6, ratings: 22, jobs: 59, lat: 8.97, lng: 38.76 },
    // carpentry (2)
    { phone: '+251911000115', name: 'Bereket Alemayehu', img: 'photo-1509305717900-84f40e786d82', slug: 'carpentry', bio: 'Doors, locks and cabinets - precise joinery and adjustments.', subCity: 'Yeka', years: 10, rating: 4.9, ratings: 61, jobs: 148, lat: 9.03, lng: 38.85 },
    { phone: '+251911000116', name: 'Tigist Haile', img: 'photo-1523824921871-d6f1a15151f1', slug: 'carpentry', bio: 'Furniture repair and wardrobe fittings with a fine finish.', subCity: 'Kirkos', years: 7, rating: 4.6, ratings: 27, jobs: 70, lat: 9.015, lng: 38.765 },
    // painting (2)
    { phone: '+251911000117', name: 'Henok Desta', img: 'photo-1601576084861-5de423553c0f', slug: 'painting', bio: 'Interior/exterior painting, crack repair and clean edges.', subCity: 'Bole', years: 8, rating: 4.7, ratings: 41, jobs: 118, lat: 9.02, lng: 38.83 },
    { phone: '+251911000118', name: 'Rahel Solomon', img: 'photo-1589317621382-0cbef7ffcc4c', slug: 'painting', bio: 'Feature walls and ceiling refresh - dust-free process.', subCity: 'Arada', years: 4, rating: 4.5, ratings: 17, jobs: 43, lat: 9.033, lng: 38.763 },
    // general (2)
    { phone: '+251911000119', name: 'Robel Kebede', img: 'photo-1615813967515-e1838c1c5116', slug: 'carpentry', bio: 'TV stands, mirrors and shelves - neat, careful fitting.', subCity: 'Lemi Kura', years: 5, rating: 4.8, ratings: 49, jobs: 126, lat: 9.033, lng: 38.872 },
    { phone: '+251911000120', name: 'Selam Abraha', img: 'photo-1611432579699-484f7990b127', slug: 'carpentry', bio: 'Furniture assembly and mirror/frame fixing - careful and quick.', subCity: 'Kolfe Keranio', years: 3, rating: 4.6, ratings: 21, jobs: 55, lat: 8.982, lng: 38.71 },
    // outdoor (2)
    { phone: '+251911000121', name: 'Tesfahun Molla', img: 'photo-1779469392752-c53bbf07eb66', slug: 'outdoor', bio: 'Water tank cleaning, gates and compound lighting.', subCity: 'Akaky Kaliti', years: 7, rating: 4.6, ratings: 24, jobs: 63, lat: 8.9, lng: 38.75 },
    { phone: '+251911000122', name: 'Marta Yohannes', img: 'photo-1598122666068-59b41e0a3193', slug: 'outdoor', bio: 'Drainage clearing and fence repair - rainy-season ready.', subCity: 'Gullele', years: 4, rating: 4.5, ratings: 15, jobs: 39, lat: 9.055, lng: 38.74 },
    // automotive (2)
    { phone: '+251911000123', name: 'Kirubel Demissie', img: 'photo-1595211877493-41a4e5f236b3', slug: 'automotive', bio: 'Jump-starts, tyre service and basic checks at your gate.', subCity: 'Bole', years: 6, rating: 4.7, ratings: 34, jobs: 88, lat: 9.008, lng: 38.8 },
    { phone: '+251911000124', name: 'Helen Tsegaye', img: 'photo-1613876215075-276fd62c89a4', slug: 'automotive', bio: 'Battery and light vehicle support - quick roadside help.', subCity: 'Lideta', years: 5, rating: 4.5, ratings: 18, jobs: 47, lat: 9.005, lng: 38.735 },
  ];

  const catBySlug = new Map(
    (await prisma.serviceCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  // Marks the seeded opening balance so re-running the seed does not stack it up.
  const SEED_DEPOSIT_REF = 'SEED-OPENING-CREDIT';

  for (const t of FLEET) {
    const categoryId = catBySlug.get(t.slug);
    if (!categoryId) continue;
    const avatarUrl = `https://images.unsplash.com/${t.img}?q=75&w=240&h=240&auto=format&fit=crop&crop=faces`;
    const u = await prisma.user.upsert({
      where: { phone: t.phone },
      update: { role: 'PROVIDER', name: t.name },
      create: { phone: t.phone, name: t.name, role: 'PROVIDER', language: 'AM' },
    });
    const data = {
      categoryId,
      bio: t.bio,
      avatarUrl,
      subCity: t.subCity,
      yearsExperience: t.years,
      ratingAvg: t.rating,
      ratingCount: t.ratings,
      jobsCompleted: t.jobs,
      serviceRadiusKm: 12,
      isAvailable: true,
      verificationStatus: 'VERIFIED' as const,
      lat: t.lat,
      lng: t.lng,
    };
    const p = await prisma.providerProfile.upsert({
      where: { userId: u.id },
      update: data,
      create: { userId: u.id, ...data },
    });
    await prisma.$executeRaw`UPDATE "ProviderProfile" SET "location" = ST_SetSRID(ST_MakePoint(${t.lng}, ${t.lat}), 4326)::geography WHERE "id" = ${p.id}`;

    // Demo fleet starts with commission credit on the books. Without it every
    // technician sits at zero, the first job pushes them negative, and dispatch
    // stops offering work part-way through a demo.
    const wallet = await prisma.wallet.upsert({
      where: { providerId: p.id },
      update: {},
      create: { providerId: p.id },
    });
    const opening = 1500;
    const seeded = await prisma.deposit.findFirst({
      where: { walletId: wallet.id, reference: SEED_DEPOSIT_REF },
    });
    if (!seeded) {
      await prisma.deposit.create({
        data: {
          walletId: wallet.id,
          amountEtb: opening,
          method: 'CASH_OFFICE',
          reference: SEED_DEPOSIT_REF,
          status: 'CONFIRMED',
          note: 'Opening commission credit (demo data)',
          settledAt: new Date(),
        },
      });
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amountEtb: opening,
          note: 'Opening commission credit (demo data)',
        },
      });
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceEtb: opening },
      });
    }
  }

  console.log('Seed complete:', {
    admin: admin.phone,
    demoProvider: providerUser.phone,
    fleet: FLEET.length,
    categories: categories.length,
    priceLines,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
