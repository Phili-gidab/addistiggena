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
