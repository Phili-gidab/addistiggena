/** Category icon + Addis sub-cities - mirrors the web lib. */

const ICONS: Record<string, string> = {
  electrical: '⚡',
  plumbing: '🚰',
  electronics: '📺',
  'it-office': '🖥️',
  appliances: '🧊',
  'gas-heating': '🔥',
  carpentry: '🪚',
  painting: '🎨',
  general: '🧰',
  outdoor: '🌿',
  automotive: '🚗',
};

export const iconFor = (slug: string): string => ICONS[slug] ?? '🔧';

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
