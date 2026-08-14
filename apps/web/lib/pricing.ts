/**
 * Initial base service price list — verbatim from the official
 * "Addis Tiggena — Initial Base Service Price List" document.
 *
 * Rates are standard price ranges (inspection + base labor) in ETB and act as
 * a fair reference for clients and technicians. Payments go directly to the
 * technician; spare parts / materials are recommended to be purchased by the
 * client. The platform fee is what the technician owes the platform per job.
 */

export interface PriceItem {
  name: string;
  scope: string;
  min: number;
  max: number;
  platformFee: number;
}

export interface PriceGroup {
  title: string;
  items: PriceItem[];
}

export const PRICE_GROUPS: PriceGroup[] = [
  {
    title: 'Household Electrical & Appliance Repairs',
    items: [
      { name: 'Electric Mitad Repair', scope: 'Heating element, wiring, base plate, or thermostat fix', min: 500, max: 800, platformFee: 70 },
      { name: 'Electric Stove / Oven Repair', scope: 'Switch/coil replacement, wiring troubleshooting', min: 400, max: 700, platformFee: 56 },
      { name: 'Socket & Switch Repair / Fitting', scope: 'Fixing faulty outlets, replacing damaged breakers/switches', min: 250, max: 450, platformFee: 35 },
      { name: 'General Circuit Trip / Power Troubleshooting', scope: 'Diagnosing short circuits, main breaker trips across rooms', min: 800, max: 1100, platformFee: 112 },
      { name: 'Light Fixture & Chandelier Installation', scope: 'Mounting ceiling lights, LED strips, or decorative lamps', min: 600, max: 900, platformFee: 84 },
    ],
  },
  {
    title: 'Plumbing & Water Systems',
    items: [
      { name: 'Faucet / Tap Repair & Replacement', scope: 'Fixing leaks, replacing worn valves or kitchen/bathroom taps', min: 550, max: 750, platformFee: 77 },
      { name: 'Pipe Leakage Repair', scope: 'Sealing or replacing damaged PVC/metal pipes', min: 1100, max: 1500, platformFee: 154 },
      { name: 'Toilet & Sink Unclogging / Repair', scope: 'Clearing drainage blockages, flush mechanism fixes', min: 950, max: 1100, platformFee: 133 },
      { name: 'Water Tank & Pump Maintenance', scope: 'Pressure switch adjustment, pump motor troubleshooting', min: 1250, max: 1850, platformFee: 175 },
      { name: 'Water Heater (Boiler) Repair', scope: 'Heating element check, thermostat & pressure valve fix', min: 850, max: 1250, platformFee: 119 },
    ],
  },
  {
    title: 'Content Creator, Office & Electronics Setup',
    items: [
      { name: 'Wi-Fi Router & Network Socket Fix', scope: 'Cable crimping, port repairs, signal/outlet extensions', min: 400, max: 600, platformFee: 56 },
      { name: 'Studio & Lighting Setup Fix', scope: 'Ring light, softbox wiring, dedicated streamer socket setup', min: 600, max: 800, platformFee: 84 },
      { name: 'PC & Workstation Power Stabilization', scope: 'UPS check, surge protector setup, dedicated power line', min: 800, max: 1100, platformFee: 112 },
    ],
  },
  {
    title: 'General Building & Minor Carpentry Maintenance',
    items: [
      { name: 'Door Lock Repair & Installation', scope: 'Lock cylinder replacement, handle adjustments', min: 400, max: 800, platformFee: 56 },
      { name: 'Cabinet & Hinge Maintenance', scope: 'Kitchen cabinet alignment, drawer slide fixes', min: 450, max: 950, platformFee: 63 },
      { name: 'Minor Wall Drilling & Mounting', scope: 'TV wall mounting, shelf alignment, curtain rod setup', min: 350, max: 750, platformFee: 49 },
    ],
  },
];

/** Applies only if the technician arrives and diagnoses, but the client
 *  chooses not to proceed with the repair at that time. */
export const DIAGNOSTIC = { name: 'Diagnostic / On-Site Inspection Fee', min: 250, max: 350 };

export const fmtRange = (i: { min: number; max: number }) =>
  `${i.min.toLocaleString()} – ${i.max.toLocaleString()} ETB`;

/** A short "popular services" cut used on the home page. */
export const POPULAR: PriceItem[] = [
  PRICE_GROUPS[0].items[0], // Mitad repair — the origin story service
  PRICE_GROUPS[1].items[0], // Faucet / tap repair
  PRICE_GROUPS[0].items[2], // Socket & switch
  PRICE_GROUPS[2].items[0], // Wi-Fi router fix
  PRICE_GROUPS[3].items[0], // Door lock
  PRICE_GROUPS[1].items[2], // Toilet & sink unclogging
];
