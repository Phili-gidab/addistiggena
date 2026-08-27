'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { COMPANY, GUARANTEE_DAYS, HOURS } from '../lib/content';

interface Msg {
  id: number;
  from: 'bot' | 'me';
  text: string;
  am?: string;
  cta?: { href: string; label: string };
}

/** Quick-reply topics shown as chips under the conversation. */
const TOPICS: { key: string; label: string; labelAm: string }[] = [
  { key: 'book', label: 'How do I book?', labelAm: 'እንዴት ልዘዝ?' },
  { key: 'price', label: 'Prices', labelAm: 'ዋጋዎች' },
  { key: 'guarantee', label: 'Guarantee', labelAm: 'ዋስትና' },
  { key: 'coverage', label: 'Coverage areas', labelAm: 'የአገልግሎት ሽፋን' },
  { key: 'technician', label: 'Become a technician', labelAm: 'ባለሙያ ለመሆን' },
  { key: 'contact', label: 'Talk to a person', labelAm: 'ከሰው ጋር ማውራት' },
];

const ANSWERS: Record<string, Omit<Msg, 'id' | 'from'>> = {
  book: {
    text: 'Booking takes a minute: pick a service, pin your location, describe the problem and the nearest verified technician is dispatched - average arrival 15-30 minutes.',
    am: 'አገልግሎት ይምረጡ፣ ቦታዎን ይግለፁ፣ ችግሩን ይግለጹ - በአማካይ በ15-30 ደቂቃ ባለሙያ ይደርስዎታል።',
    cta: { href: '/book', label: 'Book a service · አገልግሎት ይዘዙ' },
  },
  price: {
    text: 'We publish transparent standard rates - base inspection plus labor ranges in ETB. You pay the technician directly (cash, Telebirr, CBE Birr or mobile banking).',
    am: 'ግልፅ የዋጋ ተመን አለን - ክፍያው በቀጥታ ለባለሙያው ነው።',
    cta: { href: '/pricing', label: 'See the full price list' },
  },
  guarantee: {
    text: `Every repair carries the Tiggena Guarantee: if the exact issue reoccurs within ${GUARANTEE_DAYS} days, it is re-inspected and fixed at no additional service cost.`,
    am: `ችግሩ በ${GUARANTEE_DAYS} ቀናት ውስጥ እንደገና ከተከሰተ ያለ ተጨማሪ ክፍያ ይስተካከላል።`,
  },
  coverage: {
    text: 'We cover all 11 sub-cities of Addis Ababa - technicians are matched from your own surroundings.',
    am: 'በሁሉም 11 ክፍለ ከተሞች እንገኛለን - ባለሙያው ከአካባቢዎ ይመደባል።',
    cta: { href: '/#coverage', label: 'See coverage areas' },
  },
  technician: {
    text: 'No degree required - proven skill, verified character and a smartphone are all you need. Registration, document upload and CoC verification run right on the platform.',
    am: 'ዲግሪ አያስፈልግም - ችሎታዎና ታማኝነትዎ ብቻ በቂ ነው። ምዝገባው በቀጥታ በመድረኩ ላይ ነው።',
    cta: { href: '/provider', label: 'Register as a technician' },
  },
  hours: {
    text: `We are open ${HOURS.display}.`,
    am: `የስራ ሰዓታችን፦ ${HOURS.displayAm}።`,
  },
  contact: {
    text: `Our customer service team answers ${HOURS.display}. Call ${COMPANY.phoneDisplay} - or leave your message here and we will follow up. Live agent chat is coming soon.`,
    am: `በ${COMPANY.phoneDisplay} ይደውሉልን - ወይም መልዕክትዎን እዚህ ይተዉ።`,
  },
  fallback: {
    text: `Thanks for your message! For anything specific our support desk is the fastest route - call ${COMPANY.phoneDisplay} (${HOURS.display}). You can also pick a topic below.`,
    am: 'ስለመልዕክትዎ እናመሰግናለን! ከዚህ በታች ካሉት ርዕሶች ይምረጡ ወይም ይደውሉልን።',
  },
  greeting: {
    text: 'ሰላም! Welcome to Addis Tiggena. How can we help you today? Pick a topic below or type your question.',
    am: 'እንኳን ደህና መጡ! ከዚህ በታች ርዕስ ይምረጡ ወይም ጥያቄዎን ይጻፉ።',
  },
};

