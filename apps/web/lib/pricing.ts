/**
 * Price display helpers. The prices themselves live in the database (loaded
 * from the company's official price list) and arrive with each category from
 * GET /catalog/categories - nothing in the web app hard-codes a range.
 *
 * Rates are standard ranges (inspection + base labor) in ETB: a fair reference
 * for clients and technicians. Payment goes directly to the technician; spare
 * parts and materials are recommended to be bought by the client.
 */

import type { Category, PriceLine } from './api';

/** Applies only if the technician arrives and diagnoses, but the client
 *  chooses not to proceed with the repair at that time. */
export const DIAGNOSTIC = {
  name: 'Diagnostic / On-Site Inspection Fee',
  nameAm: 'የምርመራ / የቦታ ላይ ፍተሻ ክፍያ',
  min: 250,
  max: 350,
};

/** "600 - 800 ETB" for a plain range (used by the diagnostic fee). */
export const fmtRange = (i: { min: number; max: number }) =>
  `${i.min.toLocaleString()} - ${i.max.toLocaleString()} ETB`;

/** "600 - 800 ETB", or "400 - 500 ETB / m²" for work priced by area. */
export const fmtPrice = (p: PriceLine) =>
  `${fmtRange({ min: p.minEtb, max: p.maxEtb })}${p.unit === 'SQM' ? ' / m²' : ''}`;

/** A category priced entirely by area (painting) quotes its floor per m². */
export const floorUnit = (c: Category) =>
  c.prices?.length && c.prices.every((p) => p.unit === 'SQM') ? ' / m²' : '';

/**
 * Everyday jobs featured on the home page. Named by category and line item so
 * the price is always the live one; a line that no longer exists in the price
 * list is simply skipped rather than shown with a stale figure.
 */
const POPULAR_PICKS: [slug: string, item: string][] = [
  ['appliances', 'Injera mitad electrical problem'], // the service the company started with
  ['plumbing', 'Tap and mixer of hand washes'],
  ['electrical', 'Socket & switch fixing'],
  ['it-office', 'Computer repair'],
  ['carpentry', 'Door lock installation and repair'],
  ['plumbing', 'Toilet pot blockage'],
];

export interface PopularItem extends PriceLine {
  category: Category;
}

export function popularFrom(categories: Category[]): PopularItem[] {
  const out: PopularItem[] = [];
  for (const [slug, item] of POPULAR_PICKS) {
    const category = categories.find((c) => c.slug === slug);
    const line = category?.prices?.find((p) => p.nameEn === item);
    if (category && line) out.push({ ...line, category });
  }
  return out;
}
