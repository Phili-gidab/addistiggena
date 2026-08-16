/**
 * Service catalog details - from the official "Service Catalog and description
 * for each service" document (11 categories + service packages). Keyed by the
 * category slug used in the API seed.
 */

export interface CatalogEntry {
  slug: string;
  icon: string;
  scope: string;
  services: string[];
}

export const CATALOG: CatalogEntry[] = [
  {
    slug: 'electrical',
    icon: '⚡',
    scope: 'Installation, repair, and maintenance of electrical systems and appliances.',
    services: [
      'House wiring installation and repair',
      'Circuit breakers and distribution boards',
      'Switches, sockets, and lighting systems',
      'Installation of chandeliers and LED fixtures',
      'Electrical fault diagnosis',
      'Appliance support: refrigerators, electric stoves and ovens, washing machines, water heaters',
    ],
  },
  {
    slug: 'plumbing',
    icon: '🚰',
    scope: 'Water systems, sanitation, and drainage.',
    services: [
      'Installation and repair of water pipes',
      'Leak detection and fixing',
      'Shower and faucet installation',
      'Toilet (flush system) maintenance',
      'Sink and basin repairs',
      'Drain and blockage clearing',
    ],
  },
  {
    slug: 'electronics',
    icon: '📺',
    scope: 'Home electronics and signal systems.',
    services: [
      'TV installation and repair',
      'Satellite dish and antenna setup',
      'Decoder installation and channel configuration',
      'Audio system setup',
      'Basic mobile phone troubleshooting',
    ],
  },
  {
    slug: 'it-office',
    icon: '💻',
    scope: 'Home office and digital infrastructure.',
    services: [
      'Computer (desktop/laptop) repair',
      'Printer and photocopier maintenance',
      'Wi-Fi setup and router configuration',
      'Software installation and troubleshooting',
    ],
  },
  {
    slug: 'appliances',
    icon: '🍳',
    scope: 'Installation and servicing of household appliances.',
    services: [
      'Refrigerator servicing',
      'Oven and stove repair (electric/gas)',
      'Water dispensers and boilers',
      'Coffee machines and kettles',
      'Small appliance repair (blenders, mixers)',
    ],
  },
  {
    slug: 'gas-heating',
    icon: '🔥',
    scope: 'Safe handling and maintenance of gas-based systems.',
    services: [
      'Gas stove installation and repair',
      'Cylinder and regulator setup',
      'Gas leak inspection and safety checks',
    ],
  },
  {
    slug: 'carpentry',
    icon: '🪚',
    scope: 'Structural and furniture-related repairs.',
    services: [
      'Door and lock repair',
      'Window and frame maintenance',
      'Cabinet and wardrobe fixing',
      'Furniture repair and adjustments',
    ],
  },
  {
    slug: 'painting',
    icon: '🎨',
    scope: 'Aesthetic and surface maintenance.',
    services: [
      'Interior and exterior painting',
      'Wall crack repairs',
      'Ceiling maintenance',
      'Minor plastering',
    ],
  },
  {
    slug: 'general',
    icon: '🧰',
    scope: 'Small but essential household tasks.',
    services: [
      'TV mounting and wall installations',
      'Curtain and blind installation',
      'Mirror and frame fixing',
      'Furniture assembly',
      'Minor drilling and adjustments',
    ],
  },
  {
    slug: 'outdoor',
    icon: '🏡',
    scope: 'External household environment.',
    services: [
      'Water tank cleaning',
      'Gate and fence repair',
      'Outdoor lighting installation',
      'Drainage cleaning',
    ],
  },
  {
    slug: 'automotive',
    icon: '🚗',
    scope: 'Basic household vehicle support.',
    services: ['Tyre air pumping', 'Battery jump-start', 'Basic vehicle checks'],
  },
];

export const catalogBySlug = (slug: string): CatalogEntry | undefined =>
  CATALOG.find((c) => c.slug === slug);

export const iconFor = (slug: string): string => catalogBySlug(slug)?.icon ?? '🔧';

/** Service packages - section 2 of the catalog document. */
export const PACKAGES = [
  {
    name: 'Basic Service',
    points: ['On-demand maintenance', 'Standard response time', 'Pay-per-service model'],
  },
  {
    name: 'Premium Service',
    points: [
      'Priority response',
      'Scheduled maintenance visits',
      'Discounted service rates',
      'Dedicated support line',
    ],
  },
  {
    name: 'Annual Maintenance Package (AMP)',
    points: [
      'Regular home inspection',
      'Preventive maintenance',
      'Appliance servicing schedule',
      'Cost savings over time',
    ],
  },
  {
    name: 'Emergency Service',
    points: ['Rapid response for urgent cases', 'Premium pricing applies'],
  },
];