/** Crude keyword router - EN + AM. A real support handover comes later. */
function route(q: string): string {
  const t = q.toLowerCase();
  if (/(hi|hello|selam|ሰላም|hey)\b/.test(t) && t.length < 25) return 'greeting';
  if (/(price|cost|rate|fee|ዋጋ|ክፍያ|ስንት)/.test(t)) return 'price';
  if (/(book|order|request|ማዘዣ|እዘዝ|ልዘዝ|ማዘዝ)/.test(t)) return 'book';
  if (/(guarant|warrant|ዋስትና|ድጋሚ)/.test(t)) return 'guarantee';
  if (/(where|area|cover|sub.?city|ክፍለ|ሽፋን|የት)/.test(t)) return 'coverage';
  if (/(technician|register|join|work|job|ባለሙያ|ስራ|መመዝገብ)/.test(t)) return 'technician';
  if (/(hour|open|time|ሰዓት|ክፍት)/.test(t)) return 'hours';
  if (/(human|person|agent|call|phone|support|ሰው|ደውል|ስልክ|እርዳታ)/.test(t)) return 'contact';
  return 'fallback';
}

let uid = 1;

/** Floating quick-chat: automatic answers now, live support handover later. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // greet on first open
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ id: uid++, from: 'bot', ...ANSWERS.greeting }]);
    }
  }, [open, msgs.length]);

  // keep the newest message in view
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, typing]);

  function answer(key: string) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { id: uid++, from: 'bot', ...ANSWERS[key] }]);
    }, 650);
  }

  function send(text: string, key?: string) {
    const clean = text.trim();
    if (!clean) return;
    setMsgs((m) => [...m, { id: uid++, from: 'me', text: clean }]);
    setInput('');
    answer(key ?? route(clean));
  }

  return (
    <>
      <button
        className={`chat-fab${open ? ' open' : ''}`}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.2-.6L3 21l1.9-5.6a8 8 0 0 1-1.4-4A8.4 8.4 0 0 1 12 3.2a8.4 8.4 0 0 1 9 8.3Z" />
          </svg>
        )}
      </button>

      <div className={`chat-panel${open ? ' open' : ''}`} role="dialog" aria-label="Quick chat">
        <div className="chat-head">
          <span className="dot" aria-hidden />
          <span>
            <b>Addis Tiggena</b>
            <small>Quick answers · ፈጣን ምላሽ</small>
          </span>
        </div>
        <div className="chat-body" ref={bodyRef}>
          {msgs.map((m) => (
            <div key={m.id} className={`chat-msg ${m.from}`}>
              <p>{m.text}</p>
              {m.am && <p className="am">{m.am}</p>}
              {m.cta && (
                <Link href={m.cta.href} className="chat-cta" onClick={() => setOpen(false)}>
                  {m.cta.label} →
                </Link>
              )}
            </div>
          ))}
          {typing && (
            <div className="chat-msg bot typing" aria-label="typing">
              <i /><i /><i />
            </div>
          )}
        </div>
        <div className="chat-topics">
          {TOPICS.map((t) => (
            <button key={t.key} onClick={() => send(`${t.label}`, t.key)}>
              {t.label} · <span className="am">{t.labelAm}</span>
            </button>
          ))}
        </div>
        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question… · ጥያቄዎን ይጻፉ…"
            aria-label="Chat message"
          />
          <button type="submit" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
