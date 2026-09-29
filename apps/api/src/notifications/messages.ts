/**
 * Every message the platform can send, in one place.
 *
 * Three things were wrong with messages being written inline at each call site:
 * nobody could see the whole list to review it, they were bilingual (which is
 * the most expensive form an SMS can take), and every one of them was sent by
 * SMS whether it needed to be or not.
 *
 * ── Why Amharic-only is cheaper, not dearer ──────────────────────────────
 * A GSM-7 message fits 160 characters per part. One Ethiopic character forces
 * the whole message into UCS-2, which fits 70. So a bilingual message pays the
 * UCS-2 penalty AND carries the text twice. Amharic alone, kept short, is the
 * cheapest thing that a customer in Addis can actually read.
 *
 * ── The delivery tiers ───────────────────────────────────────────────────
 * SMS_ALWAYS    the person may not have the app, and missing it breaks
 *               something: the login code, a job offer on a 5-minute timer,
 *               the outcome of their application.
 * SMS_IF_NO_APP push when the app is installed (free), SMS only as a fallback.
 * APP_ONLY      useful to see, never worth paying for. A receipt, a progress
 *               ping, a confirmation of something the person just did.
 */

export type Audience = 'CUSTOMER' | 'TECHNICIAN';

export type Channel = 'SMS_ALWAYS' | 'SMS_IF_NO_APP' | 'APP_ONLY';

export interface MessageVars {
  ref?: string;
  category?: string;
  categoryAm?: string;
  code?: string;
  amount?: string;
  balance?: string;
  commission?: string;
  reason?: string;
  km?: string;
  name?: string;
  site?: string;
}

export interface MessageDef {
  /** when this is sent, in plain words - shown in the console register */
  when: string;
  audience: Audience;
  channel: Channel;
  am: (v: MessageVars) => string;
  en: (v: MessageVars) => string;
}

/** Short brand stamp. Amharic, because the body is. */
const B = 'አዲስ ጥገና';

