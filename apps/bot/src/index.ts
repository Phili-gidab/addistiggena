import { Context, Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

import * as api from './api';
import { API_URL, BOT_TOKEN, WEB_URL } from './config';
import { Lang, formatEtb, isVariant, statusLabel, t, variants } from './i18n';
import {
  AuthRequiredError,
  BookingDraft,
  Session,
  applyAuth,
  ensureAuth,
  getSession,
  withAuth,
} from './session';

/**
 * Addis Tiggena Telegram bot - the low-data booking channel (proposal §3).
 * Full conversational booking flow: category → contact link (request_contact)
 * → location share → optional description → confirm → POST /bookings.
 * Booking status updates are pushed to this chat by the API itself.
 */

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is not set. Create apps/bot/.env from .env.example');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// The bot links accounts and receives booking updates (with amounts) - private
// chats only. A group /start gets a short pointer; everything else is ignored.
bot.use(async (ctx, next) => {
  if (!ctx.chat || ctx.chat.type === 'private') return next();
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  if (/^\/start\b/.test(text)) {
    await ctx.reply(t('am', 'privateOnly')).catch(() => undefined);
  }
});

const chatIdOf = (ctx: Context): number => ctx.chat?.id ?? ctx.from?.id ?? 0;
const sessionOf = (ctx: Context): Session => getSession(chatIdOf(ctx));

// ---------------------------------------------------------------------------
// Keyboards
// ---------------------------------------------------------------------------

const mainMenu = (lang: Lang) =>
  Markup.keyboard([
    [t(lang, 'btnBook'), t(lang, 'btnBookings')],
    [t(lang, 'btnLang'), t(lang, 'btnHelp')],
  ]).resize();

const langPicker = () =>
  Markup.inlineKeyboard([
    Markup.button.callback('አማርኛ 🇪🇹', 'lang:am'),
    Markup.button.callback('English', 'lang:en'),
  ]);

const contactKeyboard = (lang: Lang) =>
  Markup.keyboard([
    [Markup.button.contactRequest(t(lang, 'btnShareContact'))],
    [t(lang, 'btnCancel')],
  ]).resize();

const locationKeyboard = (lang: Lang) =>
  Markup.keyboard([
    [Markup.button.locationRequest(t(lang, 'btnShareLocation'))],
    [t(lang, 'btnCancel')],
  ]).resize();

const descriptionKeyboard = (lang: Lang) =>
  Markup.keyboard([[t(lang, 'btnSkip')], [t(lang, 'btnCancel')]]).resize();

const confirmKeyboard = (lang: Lang) =>
  Markup.inlineKeyboard([
    Markup.button.callback(t(lang, 'btnConfirm'), 'book:confirm'),
    Markup.button.callback(t(lang, 'btnCancel'), 'book:cancel'),
  ]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('251')) return `+${cleaned}`;
  if (/^[79]\d{8}$/.test(cleaned)) return `+251${cleaned}`;
  return cleaned;
}

function categoryLabel(lang: Lang, category: api.Category): string {
  const name = lang === 'en' ? category.nameEn : category.nameAm;
  const icon = category.icon ? `${category.icon} ` : '';
  const price = category.priceFloorEtb
    ? ` - ${t(lang, 'priceFrom', { x: formatEtb(category.priceFloorEtb) })}`
    : '';
  return `${icon}${name}${price}`;
}

