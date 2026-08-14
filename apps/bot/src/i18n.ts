export type Lang = 'am' | 'en';

interface Entry {
  am: string;
  en: string;
}

const table = {
  welcome: {
    am: 'እንኳን ወደ አዲስ ጥገና በደህና መጡ!\nWelcome to Addis Tiggena!\n\nቋንቋ ይምረጡ / Choose a language:',
    en: 'እንኳን ወደ አዲስ ጥገና በደህና መጡ!\nWelcome to Addis Tiggena!\n\nቋንቋ ይምረጡ / Choose a language:',
  },
  chooseLang: {
    am: 'ቋንቋ ይምረጡ:',
    en: 'Choose a language:',
  },
  langSet: {
    am: '✅ ቋንቋዎ አማርኛ ሆኗል።',
    en: '✅ Language set to English.',
  },
  menuPrompt: {
    am: 'ምን እናድርግልዎ? ከታች ይምረጡ።',
    en: 'What would you like to do? Choose below.',
  },
  btnBook: {
    am: '📋 አገልግሎት ይዘዙ',
    en: '📋 Book a service',
  },
  btnBookings: {
    am: '🗂 ማስያዣዎቼ',
    en: '🗂 My bookings',
  },
  btnLang: {
    am: '🌐 ቋንቋ',
    en: '🌐 Language',
  },
  btnHelp: {
    am: '❓ እገዛ',
    en: '❓ Help',
  },
  btnShareContact: {
    am: '📱 ስልክ ቁጥሬን አጋራ',
    en: '📱 Share my phone number',
  },
  btnShareLocation: {
    am: '📍 ቦታዬን አጋራ',
    en: '📍 Share my location',
  },
  btnSkip: {
    am: 'ዝለል ⏭',
    en: 'Skip ⏭',
  },
  btnCancel: {
    am: '❌ ሰርዝ',
    en: '❌ Cancel',
  },
  btnConfirm: {
    am: '✅ አረጋግጥ',
    en: '✅ Confirm',
  },
  chooseCategory: {
    am: 'ምን አይነት አገልግሎት ይፈልጋሉ? ይምረጡ:',
    en: 'What service do you need? Pick one:',
  },
  priceFrom: {
    am: 'ከ ETB {x} ጀምሮ',
    en: 'from ETB {x}',
  },
  priceOnInspection: {
    am: 'ዋጋ በምርመራ ይወሰናል',
    en: 'price set after inspection',
  },
  categoryGone: {
    am: 'ይቅርታ፣ ያ አገልግሎት አልተገኘም። እባክዎ እንደገና ይምረጡ።',
    en: 'Sorry, that service was not found. Please pick again.',
  },
  categoriesUnavailable: {
    am: 'ይቅርታ፣ አገልግሎቶቹን ማምጣት አልተቻለም። እባክዎ ቆይተው ይሞክሩ።',
    en: 'Sorry, we could not load the services. Please try again later.',
  },
  askContact: {
    am: 'ትዕዛዝ ለመስጠት ስልክ ቁጥርዎ ያስፈልጋል። ከታች ያለውን አዝራር በመንካት ስልክዎን ያጋሩ።',
    en: 'To book we need your phone number. Tap the button below to share your contact.',
  },
  contactNotYours: {
    am: 'እባክዎ የራስዎን ስልክ ቁጥር ከታች ባለው አዝራር ያጋሩ።',
    en: 'Please share your own contact using the button below.',
  },
  linked: {
    am: '✅ ተሳክቷል! መለያዎ ተገናኝቷል።',
    en: '✅ Success! Your account is linked.',
  },
  linkFailed: {
    am: 'ይቅርታ፣ መለያዎን ማገናኘት አልተቻለም። ስልክ ቁጥርዎ የኢትዮጵያ (+251) መሆኑን ያረጋግጡ።',
    en: 'Sorry, we could not link your account. Make sure your phone number is Ethiopian (+251).',
  },
  askLocation: {
    am: 'አገልግሎቱ የሚፈለግበትን ቦታ ያጋሩ። ከታች ያለውን አዝራር ይንኩ ወይም በ 📎 ቦታ ያያይዙ።',
    en: 'Share the location where you need the service. Tap the button below or attach a location with 📎.',
  },
  askDescription: {
    am: 'ችግሩን በአጭሩ ይግለጹ (አማራጭ ነው)። ለመዝለል «ዝለል» ይንኩ።',
    en: 'Briefly describe the problem (optional). Tap "Skip" to continue without one.',
  },
  confirmTitle: {
    am: '🧾 ማጠቃለያ — እባክዎ ያረጋግጡ',
    en: '🧾 Summary — please confirm',
  },
  sumCategory: {
    am: 'አገልግሎት',
    en: 'Service',
  },
  sumPrice: {
    am: 'ዋጋ',
    en: 'Price',
  },
  sumLocation: {
    am: 'ቦታ',
    en: 'Location',
  },
  sumDescription: {
    am: 'መግለጫ',
    en: 'Description',
  },
  none: {
    am: '—',
    en: '—',
  },
  creating: {
    am: '⏳ ትዕዛዝዎን በመመዝገብ ላይ…',
    en: '⏳ Placing your booking…',
  },
  bookingCreated: {
    am: '✅ ትዕዛዝዎ ተመዝግቧል!\n\nመለያ ቁጥር: #{ref}\nሁኔታ: {status}\n\nሁሉም ዝመናዎች እዚሁ በቴሌግራም ይደርስዎታል።\nለክትትል እና ክፍያ: {link}',
    en: '✅ Your booking is placed!\n\nReference: #{ref}\nStatus: {status}\n\nAll updates will arrive right here in Telegram.\nTrack & pay: {link}',
  },
  bookingExpired: {
    am: '😔 ይቅርታ፣ በአካባቢዎ አሁን ነጻ ባለሙያ አልተገኘም። እባክዎ ትንሽ ቆይተው እንደገና ይሞክሩ።',
    en: '😔 Sorry, no technician is available near you right now. Please try again a little later.',
  },
  flowCancelled: {
    am: '❌ ሂደቱ ተሰርዟል።',
    en: '❌ Cancelled.',
  },
  nothingToCancel: {
    am: 'የሚሰረዝ ንቁ ሂደት የለም።',
    en: 'There is nothing to cancel.',
  },
  bookingsTitle: {
    am: '🗂 የቅርብ ጊዜ ማስያዣዎችዎ:',
    en: '🗂 Your recent bookings:',
  },
  noBookings: {
    am: 'እስካሁን ምንም ማስያዣ የለዎትም። ለመጀመር «📋 አገልግሎት ይዘዙ» ይንኩ።',
    en: 'You have no bookings yet. Tap "📋 Book a service" to get started.',
  },
  hintContact: {
    am: 'እባክዎ ከታች ያለውን «📱 ስልክ ቁጥሬን አጋራ» አዝራር ይንኩ፣ ወይም /cancel ይላኩ።',
    en: 'Please tap the "📱 Share my phone number" button below, or send /cancel.',
  },
  hintLocation: {
    am: 'እባክዎ ቦታዎን በአዝራሩ ወይም በ 📎 ያጋሩ፣ ወይም /cancel ይላኩ።',
    en: 'Please share your location with the button or via 📎, or send /cancel.',
  },
  hintConfirm: {
    am: 'እባክዎ ✅ አረጋግጥ ወይም ❌ ሰርዝ ይንኩ።',
    en: 'Please tap ✅ Confirm or ❌ Cancel.',
  },
  hintDescription: {
    am: 'እባክዎ ችግሩን በጽሑፍ ይግለጹ ወይም «ዝለል ⏭» ይንኩ፣ ወይም /cancel ይላኩ።',
    en: 'Please type a short description or tap "Skip ⏭", or send /cancel.',
  },
  hintBookFirst: {
    am: 'ለመጀመር መጀመሪያ «📋 አገልግሎት ይዘዙ» ይንኩ።\nTap "📋 Book a service" first to start a booking.',
    en: 'ለመጀመር መጀመሪያ «📋 አገልግሎት ይዘዙ» ይንኩ።\nTap "📋 Book a service" first to start a booking.',
  },
  privateOnly: {
    am: 'ይህ ቦት በግል ውይይት ብቻ ይሰራል። እባክዎ በቀጥታ መልዕክት ይላኩልኝ።\nThis bot works in private chat only — please message me directly.',
    en: 'ይህ ቦት በግል ውይይት ብቻ ይሰራል። እባክዎ በቀጥታ መልዕክት ይላኩልኝ።\nThis bot works in private chat only — please message me directly.',
  },
  unknownText: {
    am: 'አልገባኝም። ከታች ያሉትን አዝራሮች ይጠቀሙ ወይም /help ይላኩ።',
    en: "I didn't catch that. Use the menu buttons below or send /help.",
  },
  genericError: {
    am: 'ይቅርታ፣ የሆነ ስህተት ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።',
    en: 'Sorry, something went wrong. Please try again.',
  },
  help: {
    am: '🛠 አዲስ ጥገና — የቤት ጥገና ባለሙያዎችን በቀላሉ ማዘዣ።\n\nትዕዛዞች:\n/book — አገልግሎት ይዘዙ\n/bookings — ማስያዣዎቼ\n/lang — ቋንቋ ይቀይሩ\n/cancel — ያለውን ሂደት ይሰርዙ\n/help — ይህ መልዕክት\n\nየትዕዛዝ ሁኔታ ዝመናዎች እዚሁ በቴሌግራም ይደርስዎታል።',
    en: '🛠 Addis Tiggena — book trusted home-repair technicians with ease.\n\nCommands:\n/book — book a service\n/bookings — my bookings\n/lang — change language\n/cancel — cancel the current step\n/help — this message\n\nBooking status updates arrive right here in Telegram.',
  },
};

