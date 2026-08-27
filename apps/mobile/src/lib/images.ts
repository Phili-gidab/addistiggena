/**
 * Photography manifest (Unsplash, free license) - mirrors apps/web/lib/images.ts
 * so the app and the site share one visual language. Remote URLs; RN caches them.
 */

const u = (id: string, w = 640) =>
  `https://images.unsplash.com/${id}?q=75&w=${w}&auto=format&fit=crop`;

/** Per-trade photography, keyed by category slug. */
export const TRADE_IMG: Record<string, string> = {
  electrical: u('photo-1621905251189-08b45d6a269e', 480),
  plumbing: u('photo-1607472586893-edb57bdc0e39', 480),
  electronics: u('photo-1518770660439-4636190af475', 480),
  'it-office': u('photo-1517430816045-df4b7de11d1d', 480),
  appliances: u('photo-1556911220-bff31c812dba', 480),
  'gas-heating': u('photo-1581092918056-0c4c3acd3789', 480),
  carpentry: u('photo-1589939705384-5185137a7f0f', 480),
  painting: u('photo-1562259949-e8e7689d7828', 480),
  general: u('photo-1581578731548-c64695cc6952', 480),
  outdoor: u('photo-1416879595882-3373a0480b5b', 480),
  automotive: u('photo-1487754180451-c456f719a1fc', 480),
};

export const FALLBACK_IMG = u('photo-1504307651254-35680f356dfd', 480);

export const tradeImg = (slug: string) => TRADE_IMG[slug] ?? FALLBACK_IMG;

/** Promo slide backdrops. */
export const SLIDE_VERIFIED_IMG = u('photo-1621905251189-08b45d6a269e', 900); // electrician at panel
export const SLIDE_GUARANTEE_IMG = u('photo-1581578731548-c64695cc6952', 900); // handyman at work
export const SLIDE_PRO_IMG = u('photo-1589939705384-5185137a7f0f', 900); // carpenter

/** Texture behind the navy trust band. */
export const BAND_IMG = u('photo-1504307651254-35680f356dfd', 1200);