function formatDate(lang: Lang, iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function summaryText(lang: Lang, draft: BookingDraft): string {
  const price = draft.priceFloorEtb
    ? t(lang, 'priceFrom', { x: formatEtb(draft.priceFloorEtb) })
    : t(lang, 'priceOnInspection');
  const coords =
    draft.lat !== undefined && draft.lng !== undefined
      ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
      : t(lang, 'none');
  return [
    t(lang, 'confirmTitle'),
    '',
    `${t(lang, 'sumCategory')}: ${lang === 'en' ? draft.nameEn : draft.nameAm}`,
    `${t(lang, 'sumPrice')}: ${price}`,
    `${t(lang, 'sumLocation')}: ${coords}`,
    `${t(lang, 'sumDescription')}: ${draft.description ?? t(lang, 'none')}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Flow steps
// ---------------------------------------------------------------------------

async function askContact(ctx: Context, session: Session): Promise<void> {
  await ctx.reply(t(session.lang, 'askContact'), contactKeyboard(session.lang));
}

async function askLocation(ctx: Context, session: Session): Promise<void> {
  await ctx.reply(t(session.lang, 'askLocation'), locationKeyboard(session.lang));
}

async function askDescription(ctx: Context, session: Session): Promise<void> {
  await ctx.reply(t(session.lang, 'askDescription'), descriptionKeyboard(session.lang));
}

async function sendSummary(ctx: Context, session: Session, draft: BookingDraft): Promise<void> {
  await ctx.reply(summaryText(session.lang, draft), confirmKeyboard(session.lang));
}

/** Resume a draft at the right step (used after linking mid-flow). */
async function continueDraft(ctx: Context, session: Session, draft: BookingDraft): Promise<void> {
  if (draft.lat === undefined || draft.lng === undefined) {
    session.flow = { step: 'awaiting_location', draft };
    await askLocation(ctx, session);
  } else {
    session.flow = { step: 'awaiting_confirm', draft };
    await sendSummary(ctx, session, draft);
  }
}

async function startBooking(ctx: Context, session: Session): Promise<void> {
  session.flow = { step: 'idle' };
  let categories: api.Category[];
  try {
    categories = await api.getCategories();
  } catch (err) {
    console.error('Failed to load categories', err);
    await ctx.reply(t(session.lang, 'categoriesUnavailable'), mainMenu(session.lang));
    return;
  }
  if (categories.length === 0) {
    await ctx.reply(t(session.lang, 'categoriesUnavailable'), mainMenu(session.lang));
    return;
  }
  await ctx.reply(
    t(session.lang, 'chooseCategory'),
    Markup.inlineKeyboard(
      categories.map((c) => [
        Markup.button.callback(categoryLabel(session.lang, c), `book:cat:${c.id}`),
      ]),
    ),
  );
}

async function showBookings(ctx: Context, session: Session): Promise<void> {
  try {
    const bookings = await withAuth(session, chatIdOf(ctx), (token) =>
      api.fetchMyBookings(token),
    );
    if (bookings.length === 0) {
      await ctx.reply(t(session.lang, 'noBookings'), mainMenu(session.lang));
      return;
    }
    const lines = bookings.slice(0, 5).map((b) => {
      const name = session.lang === 'en' ? b.category.nameEn : b.category.nameAm;
      const price = b.finalPriceEtb ?? b.priceQuoteEtb;
      const priceNote = price ? ` - ETB ${formatEtb(price)}` : '';
      return [
        `${statusLabel(session.lang, b.status)} · #${b.id.slice(-6)}`,
        `${name} - ${formatDate(session.lang, b.createdAt)}${priceNote}`,
        `${WEB_URL}/bookings/${b.id}`,
      ].join('\n');
    });
    await ctx.reply(
      [t(session.lang, 'bookingsTitle'), '', lines.join('\n\n')].join('\n'),
      mainMenu(session.lang),
    );
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      session.flow = { step: 'awaiting_contact' };
      await askContact(ctx, session);
      return;
    }
    console.error('Failed to load bookings', err);
    await ctx.reply(t(session.lang, 'genericError'), mainMenu(session.lang));
  }
}

async function confirmBooking(ctx: Context, session: Session): Promise<void> {
  const flow = session.flow;
  if (flow.step !== 'awaiting_confirm') return; // stale button - ignore
  const draft = flow.draft;
  if (draft.lat === undefined || draft.lng === undefined) {
    session.flow = { step: 'awaiting_location', draft };
    await askLocation(ctx, session);
    return;
  }
  await ctx.reply(t(session.lang, 'creating'), Markup.removeKeyboard());
  try {
    const booking = await withAuth(session, chatIdOf(ctx), (token) =>
      api.createBooking(token, {
        categoryId: draft.categoryId,
        lat: draft.lat as number,
        lng: draft.lng as number,
        ...(draft.description ? { description: draft.description } : {}),
      }),
    );
    session.flow = { step: 'idle' };
    if (booking.status === 'EXPIRED') {
      await ctx.reply(t(session.lang, 'bookingExpired'), mainMenu(session.lang));
      return;
    }
    await ctx.reply(
      t(session.lang, 'bookingCreated', {
        ref: booking.id.slice(-6),
        status: statusLabel(session.lang, booking.status),
        link: `${WEB_URL}/bookings/${booking.id}`,
      }),
      mainMenu(session.lang),
    );
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      session.flow = { step: 'awaiting_contact', draft };
      await askContact(ctx, session);
      return;
    }
    console.error('Failed to create booking', err);
    session.flow = { step: 'idle' };
    await ctx.reply(t(session.lang, 'genericError'), mainMenu(session.lang));
  }
}

async function cancelFlow(ctx: Context, session: Session): Promise<void> {
  if (session.flow.step === 'idle') {
    await ctx.reply(t(session.lang, 'nothingToCancel'), mainMenu(session.lang));
    return;
  }
  session.flow = { step: 'idle' };
  await ctx.reply(t(session.lang, 'flowCancelled'), mainMenu(session.lang));
}

