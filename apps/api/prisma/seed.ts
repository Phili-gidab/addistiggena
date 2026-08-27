import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

/** Demo credentials (all roles) - username/password login for demos alongside phone OTP. */
const DEMO_PASSWORDS: Record<string, string> = {
  admin: 'admin1234',
  technician: 'tech1234',
  customer: 'customer1234',
  ops: 'ops12345',
  verifier: 'verify1234',
  support: 'support1234',
};
const hash = (u: string) => hashSync(DEMO_PASSWORDS[u], 10);

// The 11 official service categories from the company "Service Catalog"
// document. priceFloorEtb doubles as the "from ETB…" estimate shown at booking
// time and is the minimum of the category's documented standard price ranges
// (250 ETB - the diagnostic/call-out floor - where no range is documented yet).
const categories = [
  { slug: 'electrical', nameEn: 'Electrical', nameAm: 'ኤሌክትሪክ', icon: 'zap', priceFloorEtb: 250 },
  { slug: 'plumbing', nameEn: 'Plumbing & Sanitary', nameAm: 'ቧንቧ እና ሳኒተሪ', icon: 'wrench', priceFloorEtb: 550 },
  { slug: 'electronics', nameEn: 'Electronics & Entertainment', nameAm: 'ኤሌክትሮኒክስ እና መዝናኛ', icon: 'tv', priceFloorEtb: 250 },
  { slug: 'it-office', nameEn: 'IT & Office Equipment', nameAm: 'አይቲ እና የቢሮ መሣሪያ', icon: 'monitor', priceFloorEtb: 400 },
  { slug: 'appliances', nameEn: 'Kitchen & Domestic Appliances', nameAm: 'የወጥ ቤት እና የቤት እቃዎች', icon: 'refrigerator', priceFloorEtb: 400 },
  { slug: 'gas-heating', nameEn: 'Gas & Heating Systems', nameAm: 'ጋዝ እና ማሞቂያ', icon: 'flame', priceFloorEtb: 250 },
  { slug: 'carpentry', nameEn: 'Carpentry & Fixtures', nameAm: 'አናጢነት', icon: 'hammer', priceFloorEtb: 400 },
  { slug: 'painting', nameEn: 'Painting & Finishing', nameAm: 'ቀለም ቅብ', icon: 'paint-roller', priceFloorEtb: 250 },
  { slug: 'general', nameEn: 'General Handyman', nameAm: 'አጠቃላይ ጥገና', icon: 'toolbox', priceFloorEtb: 350 },
  { slug: 'outdoor', nameEn: 'Outdoor & Compound Maintenance', nameAm: 'የግቢ ጥገና', icon: 'fence', priceFloorEtb: 250 },
  { slug: 'automotive', nameEn: 'Light Automotive Assistance', nameAm: 'ቀላል የመኪና ጥገና', icon: 'car', priceFloorEtb: 250 },
];

// Superseded pre-launch categories folded into the official catalog
// (AC/refrigeration → appliances, locksmith → carpentry & fixtures).
const retiredSlugs = ['ac-repair', 'locksmith'];