export const MESSAGES = {
  // ── must arrive, app or no app ─────────────────────────────────────────
  otp: {
    when: 'Someone signs in or registers, on the app or the website',
    audience: 'CUSTOMER',
    channel: 'SMS_ALWAYS',
    am: (v) => `${B}: የማረጋገጫ ኮድዎ ${v.code} ነው።`,
    en: (v) => `Addis Tiggena: your verification code is ${v.code}`,
  },
  jobOffer: {
    when: 'A job is offered to the closest technician - they have 5 minutes',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    // the distance is what the technician decides on, so it goes in when known
    am: (v) =>
      `${B}: አዲስ ስራ #${v.ref} · ${v.categoryAm}${v.km ? ` · ${v.km}ኪሜ` : ''}። በ5 ደቂቃ ውስጥ ይመልሱ።`,
    en: (v) =>
      `Addis Tiggena: new job #${v.ref} - ${v.category}${v.km ? `, ${v.km}km away` : ''}. Respond within 5 minutes.`,
  },
  jobAssigned: {
    when: 'Dispatch assigns a job to a technician by hand',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    am: (v) => `${B}: ስራ #${v.ref} · ${v.categoryAm} ተመድቦልዎታል። በ5 ደቂቃ ውስጥ ይመልሱ።`,
    en: (v) =>
      `Addis Tiggena: job #${v.ref} - ${v.category} assigned to you. Respond within 5 minutes.`,
  },
  providerVerified: {
    when: 'The verification desk approves a technician',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    am: () => `${B}: መለያዎ ተረጋግጧል። ስራ ለመቀበል ኦንላይን ይሁኑ።`,
    en: () => 'Addis Tiggena: your profile is verified - go online to receive jobs.',
  },
  providerRejected: {
    when: 'The verification desk rejects an application',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    am: (v) => `${B}: ማመልከቻዎ ውድቅ ሆኗል።${v.reason ? ` ${v.reason}።` : ''} አስተካክለው እንደገና ያመልክቱ።`,
    en: (v) =>
      `Addis Tiggena: your application was rejected.${v.reason ? ` ${v.reason}.` : ''} You can re-apply with corrected documents.`,
  },
  providerSuspended: {
    when: 'A technician account is suspended',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    am: (v) => `${B}: መለያዎ ታግዷል።${v.reason ? ` ${v.reason}።` : ''}`,
    en: (v) => `Addis Tiggena: your account is suspended.${v.reason ? ` ${v.reason}.` : ''}`,
  },
  providerWelcome: {
    when: 'The office registers a technician - they have no app yet',
    audience: 'TECHNICIAN',
    channel: 'SMS_ALWAYS',
    am: () => `${B}: እንኳን ደህና መጡ። በዚህ ስልክ ቁጥር ይግቡ።`,
    en: (v) => `Addis Tiggena: welcome. Sign in with this phone number at ${v.site}.`,
  },

  // ── push when the app is there, SMS only as a fallback ─────────────────
  jobAccepted: {
    when: 'A technician accepts the job',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ባለሙያው ስራ #${v.ref} ተቀብሏል።`,
    en: (v) => `Addis Tiggena: your technician accepted job #${v.ref}.`,
  },
  jobArrived: {
    when: 'The technician reaches the customer',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ባለሙያው ደርሷል · ስራ #${v.ref}።`,
    en: (v) => `Addis Tiggena: your technician has arrived for job #${v.ref}.`,
  },
  jobCompleted: {
    when: 'The technician marks the work finished and payment is due',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ስራ #${v.ref} ተጠናቋል። ክፍያ ይፈጽሙ።`,
    en: (v) => `Addis Tiggena: job #${v.ref} is complete - open the app to pay.`,
  },
  jobCancelled: {
    when: 'A customer cancels a job the technician had taken',
    audience: 'TECHNICIAN',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ስራ #${v.ref} በደንበኛው ተሰርዟል።`,
    en: (v) => `Addis Tiggena: job #${v.ref} was cancelled by the customer.`,
  },
  jobCancelledLate: {
    when: 'A customer cancels after the technician already set out',
    audience: 'TECHNICIAN',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ስራ #${v.ref} ተሰርዟል። ከወጡ በኋላ ስለሆነ ድጋፍን ያነጋግሩ።`,
    en: (v) =>
      `Addis Tiggena: job #${v.ref} was cancelled after you set out - contact support about a call-out fee.`,
  },
  noTechnician: {
    when: 'Nobody is available for the job the customer asked for',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: አሁን ${v.categoryAm} ባለሙያ የለም። እባክዎ ቆይተው ይሞክሩ።`,
    en: (v) =>
      `Addis Tiggena: no ${v.category} technician is free right now - please try again shortly.`,
  },
  escalated: {
    when: 'The offer lapsed and Ops is assigning somebody by hand',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ስራ #${v.ref} ባለሙያ እየመደብንልዎ ነው።`,
    en: (v) => `Addis Tiggena: we are assigning a technician for job #${v.ref} by hand.`,
  },
  ticketResolved: {
    when: 'A support case is closed',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ቅሬታዎ ተፈትቷል · ስራ #${v.ref}።${v.reason ? ` ${v.reason}` : ''}`,
    en: (v) =>
      `Addis Tiggena: your report on job #${v.ref} is resolved.${v.reason ? ` ${v.reason}` : ''}`,
  },
  ticketRejected: {
    when: 'A support case is closed without action',
    audience: 'CUSTOMER',
    channel: 'SMS_IF_NO_APP',
    am: (v) => `${B}: ስራ #${v.ref} · ቅሬታዎ ተዘግቷል።${v.reason ? ` ${v.reason}` : ''}`,
    en: (v) =>
      `Addis Tiggena: your report on job #${v.ref} was closed.${v.reason ? ` ${v.reason}` : ''}`,
  },

  // ── worth seeing, never worth paying for ───────────────────────────────
  jobEnRoute: {
    when: 'The technician sets off - the arrival message follows anyway',
    audience: 'CUSTOMER',
    channel: 'APP_ONLY',
    am: (v) => `${B}: ባለሙያው በመንገድ ላይ ነው · ስራ #${v.ref}።`,
    en: (v) => `Addis Tiggena: your technician is on the way for job #${v.ref}.`,
  },
  receipt: {
    when: 'A payment is confirmed - the customer already knows, they just paid',
    audience: 'CUSTOMER',
    channel: 'APP_ONLY',
    am: (v) => `${B} ደረሰኝ: ስራ #${v.ref} · ${v.amount} ብር ተከፍሏል። እናመሰግናለን!`,
    en: (v) => `Addis Tiggena receipt: job #${v.ref} - ETB ${v.amount} paid. Thank you!`,
  },
  settlement: {
    when: 'A job settles and commission comes off the technician balance',
    audience: 'TECHNICIAN',
    channel: 'APP_ONLY',
    am: (v) => `${B}: ስራ #${v.ref} · ${v.amount} ብር በጥሬ ገንዘብ ይወስዳሉ፤ ${v.commission} ብር ኮሚሽን ተቀንሷል።`,
    en: (v) =>
      `Addis Tiggena: job #${v.ref} - you keep ETB ${v.amount} in cash; ETB ${v.commission} commission was taken from your balance.`,
  },
  depositConfirmed: {
    when: 'Finance confirms a deposit the technician told us about',
    audience: 'TECHNICIAN',
    channel: 'APP_ONLY',
    am: (v) => `${B}: ${v.amount} ብር ተቀማጭ ተረጋግጧል። ቀሪ ሂሳብ ${v.balance} ብር።`,
    en: (v) => `Addis Tiggena: ETB ${v.amount} deposit confirmed. Balance ETB ${v.balance}.`,
  },
  reInspection: {
    when: 'Support schedules a re-inspection - they ring the customer anyway',
    audience: 'CUSTOMER',
    channel: 'APP_ONLY',
    am: (v) => `${B}: ለስራ #${v.ref} ድጋሚ ምርመራ ተይዟል።`,
    en: (v) => `Addis Tiggena: a re-inspection is scheduled for job #${v.ref}.`,
  },
  backInReview: {
    when: 'An application is put back into review',
    audience: 'TECHNICIAN',
    channel: 'APP_ONLY',
    am: () => `${B}: ማመልከቻዎ በድጋሚ እየታየ ነው።`,
    en: () => 'Addis Tiggena: your application is back in review.',
  },
} satisfies Record<string, MessageDef>;

