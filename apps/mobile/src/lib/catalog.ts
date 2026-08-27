/** Category icons + Addis sub-cities - mirrors the web lib. */
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Vector icons per category slug (MaterialCommunityIcons) - emoji rendered
 * inconsistently on older Android devices, so the app draws real glyphs.
 */
const ICONS: Record<string, MCIName> = {
  electrical: 'lightning-bolt',
  plumbing: 'pipe-wrench',
  electronics: 'television-classic',
  'it-office': 'laptop',
  appliances: 'fridge-outline',
  'gas-heating': 'fire',
  carpentry: 'hand-saw',
  painting: 'format-paint',
  general: 'toolbox-outline',
  outdoor: 'tree-outline',
  automotive: 'car-wrench',
};

export const iconFor = (slug: string): MCIName => ICONS[slug] ?? 'wrench';

export const SUB_CITIES = [
  'Addis Ketema',
  'Akaky Kaliti',
  'Arada',
  'Bole',
  'Gullele',
  'Kirkos',
  'Kolfe Keranio',
  'Lideta',
  'Lemi Kura',
  'Nifas Silk-Lafto',
  'Yeka',
];

/** Popular repairs with the official standard rate ranges (mirrors
 *  apps/web/lib/pricing.ts) - home-screen booking shortcuts. */
export const POPULAR: {
  slug: string;
  name: string;
  nameAm: string;
  min: number;
  max: number;
}[] = [
  { slug: 'electrical', name: 'Electric Mitad Repair', nameAm: 'የኤሌክትሪክ ምጣድ ጥገና', min: 500, max: 800 },
  { slug: 'plumbing', name: 'Faucet / Tap Repair', nameAm: 'የቧንቧ ራስ ጥገና', min: 550, max: 750 },
  { slug: 'electrical', name: 'Socket & Switch Fix', nameAm: 'የሶኬትና ማብሪያ ጥገና', min: 250, max: 450 },
  { slug: 'it-office', name: 'Wi-Fi Router Fix', nameAm: 'የዋይ-ፋይ ራውተር ጥገና', min: 400, max: 600 },
  { slug: 'carpentry', name: 'Door Lock Repair', nameAm: 'የበር ቁልፍ ጥገና', min: 400, max: 800 },
  { slug: 'plumbing', name: 'Toilet & Sink Unclogging', nameAm: 'የሽንት ቤትና ገንዳ መክፈት', min: 950, max: 1100 },
];

/** Booking flow copy - bilingual, matching the web. */
export const STATUS_FLOW: { key: string; t: string; s: string }[] = [
  { key: 'REQUESTED', t: 'Requested · ተጠይቋል', s: 'Waiting for the technician (5-minute window)' },
  { key: 'ACCEPTED', t: 'Accepted · ተቀብሏል', s: 'The technician confirmed your job' },
  { key: 'EN_ROUTE', t: 'En route · በመንገድ ላይ', s: 'On the way to your pin' },
  { key: 'ARRIVED', t: 'Arrived · ደርሷል', s: 'At your location' },
  { key: 'IN_PROGRESS', t: 'In progress · በስራ ላይ', s: 'Work underway' },
  { key: 'COMPLETED', t: 'Completed · ተጠናቋል', s: 'Awaiting payment' },
  { key: 'PAID', t: 'Paid · ተከፍሏል', s: 'Receipt issued - thank you!' },
];
