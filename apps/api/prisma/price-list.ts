/**
 * The company's official service and price list ("latest service and price",
 * received 2026-09-18). Transcribed line for line: category order, item order,
 * English and Amharic names, and the ETB range for each.
 *
 * `sqm: true` marks items the document prices per square metre (በካሬ) rather
 * than per job.
 *
 * This file is the only place prices are written down. The seed loads it into
 * the ServicePrice table, and every screen that shows a price - the web price
 * list, the service pages, the home page, the mobile app - reads it back from
 * the API. When a new price list arrives, edit this file and re-run the seed.
 *
 * Two corrections to the source, both obvious typos: "ኦቭን ጠገና" -> "ኦቭን ጥገና",
 * and a missing closing bracket on the electric stove line.
 */

export interface PriceLine {
  en: string;
  am: string;
  min: number;
  max: number;
  sqm?: boolean;
}

export interface PriceCategory {
  /** matches ServiceCategory.slug */
  slug: string;
  items: PriceLine[];
}

export const PRICE_LIST: PriceCategory[] = [
  // 1 · Electrical Installation, Fitting and Repair · የኤሌክትሪክ ዝርጋታ፣ ገጠማ እና ጥገና
  {
    slug: 'electrical',
    items: [
      { en: 'Wire installation and repair', am: 'ኤሌክትሪክ ገመድ ዝርጋታና ጥገና', min: 600, max: 800 },
      { en: 'Socket & switch fixing', am: 'ሶኬትና ማብሪያ ማጥፊያ ገጠማና ጥገና', min: 300, max: 450 },
      { en: 'Breakers and distribution boards', am: 'ብሬከርና ማከፋፈያ ተከላና ጥገና', min: 800, max: 1100 },
    ],
  },

  // 2 · Kitchen & Domestic Appliances · የኪችን እና የቤት ውስጥ መገልገያ ዕቃዎች
  {
    slug: 'appliances',
    items: [
      { en: 'Injera mitad electrical problem', am: 'የእንጀራ ምጣድ የኤሌክትሪክ ችግር', min: 800, max: 1000 },
      { en: 'Injera mitad clay plate', am: 'የምጣድ ሸክላ ብልሽት', min: 1300, max: 1600 },
      { en: 'Bread mitad', am: 'የዳቦ ምጣድ', min: 800, max: 1000 },
      { en: 'Refrigerator electrical repair', am: 'የፍሪጅ ኤሌክትሪካል ጥገና', min: 600, max: 800 },
      { en: 'Refrigerator mechanical', am: 'የፍሪጅ መካኒካል ብልሽት', min: 1800, max: 2500 },
      { en: 'Refrigerator gas refill', am: 'የፍሪጅ ጋዝ መቀየር', min: 2300, max: 2500 },
      { en: 'Electric stove', am: 'የኤሌክትሪክ ስቶቭ ጥገና', min: 500, max: 800 },
      { en: 'Oven repair', am: 'ኦቭን ጥገና', min: 500, max: 800 },
      { en: 'Washing machine repair', am: 'የልብስ ማጠቢያ ማሽን ጥገና', min: 800, max: 1000 },
      { en: 'Microwave repair', am: 'የማይክሮዌቭ ጥገና', min: 600, max: 900 },
      { en: 'Water heater repair', am: 'የውሀ ማሞቂያዎች ጥገና', min: 500, max: 700 },
      { en: 'Coffee machine & water boiler repair', am: 'የቡና ማሽንና ውሀ ማፍያዎች ጥገና', min: 700, max: 1000 },
      { en: 'Grinder & grinding machine repair', am: 'የተለያዩ መፍጫዎች ጥገና', min: 500, max: 800 },
      { en: 'Heavy bakery machine', am: 'ትልቅ የዳቦ ማሽን ጥገና', min: 3500, max: 5000 },
    ],
  },

  // 3 · Plumbing & Sanitary Repair Services · የቧንቧ እና ፍሳሽ ማስወገጃ አገልግሎት
  // (the document files sofa and carpet cleaning under this section)
  {
    slug: 'plumbing',
    items: [
      { en: 'Toilet flush', am: 'የሽንትቤት ውሃ መልቀቂያ', min: 800, max: 1000 },
      { en: 'Toilet spray', am: 'የሽንትቤት ውሃ መርጫ', min: 500, max: 800 },
      { en: 'Toilet seat maintenance', am: 'የሽንት ቤት መቀመጫ', min: 1500, max: 2000 },
      { en: 'Toilet flush tank leakage', am: 'የሽንት ቤት ውሃ ታንከር', min: 1000, max: 1300 },
      { en: 'Toilet pot blockage', am: 'የሽንትቤት ጋን መዘጋት', min: 1200, max: 1500 },
      { en: 'Tap and mixer of hand washes', am: 'የእጅ መታጠቢያ መክፈቻ እና መዝጊያ', min: 500, max: 700 },
      { en: 'Tap and mixer of shower', am: 'የሻወር መክፈቻ እና መዝጊያ', min: 500, max: 700 },
      { en: 'Water pipe and connections', am: 'የውሃ መስመር እና መገጣጠሚያ', min: 900, max: 1100 },
      { en: 'Toilet drainage pipes', am: 'የሽንትቤት ፍሳሽ መውረጃ እና መገጣጠሚያ', min: 900, max: 1100 },
      { en: 'Kitchen drainage system installation and repair', am: 'የኪችን ፍሳሽ ተከላና ጥገና', min: 700, max: 900 },
      { en: 'Water tank & pump maintenance', am: 'የውሀ ማጠራቀሚ እና መሳቢያ', min: 1200, max: 1500 },
      { en: 'Sofa cleaning', am: 'የሶፋ እጥበት', min: 3000, max: 5000 },
      { en: 'Carpet cleaning', am: 'የምንጣፍ እጥበት', min: 250, max: 300, sqm: true },
    ],
  },

  // 4 · Electronics & Entertainment Systems · ኤሌክትሮኒክስና መዝናኛ ዕቃዎች
  {
    slug: 'electronics',
    items: [
      { en: 'TV installation', am: 'ቴሌቪዥን ገጠማ', min: 800, max: 1000 },
      { en: 'TV uninstallation', am: 'ቴሌቭዥን ነቀላ', min: 500, max: 700 },
      { en: 'TV maintenance', am: 'ቴሌቭዥን ጥገና', min: 1200, max: 1500 },
      { en: 'Installing satellite dishes', am: 'ዲሽ መግጠም', min: 500, max: 800 },
      { en: 'Sound system installation', am: 'የድምጽ ሲስተም ተከላ', min: 2500, max: 5000 },
      { en: 'Basic mobile phone maintenance', am: 'መሰረታዊ የሞባይል ጥገና', min: 500, max: 1000 },
    ],
  },

  // 5 · IT & Office Equipment Support · የአይቲ እና የቢሮ ዕቃዎች አገልግሎት
  {
    slug: 'it-office',
    items: [
      { en: 'Computer repair', am: 'የኮምፒውተር ጥገና', min: 1200, max: 1400 },
      { en: 'Printer maintenance', am: 'የፕሪንተር ጥገና', min: 1000, max: 1200 },
      { en: 'Photocopier maintenance', am: 'ፎቶ ኮፒ ማሽኖች ጥገና', min: 1000, max: 1200 },
      { en: 'Network installation and fixation', am: 'የኔትወርክ ዝርጋታ እና ጥገና', min: 2000, max: 2500 },
      { en: 'Software configuration', am: 'ሶፍትዌር መጫን', min: 800, max: 1000 },
      { en: 'PC and workstation power works', am: 'የኮምፒውተር ሃይል ዝርጋታ ስራዎች', min: 800, max: 1100 },
    ],
  },

  // 6 · Gas & Heating Systems Repair Services · በጋዝ የሚሰሩ ዕቃዎች ገጠማና ጥገና አገልግሎት
  {
    slug: 'gas-heating',
    items: [
      { en: 'Gas stove installation & repair', am: 'የጋዝ ስቶቭ ገጠማና ጥገና', min: 300, max: 500 },
      { en: 'Gas cylinder installation & servicing', am: 'የሲሊንደር ገጠማና እድሳት', min: 500, max: 700 },
      { en: 'Gas leak detection & safety inspection', am: 'የጋዝ ፍሰት ደህንነት ቁጥጥር', min: 350, max: 550 },
    ],
  },

  // 7 · Carpentry & Fixtures Repair · የአናጢነት እና የእንጨት ስራ ጥገና
  {
    slug: 'carpentry',
    items: [
      { en: 'Door lock installation and repair', am: 'የበር ቁልፍ ገጠማና ጥገና', min: 600, max: 800 },
      { en: 'Kitchen cabinet fix', am: 'የኪችን ካቢኔት ጥገና', min: 600, max: 900 },
      { en: 'Closet repair', am: 'ቁም ሳጥን መግጠም እና መጠገን', min: 2000, max: 2500 },
      { en: 'Drawer & shelf repair', am: 'የመሳቢያዎችና ሼልፎች ጥገና', min: 600, max: 900 },
      { en: 'Glass wall and mirror installation', am: 'የመስታወት ተከላና ገጠማ', min: 600, max: 800 },
      { en: 'Full sofa maintenance', am: 'ሙሉ ሶፋ ጥገና', min: 2000, max: 3000 },
      { en: 'Single sofa maintenance', am: 'ነጠላ ሶፋ ጥገና', min: 750, max: 1000 },
      { en: 'TV stand installation & repair', am: 'የቴሌቪዥን ማስቀመጫ ስራና ጥገና', min: 500, max: 800 },
      { en: 'Table repair', am: 'የጠረጴዛ ጥገና', min: 250, max: 350 },
      { en: 'Chair repair', am: 'ወንበር ጥገና', min: 150, max: 250 },
      { en: 'Bed repair and adjustments', am: 'አልጋ መጠገን እና ማስተካከል', min: 500, max: 700 },
      { en: 'Wood interiors', am: 'በእንጨት የማስዋብ ስራ', min: 1200, max: 1400, sqm: true },
    ],
  },

  // 8 · Painting & Finishing · የቀለምና ስነ-ውበት ስራዎች (all per m²)
  {
    slug: 'painting',
    items: [
      { en: 'Interior and exterior painting', am: 'የውስጥና የውጭ ቀለም ስራ', min: 400, max: 500, sqm: true },
      { en: 'Wall crack repairs', am: 'የተሰነጠቀ ግድግዳ ጥገና', min: 700, max: 900, sqm: true },
      { en: 'Water proofing and plastering services', am: 'የግድግዳ ፍሳሽ መከላከያ ስራዎች', min: 600, max: 700, sqm: true },
      { en: 'Curtain installation services', am: 'የመጋረጃ ስራዎች', min: 400, max: 500, sqm: true },
    ],
  },

  // 9 · Outdoor & Compound Maintenance Services · የቤት ውጫዊ እና ጊቢ አገልግሎት
  {
    slug: 'outdoor',
    items: [
      { en: 'Water tank cleaning services', am: 'የውሀ ማጠራቀሚያ ታንከር ጽዳት', min: 800, max: 1000 },
      { en: 'Outdoor gate & fence repair', am: 'የውጭ በርና አጥር ጥገና', min: 1000, max: 1200 },
      { en: 'Outdoor lighting installation & repair', am: 'የውጭ መብራት ገጠማና ጥገና', min: 500, max: 600 },
      { en: 'Drainage & sewerage repair services', am: 'የፍሳሽ ማስወገጃ ጥገና', min: 700, max: 800 },
    ],
  },

  // 10 · Light Automotive Assistance · ቀላል የመኪና ጥገና
  {
    slug: 'automotive',
    items: [
      { en: 'Tire change & replacement', am: 'ጎማ መቀየር', min: 300, max: 500 },
      { en: 'Tire air filling', am: 'ጎማ ነፋስ መሙላት', min: 400, max: 600 },
      { en: 'Vehicle battery jump-start', am: 'ባትሪ በጃምፐር ማስነሳት', min: 300, max: 500 },
      { en: 'Car oil change', am: 'የመኪና ዘይት መቀየር', min: 500, max: 700 },
    ],
  },

  // 11 · Apparel & Clothing Services · የጨርቃጨርቅ ማስተካከል ስራዎች
  {
    slug: 'apparel',
    items: [
      { en: 'Clothes size fitting & resizing', am: 'መደበኛ ልብስ ማስተካከል', min: 250, max: 450 },
      { en: 'Suit and jacket fitting', am: 'ሱፍ እና ጃኬት ማስተካከል', min: 800, max: 1000 },
      { en: 'Zipper replacement & repair', am: 'ዚፕ መቀየር እና ማስተካከል', min: 200, max: 300 },
      { en: 'Mattress & cushion renewal', am: 'ፍራሽ ማደስ', min: 600, max: 900 },
    ],
  },
];