/** Best-effort push of the chosen language to the API - resumes auth if the
 * in-memory token is gone (e.g. after a restart); unlinked chats are skipped. */
async function syncLanguage(session: Session, chatId: number): Promise<void> {
  try {
    await withAuth(session, chatId, (token) => api.updateLanguage(token, session.lang));
  } catch (err) {
    if (!(err instanceof AuthRequiredError)) {
      console.warn('Language sync failed (non-fatal):', (err as Error).message);
    }
  }
}

async function showLangPicker(ctx: Context, session: Session): Promise<void> {
  await ctx.reply(t(session.lang, 'chooseLang'), langPicker());
}

async function showHelp(ctx: Context, session: Session): Promise<void> {
  await ctx.reply(t(session.lang, 'help'), mainMenu(session.lang));
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

bot.catch((err, ctx) => {
  console.error('Unhandled bot error', err);
  const session = sessionOf(ctx);
  ctx.reply(t(session.lang, 'genericError')).catch(() => undefined);
});

bot.start(async (ctx) => {
  const session = sessionOf(ctx);
  session.flow = { step: 'idle' };
  await ctx.reply(t(session.lang, 'welcome'), langPicker());
});

bot.command('book', (ctx) => startBooking(ctx, sessionOf(ctx)));
bot.command('bookings', (ctx) => showBookings(ctx, sessionOf(ctx)));
bot.command('lang', (ctx) => showLangPicker(ctx, sessionOf(ctx)));
bot.command('help', (ctx) => showHelp(ctx, sessionOf(ctx)));
bot.command('cancel', (ctx) => cancelFlow(ctx, sessionOf(ctx)));

bot.action(/^lang:(am|en)$/, async (ctx) => {
  const session = sessionOf(ctx);
  session.lang = ctx.match[1] as Lang;
  session.langChosen = true;
  await ctx.answerCbQuery();
  void syncLanguage(session, chatIdOf(ctx));
  await ctx.reply(
    `${t(session.lang, 'langSet')}\n${t(session.lang, 'menuPrompt')}`,
    mainMenu(session.lang),
  );
});

bot.action(/^book:cat:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const session = sessionOf(ctx);
  const category = await api.findCategory(ctx.match[1]);
  if (!category) {
    await ctx.reply(t(session.lang, 'categoryGone'));
    return;
  }
  const draft: BookingDraft = {
    categoryId: category.id,
    nameAm: category.nameAm,
    nameEn: category.nameEn,
    priceFloorEtb: category.priceFloorEtb,
  };
  if (await ensureAuth(session, chatIdOf(ctx))) {
    session.flow = { step: 'awaiting_location', draft };
    await askLocation(ctx, session);
  } else {
    session.flow = { step: 'awaiting_contact', draft };
    await askContact(ctx, session);
  }
});

bot.action('book:confirm', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
  await confirmBooking(ctx, sessionOf(ctx));
});

bot.action('book:cancel', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined).catch(() => undefined);
  await cancelFlow(ctx, sessionOf(ctx));
});

// Main-menu reply-keyboard buttons (either language).
bot.hears(variants('btnBook'), (ctx) => startBooking(ctx, sessionOf(ctx)));
bot.hears(variants('btnBookings'), (ctx) => showBookings(ctx, sessionOf(ctx)));
bot.hears(variants('btnLang'), (ctx) => showLangPicker(ctx, sessionOf(ctx)));
bot.hears(variants('btnHelp'), (ctx) => showHelp(ctx, sessionOf(ctx)));
bot.hears(variants('btnCancel'), (ctx) => cancelFlow(ctx, sessionOf(ctx)));

