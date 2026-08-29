/**
 * Initial base service price list - verbatim from the official
 * "Addis Tiggena - Initial Base Service Price List" document.
 *
 * Rates are standard price ranges (inspection + base labor) in ETB and act as
 * a fair reference for clients and technicians. Payments go directly to the
 * technician; spare parts / materials are recommended to be purchased by the
 * client. The platform fee is what the technician owes the platform per job.
 */

export interface PriceItem {
  name: string;
  nameAm: string;
  scope: string;
  scopeAm: string;
  min: number;
  max: number;
  platformFee: number;
}

export interface PriceGroup {
  title: string;
  titleAm: string;
  items: PriceItem[];
}

export const PRICE_GROUPS: PriceGroup[] = [
  {
    title: 'Household Electrical & Appliance Repairs',
    titleAm: 'የቤት ውስጥ ኤሌክትሪክና የቤት እቃ ጥገና',
    items: [
      {
        name: 'Electric Mitad Repair',
        nameAm: 'የኤሌክትሪክ ምጣድ ጥገና',
        scope: 'Heating element, wiring, base plate, or thermostat fix',
        scopeAm: 'የማሞቂያ አካል፣ ሽቦ፣ የታችኛው ሳህን ወይም ቴርሞስታት ጥገና',
        min: 500, max: 800, platformFee: 70,
      },
      {
        name: 'Electric Stove / Oven Repair',
        nameAm: 'የኤሌክትሪክ ምድጃ / ኦቭን ጥገና',
        scope: 'Switch/coil replacement, wiring troubleshooting',
        scopeAm: 'ማብሪያ/ኮይል መተካት፣ የሽቦ ችግር መፍታት',
        min: 400, max: 700, platformFee: 56,
      },
      {
        name: 'Socket & Switch Repair / Fitting',
        nameAm: 'የሶኬትና ማብሪያ ማጥፊያ ጥገና / ተከላ',
        scope: 'Fixing faulty outlets, replacing damaged breakers/switches',
        scopeAm: 'የተበላሹ ሶኬቶች ጥገና፣ ብሬከር/ማብሪያ መተካት',
        min: 250, max: 450, platformFee: 35,
      },
      {
        name: 'General Circuit Trip / Power Troubleshooting',
        nameAm: 'አጠቃላይ የኤሌክትሪክ መቆራረጥ ምርመራ',
        scope: 'Diagnosing short circuits, main breaker trips across rooms',
        scopeAm: 'ሾርት ሰርኪትና የዋና ብሬከር መቆራረጥ መመርመር',
        min: 800, max: 1100, platformFee: 112,
      },
      {
        name: 'Light Fixture & Chandelier Installation',
        nameAm: 'የመብራትና ሻንደሊየር ተከላ',
        scope: 'Mounting ceiling lights, LED strips, or decorative lamps',
        scopeAm: 'የጣሪያ መብራቶች፣ LED እና ማስዋቢያ መብራቶች ተከላ',
        min: 600, max: 900, platformFee: 84,
      },
    ],
  },
  {
    title: 'Plumbing & Water Systems',
    titleAm: 'የቧንቧና የውሃ ስርዓቶች',
    items: [
      {
        name: 'Faucet / Tap Repair & Replacement',
        nameAm: 'የቧንቧ ራስ ጥገናና መተካት',
        scope: 'Fixing leaks, replacing worn valves or kitchen/bathroom taps',
        scopeAm: 'ፍሳሽ ማስቆም፣ ያረጁ ቫልቮችና ቧንቧዎች መተካት',
        min: 550, max: 750, platformFee: 77,
      },
      {
        name: 'Pipe Leakage Repair',
        nameAm: 'የቧንቧ ፍሳሽ ጥገና',
        scope: 'Sealing or replacing damaged PVC/metal pipes',
        scopeAm: 'የተበላሹ ፒቪሲ/ብረት ቧንቧዎች መድፈን ወይም መተካት',
        min: 1100, max: 1500, platformFee: 154,
      },
      {
        name: 'Toilet & Sink Unclogging / Repair',
        nameAm: 'የሽንት ቤትና ገንዳ መክፈት / ጥገና',
        scope: 'Clearing drainage blockages, flush mechanism fixes',
        scopeAm: 'የፍሳሽ መዘጋት ማጽዳት፣ የፍላሽ ስርዓት ጥገና',
        min: 950, max: 1100, platformFee: 133,
      },
      {
        name: 'Water Tank & Pump Maintenance',
        nameAm: 'የውሃ ታንከርና ፓምፕ ጥገና',
        scope: 'Pressure switch adjustment, pump motor troubleshooting',
        scopeAm: 'የግፊት መቆጣጠሪያ ማስተካከል፣ የፓምፕ ሞተር ምርመራ',
        min: 1250, max: 1850, platformFee: 175,
      },
      {
        name: 'Water Heater (Boiler) Repair',
        nameAm: 'የውሃ ማሞቂያ (ቦይለር) ጥገና',
        scope: 'Heating element check, thermostat & pressure valve fix',
        scopeAm: 'የማሞቂያ አካል ምርመራ፣ ቴርሞስታትና የግፊት ቫልቭ ጥገና',
        min: 850, max: 1250, platformFee: 119,
      },
    ],
  },
  {
    title: 'Content Creator, Office & Electronics Setup',
    titleAm: 'የኮንተንት ክሪኤተር፣ ቢሮና ኤሌክትሮኒክስ ዝግጅት',
    items: [
      {
        name: 'Wi-Fi Router & Network Socket Fix',
        nameAm: 'የዋይ-ፋይ ራውተርና ኔትወርክ ሶኬት ጥገና',
        scope: 'Cable crimping, port repairs, signal/outlet extensions',
        scopeAm: 'ኬብል ማገጣጠም፣ የፖርት ጥገና፣ የሲግናል ማራዘሚያ',
        min: 400, max: 600, platformFee: 56,
      },
      {
        name: 'Studio & Lighting Setup Fix',
        nameAm: 'የስቱዲዮና የመብራት ዝግጅት ጥገና',
        scope: 'Ring light, softbox wiring, dedicated streamer socket setup',
        scopeAm: 'ሪንግ ላይት፣ ሶፍትቦክስ ሽቦና የስትሪመር ሶኬት ዝግጅት',
        min: 600, max: 800, platformFee: 84,
      },
      {
        name: 'PC & Workstation Power Stabilization',
        nameAm: 'የኮምፒውተር ኃይል ማረጋጊያ ዝግጅት',
        scope: 'UPS check, surge protector setup, dedicated power line',
        scopeAm: 'የUPS ምርመራ፣ ሰርጅ ፕሮቴክተር ተከላ፣ የተለየ የኃይል መስመር',
        min: 800, max: 1100, platformFee: 112,
      },
    ],
  },
  {
    title: 'General Building & Minor Carpentry Maintenance',
    titleAm: 'አጠቃላይ የህንፃና ቀላል የአናጢነት ጥገና',
    items: [
      {
        name: 'Door Lock Repair & Installation',
        nameAm: 'የበር ቁልፍ ጥገናና ተከላ',
        scope: 'Lock cylinder replacement, handle adjustments',
        scopeAm: 'የቁልፍ ሲሊንደር መተካት፣ እጀታ ማስተካከል',
        min: 400, max: 800, platformFee: 56,
      },
      {
        name: 'Cabinet & Hinge Maintenance',
        nameAm: 'የቁም ሳጥንና ማጠፊያ ጥገና',
        scope: 'Kitchen cabinet alignment, drawer slide fixes',
        scopeAm: 'የወጥ ቤት ካቢኔ ማስተካከል፣ የመሳቢያ ጥገና',
        min: 450, max: 950, platformFee: 63,
      },
      {
        name: 'Minor Wall Drilling & Mounting',
        nameAm: 'ቀላል የግድግዳ ቁፋሮና ተከላ',
        scope: 'TV wall mounting, shelf alignment, curtain rod setup',
        scopeAm: 'የቲቪ ግድግዳ ተከላ፣ መደርደሪያ ማስተካከል፣ የመጋረጃ ዘንግ ተከላ',
        min: 350, max: 750, platformFee: 49,
      },
    ],
  },
];