export type StringKey = keyof typeof table;

export function t(lang: Lang, key: StringKey, params?: Record<string, string | number>): string {
  let value: string = table[key][lang];
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Both language variants of a string — for Telegraf `hears` triggers. */
export function variants(key: StringKey): string[] {
  const entry: Entry = table[key];
  return entry.am === entry.en ? [entry.am] : [entry.am, entry.en];
}

/** True when the text is either language variant of the given string. */
export function isVariant(key: StringKey, text: string): boolean {
  const entry: Entry = table[key];
  return text === entry.am || text === entry.en;
}

const STATUS_META: Record<string, { emoji: string; am: string; en: string }> = {
  REQUESTED: { emoji: '🔎', am: 'ባለሙያ በመፈለግ ላይ', en: 'Finding a technician' },
  ACCEPTED: { emoji: '✅', am: 'ተቀብሏል', en: 'Accepted' },
  EN_ROUTE: { emoji: '🚗', am: 'በመንገድ ላይ', en: 'On the way' },
  ARRIVED: { emoji: '📍', am: 'ደርሷል', en: 'Arrived' },
  IN_PROGRESS: { emoji: '🔧', am: 'በሥራ ላይ', en: 'In progress' },
  COMPLETED: { emoji: '🧾', am: 'ተጠናቋል', en: 'Completed' },
  PAID: { emoji: '💚', am: 'ተከፍሏል', en: 'Paid' },
  CANCELLED: { emoji: '❌', am: 'ተሰርዟል', en: 'Cancelled' },
  EXPIRED: { emoji: '❌', am: 'ጊዜው አልፏል', en: 'Expired' },
  REJECTED: { emoji: '❌', am: 'ውድቅ ሆኗል', en: 'Rejected' },
};

export function statusLabel(lang: Lang, status: string): string {
  const meta = STATUS_META[status];
  if (!meta) return status;
  return `${meta.emoji} ${lang === 'en' ? meta.en : meta.am}`;
}

/** '350.00' → '350', '1234.50' → '1,234.5'; leaves unparsable input as-is. */
export function formatEtb(value: string): string {
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString('en-US', { maximumFractionDigits: 2 }) : value;
}