export type MessageKey = keyof typeof MESSAGES;

/**
 * How many SMS parts a body costs. Any Ethiopic character puts the whole
 * message in UCS-2, which carries 70 characters per part rather than 160.
 */
export function smsSegments(text: string): number {
  const unicode = /[^\u0000-\u007F]/.test(text);
  const perPart = unicode ? 70 : 160;
  const perPartConcat = unicode ? 67 : 153;
  if (text.length <= perPart) return 1;
  return Math.ceil(text.length / perPartConcat);
}

/** The register the console shows, so the whole list can be reviewed. */
export function messageRegister(lang: 'am' | 'en' = 'am') {
  const sample: MessageVars = {
    ref: 'A1B2C3',
    category: 'Plumbing & Sanitary',
    categoryAm: 'ቧንቧ እና ሳኒተሪ',
    code: '123456',
    amount: '1,200',
    balance: '1,500',
    commission: '168',
    reason: 'expired CoC',
    site: 'addistiggena.com',
  };
  return (Object.entries(MESSAGES) as [MessageKey, MessageDef][]).map(([key, def]) => {
    const text = def[lang](sample);
    return {
      key,
      when: def.when,
      audience: def.audience,
      channel: def.channel,
      sample: text,
      characters: text.length,
      segments: smsSegments(text),
    };
  });
}