/** Which published rate table belongs to which service category (by slug).
 *  Trades with no published table yet quote on inspection at the category
 *  base rate. */
export const RATE_GROUP_BY_SLUG: Record<string, number> = {
  electrical: 0,
  appliances: 0,
  plumbing: 1,
  'it-office': 2,
  electronics: 2,
  carpentry: 3,
  general: 3,
};

export const rateGroupFor = (slug: string): PriceGroup | null => {
  const i = RATE_GROUP_BY_SLUG[slug];
  return i === undefined ? null : PRICE_GROUPS[i];
};

/** Applies only if the technician arrives and diagnoses, but the client
 *  chooses not to proceed with the repair at that time. */
export const DIAGNOSTIC = {
  name: 'Diagnostic / On-Site Inspection Fee',
  nameAm: 'የምርመራ / የቦታ ላይ ፍተሻ ክፍያ',
  min: 250,
  max: 350,
};

export const fmtRange = (i: { min: number; max: number }) =>
  `${i.min.toLocaleString()} - ${i.max.toLocaleString()} ETB`;

/** A short "popular services" cut used on the home page. */
export const POPULAR: PriceItem[] = [
  PRICE_GROUPS[0].items[0], // Mitad repair - the origin story service
  PRICE_GROUPS[1].items[0], // Faucet / tap repair
  PRICE_GROUPS[0].items[2], // Socket & switch
  PRICE_GROUPS[2].items[0], // Wi-Fi router fix
  PRICE_GROUPS[3].items[0], // Door lock
  PRICE_GROUPS[1].items[2], // Toilet & sink unclogging
];