// Contact share → link the account (only trusted when it is the sender's own).
bot.on(message('contact'), async (ctx) => {
  const session = sessionOf(ctx);
  const contact = ctx.message.contact;
  if (!ctx.from || contact.user_id !== ctx.from.id) {
    await ctx.reply(t(session.lang, 'contactNotYours'));
    return;
  }
  const phone = normalizePhone(contact.phone_number);
  const name =
    [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim() ||
    ctx.from.first_name ||
    undefined;
  try {
    const auth = await api.linkTelegram(String(ctx.chat.id), phone, name);
    applyAuth(session, auth);
    void api.updateLanguage(auth.accessToken, session.lang);
    await ctx.reply(t(session.lang, 'linked'));
    // Keep any in-progress draft and resume the flow at its current step.
    const flow = session.flow;
    switch (flow.step) {
      case 'awaiting_contact':
        if (flow.draft) {
          await continueDraft(ctx, session, flow.draft);
        } else {
          session.flow = { step: 'idle' };
          await ctx.reply(t(session.lang, 'menuPrompt'), mainMenu(session.lang));
        }
        return;
      case 'awaiting_location':
        await askLocation(ctx, session);
        return;
      case 'awaiting_description':
        await askDescription(ctx, session);
        return;
      case 'awaiting_confirm':
        await sendSummary(ctx, session, flow.draft);
        return;
      default:
        await ctx.reply(t(session.lang, 'menuPrompt'), mainMenu(session.lang));
    }
  } catch (err) {
    const status = err instanceof api.ApiError ? err.status : undefined;
    if (status === 401 || status === 403) {
      // The API rejected the bot itself, not the user's phone number.
      console.error(
        `Account link rejected (${status}): BOT_API_KEY likely does not match the API's key (apps/api/.env).`,
        err,
      );
      await ctx.reply(t(session.lang, 'genericError'));
      return;
    }
    console.error('Account link failed', err);
    // 400 = the API validated and refused the phone; anything else (network,
    // 5xx, …) is not the user's fault - show the generic error instead.
    await ctx.reply(t(session.lang, status === 400 ? 'linkFailed' : 'genericError'));
  }
});

// Location share (keyboard button or manually attached location).
bot.on(message('location'), async (ctx) => {
  const session = sessionOf(ctx);
  const flow = session.flow;
  const { latitude, longitude } = ctx.message.location;
  switch (flow.step) {
    case 'awaiting_location':
      session.flow = {
        step: 'awaiting_description',
        draft: { ...flow.draft, lat: latitude, lng: longitude },
      };
      await askDescription(ctx, session);
      return;
    case 'awaiting_confirm': {
      // The user is correcting the pin - take it and re-show the summary.
      const draft = { ...flow.draft, lat: latitude, lng: longitude };
      session.flow = { step: 'awaiting_confirm', draft };
      await sendSummary(ctx, session, draft);
      return;
    }
    case 'awaiting_contact':
      await ctx.reply(t(session.lang, 'hintContact'));
      return;
    case 'awaiting_description':
      await ctx.reply(t(session.lang, 'hintDescription'));
      return;
    default:
      await ctx.reply(t(session.lang, 'hintBookFirst'), mainMenu(session.lang));
  }
});

// Fallback: route free text into the active flow step, or show a hint.
bot.on(message('text'), async (ctx) => {
  const session = sessionOf(ctx);
  const flow = session.flow;
  const text = ctx.message.text.trim();
  switch (flow.step) {
    case 'awaiting_description': {
      const draft = { ...flow.draft };
      if (!isVariant('btnSkip', text)) draft.description = text.slice(0, 500);
      session.flow = { step: 'awaiting_confirm', draft };
      await sendSummary(ctx, session, draft);
      return;
    }
    case 'awaiting_contact':
      await ctx.reply(t(session.lang, 'hintContact'));
      return;
    case 'awaiting_location':
      await ctx.reply(t(session.lang, 'hintLocation'));
      return;
    case 'awaiting_confirm':
      await ctx.reply(t(session.lang, 'hintConfirm'));
      return;
    default:
      await ctx.reply(t(session.lang, 'unknownText'), mainMenu(session.lang));
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const COMMANDS: Record<Lang, { command: string; description: string }[]> = {
  am: [
    { command: 'start', description: 'እንደገና ጀምር / ቋንቋ ምረጥ' },
    { command: 'book', description: 'አገልግሎት ይዘዙ' },
    { command: 'bookings', description: 'ማስያዣዎቼ' },
    { command: 'lang', description: 'ቋንቋ ቀይር' },
    { command: 'help', description: 'እገዛ' },
  ],
  en: [
    { command: 'start', description: 'Restart / choose language' },
    { command: 'book', description: 'Book a service' },
    { command: 'bookings', description: 'My bookings' },
    { command: 'lang', description: 'Change language' },
    { command: 'help', description: 'Help' },
  ],
};

async function main(): Promise<void> {
  try {
    await bot.telegram.setMyCommands(COMMANDS.am);
    await bot.telegram.setMyCommands(COMMANDS.en, { language_code: 'en' });
  } catch (err) {
    console.warn('Failed to register bot commands (non-fatal)', err);
  }
  // Telegraf 4: bot.launch() resolves only on shutdown - log before launching.
  console.log(`Addis Tiggena bot starting - API ${API_URL}, web ${WEB_URL}`);
  bot.launch().catch((err) => {
    console.error('Bot stopped with an error', err);
    process.exit(1);
  });
}

main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
