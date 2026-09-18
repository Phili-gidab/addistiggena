/** Category icons + Addis sub-cities - mirrors the web lib. */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Category, PriceLine } from './api';

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
  apparel: 'tshirt-crew-outline',
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

/**
 * Everyday jobs featured on the home screen - the same picks as the website.
 * Named by category and line item only: the price is looked up in the live
 * price list, so the app never ships a stale figure, and a line the list has
 * dropped is simply skipped.
 */
const POPULAR_PICKS: [slug: string, item: string][] = [
  ['appliances', 'Injera mitad electrical problem'],
  ['plumbing', 'Tap and mixer of hand washes'],
  ['electrical', 'Socket & switch fixing'],
  ['it-office', 'Computer repair'],
  ['carpentry', 'Door lock installation and repair'],
  ['plumbing', 'Toilet pot blockage'],
];

export function popularFrom(categories: Category[]): (PriceLine & { category: Category })[] {
  const out: (PriceLine & { category: Category })[] = [];
  for (const [slug, item] of POPULAR_PICKS) {
    const category = categories.find((c) => c.slug === slug);
    const line = category?.prices?.find((p) => p.nameEn === item);
    if (category && line) out.push({ ...line, category });
  }
  return out;
}

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
