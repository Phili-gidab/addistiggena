import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

/** Demo credentials (all roles) - username/password login for demos alongside phone OTP. */
const DEMO_PASSWORDS: Record<string, string> = {
  admin: 'admin1234',
  technician: 'tech1234',
  customer: 'customer1234',
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
  { slug: 'automotive', nameEn: 'Light Automotive Assistance', nameAm: 'ቀላል የመኪና ድጋፍ', icon: 'car', priceFloorEtb: 250 },
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
    update: { verificationStatus: 'VERIFIED', isAvailable: true },
    create: {
      userId: providerUser.id,
      categoryId: plumbing.id,
      bio: 'Experienced plumber - demo account',
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

  console.log('Seed complete:', { admin: admin.phone, demoProvider: providerUser.phone });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