async function main() {
  for (const c of categories) {
    await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameAm: c.nameAm, icon: c.icon, priceFloorEtb: c.priceFloorEtb, isActive: true },
      create: c,
    });
  }
  await prisma.serviceCategory.updateMany({
    where: { slug: { in: retiredSlugs } },
    data: { isActive: false },
  });

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
  const staff: [string, string, string, 'OPS_MANAGER' | 'VERIFICATION_OFFICER' | 'SUPPORT_AGENT'][] = [
    ['+251900000004', 'Operations Manager', 'ops', 'OPS_MANAGER'],
    ['+251900000005', 'Verification Officer', 'verifier', 'VERIFICATION_OFFICER'],
    ['+251900000006', 'Support Agent', 'support', 'SUPPORT_AGENT'],
  ];
  for (const [phone, name, username, role] of staff) {
    await prisma.user.upsert({
      where: { phone },
      update: { role, username, passwordHash: hash(username) },
      create: { phone, name, role, language: 'EN', username, passwordHash: hash(username) },
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

  // Demo provider (verified, available, located near Meskel Square) for local development
  const plumbing = await prisma.serviceCategory.findUniqueOrThrow({ where: { slug: 'plumbing' } });
  const providerUser = await prisma.user.upsert({
    where: { phone: '+251911000002' },
    update: { role: 'PROVIDER', username: 'technician', passwordHash: hash('technician') },
    create: {
      phone: '+251911000002',
      name: 'Abebe Tesfaye',
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
      avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
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
      avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
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
  // Addis Ababa neighbourhoods so vicinity ranking demos properly. Stock
  // portraits from randomuser.me; ratings/jobs varied so featured + dispatch
  // ordering looks alive. Idempotent (upsert by phone).
  const FLEET: {
    phone: string;
    name: string;
    img: string; // randomuser portrait path, e.g. men/45
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
    { phone: '+251911000101', name: 'Yonas Bekele', img: 'men/45', slug: 'electrical', bio: 'House wiring, breaker panels and Mitad repairs - 10 years on the tools.', subCity: 'Bole', years: 10, rating: 4.9, ratings: 87, jobs: 214, lat: 9.0092, lng: 38.786 },
    { phone: '+251911000102', name: 'Hanna Girma', img: 'women/44', slug: 'electrical', bio: 'CoC-certified electrician - lighting, sockets and appliance circuits.', subCity: 'Yeka', years: 6, rating: 4.7, ratings: 52, jobs: 131, lat: 9.033, lng: 38.848 },
    { phone: '+251911000103', name: 'Fitsum Negash', img: 'men/67', slug: 'electrical', bio: 'Fast diagnosis of trips and shorts; condominium wiring specialist.', subCity: 'Nifas Silk-Lafto', years: 7, rating: 4.6, ratings: 38, jobs: 96, lat: 8.956, lng: 38.71 },
    // plumbing (3, + Abebe above)
    { phone: '+251911000104', name: 'Dawit Lemma', img: 'men/22', slug: 'plumbing', bio: 'Pipes, tanks and pumps - clean work, guaranteed seals.', subCity: 'Kolfe Keranio', years: 9, rating: 4.8, ratings: 64, jobs: 172, lat: 8.99, lng: 38.693 },
    { phone: '+251911000105', name: 'Meseret Alemu', img: 'women/68', slug: 'plumbing', bio: 'Bathroom and kitchen plumbing; unclogging without the mess.', subCity: 'Gullele', years: 5, rating: 4.6, ratings: 29, jobs: 74, lat: 9.064, lng: 38.752 },
    { phone: '+251911000106', name: 'Samuel Tadesse', img: 'men/78', slug: 'plumbing', bio: 'Water heaters and pressure systems - same-day fixes.', subCity: 'Akaky Kaliti', years: 11, rating: 4.9, ratings: 71, jobs: 198, lat: 8.91, lng: 38.745 },
    // electronics (2)
    { phone: '+251911000107', name: 'Kalkidan Assefa', img: 'women/32', slug: 'electronics', bio: 'TV, decoder and audio setups - calibration included.', subCity: 'Bole', years: 4, rating: 4.7, ratings: 33, jobs: 81, lat: 9.0155, lng: 38.818 },
    { phone: '+251911000108', name: 'Binyam Worku', img: 'men/51', slug: 'electronics', bio: 'Satellite dish alignment and home cinema installs.', subCity: 'Arada', years: 8, rating: 4.5, ratings: 26, jobs: 67, lat: 9.0356, lng: 38.75 },
    // it-office (2)
    { phone: '+251911000109', name: 'Natnael Fikru', img: 'men/36', slug: 'it-office', bio: 'Wi-Fi networks, printers and workstation power - office-ready.', subCity: 'Kirkos', years: 6, rating: 4.8, ratings: 44, jobs: 109, lat: 9.018, lng: 38.769 },
    { phone: '+251911000110', name: 'Sara Mekonnen', img: 'women/65', slug: 'it-office', bio: 'Laptop/desktop repair and software troubleshooting for creators.', subCity: 'Lemi Kura', years: 5, rating: 4.6, ratings: 31, jobs: 77, lat: 9.025, lng: 38.89 },
    // appliances (2)
    { phone: '+251911000111', name: 'Getahun Abera', img: 'men/85', slug: 'appliances', bio: 'Fridges, ovens and washing machines - genuine-part repairs.', subCity: 'Addis Ketema', years: 12, rating: 4.8, ratings: 58, jobs: 167, lat: 9.037, lng: 38.74 },
    { phone: '+251911000112', name: 'Lidya Tesfaye', img: 'women/26', slug: 'appliances', bio: 'Small appliance clinic - blenders, kettles, coffee machines.', subCity: 'Bole', years: 3, rating: 4.5, ratings: 19, jobs: 48, lat: 9.005, lng: 38.788 },
    // gas-heating (2)
    { phone: '+251911000113', name: 'Mulugeta Kassa', img: 'men/29', slug: 'gas-heating', bio: 'Gas stove installs and leak safety checks - certified handling.', subCity: 'Lideta', years: 9, rating: 4.7, ratings: 36, jobs: 92, lat: 9.011, lng: 38.742 },
    { phone: '+251911000114', name: 'Eyob Shiferaw', img: 'men/61', slug: 'gas-heating', bio: 'Cylinder and regulator setups done right the first time.', subCity: 'Nifas Silk-Lafto', years: 6, rating: 4.6, ratings: 22, jobs: 59, lat: 8.97, lng: 38.76 },
    // carpentry (2)
    { phone: '+251911000115', name: 'Bereket Alemayehu', img: 'men/41', slug: 'carpentry', bio: 'Doors, locks and cabinets - precise joinery and adjustments.', subCity: 'Yeka', years: 10, rating: 4.9, ratings: 61, jobs: 148, lat: 9.03, lng: 38.85 },
    { phone: '+251911000116', name: 'Tigist Haile', img: 'women/50', slug: 'carpentry', bio: 'Furniture repair and wardrobe fittings with a fine finish.', subCity: 'Kirkos', years: 7, rating: 4.6, ratings: 27, jobs: 70, lat: 9.015, lng: 38.765 },
    // painting (2)
    { phone: '+251911000117', name: 'Henok Desta', img: 'men/72', slug: 'painting', bio: 'Interior/exterior painting, crack repair and clean edges.', subCity: 'Bole', years: 8, rating: 4.7, ratings: 41, jobs: 118, lat: 9.02, lng: 38.83 },
    { phone: '+251911000118', name: 'Rahel Solomon', img: 'women/79', slug: 'painting', bio: 'Feature walls and ceiling refresh - dust-free process.', subCity: 'Arada', years: 4, rating: 4.5, ratings: 17, jobs: 43, lat: 9.033, lng: 38.763 },
    // general (2)
    { phone: '+251911000119', name: 'Robel Kebede', img: 'men/57', slug: 'general', bio: 'TV mounting, curtains, drilling - the everything handyman.', subCity: 'Lemi Kura', years: 5, rating: 4.8, ratings: 49, jobs: 126, lat: 9.033, lng: 38.872 },
    { phone: '+251911000120', name: 'Selam Abraha', img: 'women/57', slug: 'general', bio: 'Furniture assembly and mirror/frame fixing - careful and quick.', subCity: 'Kolfe Keranio', years: 3, rating: 4.6, ratings: 21, jobs: 55, lat: 8.982, lng: 38.71 },
    // outdoor (2)
    { phone: '+251911000121', name: 'Tesfahun Molla', img: 'men/91', slug: 'outdoor', bio: 'Water tank cleaning, gates and compound lighting.', subCity: 'Akaky Kaliti', years: 7, rating: 4.6, ratings: 24, jobs: 63, lat: 8.9, lng: 38.75 },
    { phone: '+251911000122', name: 'Marta Yohannes', img: 'women/90', slug: 'outdoor', bio: 'Drainage clearing and fence repair - rainy-season ready.', subCity: 'Gullele', years: 4, rating: 4.5, ratings: 15, jobs: 39, lat: 9.055, lng: 38.74 },
    // automotive (2)
    { phone: '+251911000123', name: 'Kirubel Demissie', img: 'men/14', slug: 'automotive', bio: 'Jump-starts, tyre service and basic checks at your gate.', subCity: 'Bole', years: 6, rating: 4.7, ratings: 34, jobs: 88, lat: 9.008, lng: 38.8 },
    { phone: '+251911000124', name: 'Helen Tsegaye', img: 'women/12', slug: 'automotive', bio: 'Battery and light vehicle support - quick roadside help.', subCity: 'Lideta', years: 5, rating: 4.5, ratings: 18, jobs: 47, lat: 9.005, lng: 38.735 },
  ];

  const catBySlug = new Map(
    (await prisma.serviceCategory.findMany({ select: { id: true, slug: true } })).map((c) => [c.slug, c.id]),
  );
  for (const t of FLEET) {
    const categoryId = catBySlug.get(t.slug);
    if (!categoryId) continue;
    const avatarUrl = `https://randomuser.me/api/portraits/${t.img}.jpg`;
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
    await prisma.wallet.upsert({ where: { providerId: p.id }, update: {}, create: { providerId: p.id } });
  }

  console.log('Seed complete:', {
    admin: admin.phone,
    demoProvider: providerUser.phone,
    fleet: FLEET.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
