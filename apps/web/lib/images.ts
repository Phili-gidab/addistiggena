/**
 * Photography manifest (Unsplash, free license). Every photo renders behind a
 * navy wash with mix-blend-mode: luminosity, so imagery stays on-brand - the
 * blue/navy grade comes from the plate, not the photo.
 */

const u = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?q=75&w=${w}&auto=format&fit=crop`;

/** Per-trade hover photography, keyed by category slug. */
export const TRADE_IMG: Record<string, string> = {
  electrical: u('photo-1621905251189-08b45d6a269e', 640),
  plumbing: u('photo-1607472586893-edb57bdc0e39', 640),
  electronics: u('photo-1518770660439-4636190af475', 640),
  'it-office': u('photo-1517430816045-df4b7de11d1d', 640),
  appliances: u('photo-1556911220-bff31c812dba', 640),
  'gas-heating': u('photo-1581092918056-0c4c3acd3789', 640),
  carpentry: u('photo-1589939705384-5185137a7f0f', 640),
  painting: u('photo-1562259949-e8e7689d7828', 640),
  general: u('photo-1581578731548-c64695cc6952', 640),
  outdoor: u('photo-1416879595882-3373a0480b5b', 640),
  automotive: u('photo-1487754180451-c456f719a1fc', 640),
};

export const FALLBACK_IMG = u('photo-1504307651254-35680f356dfd', 640);

export const tradeImg = (slug: string) => TRADE_IMG[slug] ?? FALLBACK_IMG;

/** Feature plates */
export const HERO_IMG = u('photo-1621905251189-08b45d6a269e', 1000);
export const BAND_IMG = u('photo-1504307651254-35680f356dfd', 1800);
export const STORY_IMG = u('photo-1466637574441-749b8f19452f', 1000);
export const PRO_IMG = u('photo-1589939705384-5185137a7f0f', 1100);
