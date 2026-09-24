'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { CategoryBars, DailyBars } from '../../components/charts';
import { ConsoleBar } from '../../components/ConsoleBar';
import { DocPreview } from '../../components/DocPreview';
import { StatusBadge } from '../../components/StatusBadge';
import {
  api,
  authorizedFetch,
  Booking,
  Category,
  fmtDate,
  getToken,
  getUser,
  isStaff,
  StaffRole,
  Ticket,
} from '../../lib/api';
import { SUB_CITIES } from '../../lib/areas';

const DispatchMap = dynamic(() => import('../../components/DispatchMap'), { ssr: false });

// ── data shapes ──────────────────────────────────────────────────────────────

interface Analytics {
  totals: {
    bookings: number;
    paidBookings: number;
    grossRevenueEtb: string | number;
    commissionEtb: string | number;
    customers: number;
    verifiedProviders: number;
    pendingProviders: number;
  };
  daily: { day: string; count: number }[];
  byCategory: { categoryId: string; name: string; nameAm: string; count: number }[];
}

interface Overview {
  ops: {
    activeJobs: number;
    awaitingDispatch: number;
    escalated: number;
    stalledEnRoute: number;
    techniciansOnline: number;
    avgArrivalMin: number | null;
  };
  support: {
    openTickets: number;
    activeClaims: number;
    resolvedToday: number;
    avgResolutionMin: number | null;
  };
  verification: {
    pendingApplications: number;
    approvedThisWeek: number;
    flaggedForReview: number;
  };
}

interface AdminDeposit {
  id: string;
  amountEtb: string;
  method: string;
  reference: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  note: string | null;
  createdAt: string;
  settledAt: string | null;
  wallet: {
    provider: {
      user: { name: string | null; phone: string };
      category: { nameEn: string } | null;
    };
  };
  recordedBy: { name: string | null; username: string | null } | null;
}

interface WalletBalances {
  minBalanceEtb: number;
  wallets: {
    id: string;
    balanceEtb: number;
    blocked: boolean;
    technician: string;
    phone: string;
    trade: string | null;
  }[];
}

interface PendingProvider {
  id: string;
  bio: string | null;
  subCity: string | null;
  woreda: string | null;
  gender: string | null;
  idType: string | null;
  idNumber: string | null;
  email: string | null;
  residentialSubCity: string | null;
  residentialWoreda: string | null;
  houseNumber: string | null;
  specialization: string | null;
  educationLevel: string | null;
  certifications: string | null;
  guarantorRelation: string | null;
  guarantorSubCity: string | null;
  guarantorWoreda: string | null;
  guarantorHouseNo: string | null;
  guarantorIdNumber: string | null;
  declarationName: string | null;
  declarationSignedAt: string | null;
  registeredAt: string | null;
  registeredBy: { name: string | null; username: string | null } | null;
  yearsExperience: number | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  verificationStatus: string;
  createdAt: string;
  user: { name: string | null; phone: string };
  category: Category;
  documents: { id: string; type: string; state: string; objectKey: string }[];
}

interface Technician {
  id: string;
  name: string | null;
  phone: string;
  category: { nameEn: string; nameAm: string };
  subCity: string | null;
  verificationStatus: string;
  isAvailable: boolean;
  ratingAvg: number;
  ratingCount: number;
  jobs: number;
  lat: number | null;
  lng: number | null;
  locationUpdatedAt: string | null;
  createdAt: string;
}

interface OpsBooking extends Booking {
  escalatedAt?: string | null;
}

interface Finance {
  range?: { from: string; to: string; isToday: boolean };
  collectedTodayEtb: number;
  commissionTodayEtb: number;
  completedToday: number;
  depositsPendingEtb: number;
  depositsPendingCount: number;
  depositsTodayEtb: number;
  depositsTodayCount: number;
  arrearsEtb: number;
  arrearsCount: number;
  exceptions: { unpaidJobs: number; openRefunds: number };
  queue: {
    id: string;
    ref: string;
    category: string;
    technician: string | null;
    customerPaidEtb: number;
    commissionEtb: number;
    technicianKeepsEtb: number | null;
    gateway: string | null;
    state: 'READY' | 'PAYMENT_ISSUE';
    completedAt: string | null;
  }[];
}

interface CustomerContext {
  customer: { id: string; name: string | null; phone: string; createdAt: string };
  stats: {
    bookings: number;
    completed: number;
    cancelled: number;
    lifetimeSpendEtb: number;
    openCases: number;
  };
  bookings: {
    id: string;
    ref: string;
    status: string;
    category: string;
    technician: string | null;
    amountEtb: number | null;
    stars: number | null;
    createdAt: string;
    completedAt: string | null;
  }[];
  cases: {
    id: string;
    type: string;
    status: string;
    note: string;
    resolutionNote: string | null;
    refundEtb: number | null;
    createdAt: string;
    resolvedAt: string | null;
  }[];
}

interface SystemInfo {
  services: {
    sms: string;
    smsNotifications: boolean;
    telegramBot: boolean;
    payments: { cash: boolean; chapa: boolean; telebirr: boolean };
  };
  dispatch: {
    offerWindowMinutes: number;
    escalateAfterAttempts: number;
    arrivalTargetMinutes: number;
    workingHours: string;
    minWalletBalanceEtb: number;
  };
  money: { commissionRate: number; supportRefundCapEtb: number };
  pending: { vetting: number; tickets: number };
  scale: { staff: number; technicians: number; customers: number; bookings: number };
  lastAuditEntry: string | null;
}

interface StaffAccount {
  id: string;
  name: string | null;
  phone: string;
  subCity?: string | null;
  username: string | null;
  role: string;
  /** set when the account is disabled - kept for the audit trail, cannot sign in */
  disabledAt: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  meta?: Record<string, unknown> | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  actorRole: string;
  createdAt: string;
  actor: { name: string | null; username: string | null };
}

interface PendingReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  booking: { id: string };
}

// ── role → console configuration (spec section 6) ────────────────────────────

type ViewKey =
  | 'dashboard'
  | 'map'
  | 'bookings'
  | 'technicians'
  | 'finance'
  | 'system'
  | 'verification'
  | 'tickets'
  | 'deposits'
  | 'reviews'
  | 'categories'
  | 'staff'
  | 'audit'
  | 'settings';

const MENU: Record<StaffRole, ViewKey[]> = {
  ADMIN: [
    'dashboard',
    'map',
    'bookings',
    'technicians',
    'finance',
    'verification',
    'tickets',
    'deposits',
    'reviews',
    'categories',
    'staff',
    'audit',
    'system',
    'settings',
  ],
  OPS_MANAGER: ['dashboard', 'map', 'bookings', 'technicians', 'reviews', 'categories', 'settings'],
  VERIFICATION_OFFICER: ['dashboard', 'verification', 'technicians'],
  SUPPORT_AGENT: ['dashboard', 'tickets', 'bookings', 'technicians', 'reviews'],
  FINANCE_OFFICER: ['dashboard', 'finance', 'deposits', 'settings'],
  SUBCITY_COORDINATOR: ['dashboard', 'map', 'bookings', 'technicians'],
};

const VIEW_LABEL: Record<ViewKey, string> = {
  dashboard: 'Dashboard',
  map: 'Live dispatch map',
  bookings: 'Bookings',
  technicians: 'Technicians',
  finance: 'Finance',
  system: 'Platform controls',
  verification: 'Verification queue',
  tickets: 'Support tickets',
  deposits: 'Deposits',
  reviews: 'Reviews',
  categories: 'Categories & pricing',
  staff: 'Staff & roles',
  audit: 'Audit log',
  settings: 'Settings',
};

/** Sidebar grouping - overview, day-to-day queues, platform configuration. */
const NAV_GROUPS: { label: string; items: ViewKey[] }[] = [
  { label: 'Overview', items: ['dashboard', 'map'] },
  { label: 'Operations', items: ['bookings', 'technicians', 'verification', 'tickets', 'reviews'] },
  { label: 'Money', items: ['finance', 'deposits'] },
  { label: 'Platform', items: ['categories', 'staff', 'system', 'audit', 'settings'] },
];

const ICONS: Record<ViewKey, React.ReactNode> = (() => {
  const I = (d: React.ReactNode) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
  return {
    dashboard: I(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
    map: I(<><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11Z" /><circle cx="12" cy="10" r="2.6" /></>),
    bookings: I(<><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>),
    technicians: I(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7M21.5 20c-.6-2.6-2.2-4.1-4.3-4.7" /></>),
    verification: I(<><path d="M12 2.5 20 6v5.5c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V6l8-3.5Z" /><path d="m8.7 11.7 2.3 2.3 4.3-4.5" /></>),
    tickets: I(<><path d="M21 11.5c0 4.1-4 7.5-9 7.5-1 0-2-.1-2.9-.4L3 20l1.5-3.6C3.5 15.1 3 13.4 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5Z" /></>),
    deposits: I(<><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9.5h.01M18 14.5h.01" /></>),
    reviews: I(<path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8L12 3Z" />),
    categories: I(<><path d="M3 10.5V4.8C3 3.8 3.8 3 4.8 3h5.7c.5 0 .9.2 1.3.5l8.7 8.7c.7.7.7 1.8 0 2.6l-5.7 5.7c-.7.7-1.8.7-2.6 0l-8.7-8.7a1.8 1.8 0 0 1-.5-1.3Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>),
    staff: I(<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.4 3.4-5 6.5-5 1.7 0 3.2.5 4.4 1.4" /><path d="M18.5 14v6M15.5 17h6" /></>),
    audit: I(<><path d="M6 2.5h9l4 4V21.5H6z" /><path d="M15 2.5V7h4M9.5 12h6M9.5 16h6" /></>),
    finance: I(<><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /><circle cx="17" cy="14.5" r="1.6" /></>),
    system: I(<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>),
    settings: I(<><path d="M4 21v-6M4 9V3M12 21v-9M12 6V3M20 21v-4M20 11V3" /><path d="M1.5 15h5M9.5 6h5M17.5 17h5" /></>),
  };
})();

/** One line on what each role may do - shown under the role picker, because
 *  "Ops Manager" alone does not tell an administrator what they are granting. */
const ROLE_BLURB: Record<string, string> = {
  ADMIN: 'Everything: dispatch, vetting, support, money, staff and the audit log.',
  OPS_MANAGER: 'Dispatch and bookings: assign jobs, manage technicians and reviews. No money, no staff.',
  VERIFICATION_OFFICER: 'Vets technician applications and their documents. Nothing else.',
  SUPPORT_AGENT: 'Customer cases: tickets, booking history and refunds up to the cap.',
  FINANCE_OFFICER: 'Money only: deposits, commission balances and the finance export.',
  SUBCITY_COORDINATOR: 'Bookings and technicians inside their own sub-city only.',
};

const ROLE_TITLES: Record<StaffRole, { en: string; am: string; sub: string }> = {
  ADMIN: {
    en: 'Super Admin',
    am: 'ዋና አስተዳዳሪ',
    sub: 'Full platform control: dispatch, vetting, support, finance, staff, audit.',
  },
  OPS_MANAGER: {
    en: 'Dispatch operations',
    am: 'የስምሪት ክፍል',
    sub: 'Live jobs, stuck dispatches, manual assignment, coverage and pricing.',
  },
  VERIFICATION_OFFICER: {
    en: 'Verification desk',
    am: 'የማረጋገጫ ክፍል',
    sub: 'Technician vetting: approve, reject, suspend - always with a reason code.',
  },
  SUPPORT_AGENT: {
    en: 'Support desk',
    am: 'የደንበኞች ድጋፍ',
    sub: 'Disputes, guarantee claims, re-inspections, customer and technician lookup.',
  },
  FINANCE_OFFICER: {
    en: 'Finance desk',
    am: 'የፋይናንስ ክፍል',
    sub: 'Technician deposits, platform commission and revenue oversight.',
  },
  SUBCITY_COORDINATOR: {
    en: 'Sub-city operations',
    am: 'የክፍለ ከተማ ስምሪት',
    sub: 'Live jobs, technicians and coverage for one sub-city.',
  },
};

const TICKET_LABEL: Record<Ticket['type'], string> = {
  DISPUTE: 'Dispute',
  GUARANTEE_CLAIM: 'Guarantee claim',
  SAFETY: 'Safety flag',
};

/**
 * The three the desk must see before anyone is verified (client, 2026-09-24).
 * Called plainly "ID" here; the application form is where it says which IDs
 * count. The Woreda letter is still accepted and filed, but no longer blocks
 * a verification.
 */
const REQUIRED_DOCS = [
  { type: 'NATIONAL_ID', label: 'ID' },
  { type: 'POLICE_CLEARANCE', label: 'Police clearance' },
  { type: 'COC_CERTIFICATE', label: 'CoC pass' },
];

/** accepted as supporting evidence, not required to verify */
const OPTIONAL_DOCS = [
  { type: 'WOREDA_RECOMMENDATION', label: 'Woreda letter' },
  { type: 'TRADE_CERTIFICATE', label: 'Trade certificate' },
  { type: 'PORTFOLIO', label: 'Portfolio' },
];

/** why an application was turned down - kept on record and texted to them */
const REJECT_REASONS = [
  'Incomplete police clearance',
  'Expired ID',
  'Expired CoC certificate',
  'ID does not match the applicant',
  'Document unreadable',
];

/** A blank Technician Registration Form - every field the paper form has. */
const EMPTY_TECH = {
  name: '',
  phone: '',
  categoryId: '',
  subCity: '',
  yearsExperience: '',
  verified: true,
  gender: '',
  idType: 'FAYDA',
  idNumber: '',
  email: '',
  residentialSubCity: '',
  residentialWoreda: '',
  houseNumber: '',
  specialization: '',
  educationLevel: '',
  certifications: '',
  woreda: '',
  guarantorName: '',
  guarantorRelation: '',
  guarantorPhone: '',
  guarantorSubCity: '',
  guarantorWoreda: '',
  guarantorHouseNo: '',
  guarantorIdNumber: '',
  declarationName: '',
};

/** bookings per page - the client could not work through 78 in one scroll */
const PAGE_SIZE = 20;

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

// ── page ─────────────────────────────────────────────────────────────────────

/** ETB amounts read better without decimals in an operations table. */
const MONEY = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function AdminPage() {
  const router = useRouter();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [view, setView] = useState<ViewKey>('dashboard');
  const [error, setError] = useState('');
  /** background refreshes must not shout: a dropped poll shows a quiet,
   *  self-clearing notice instead of a red error that never goes away */
  const [connection, setConnection] = useState<'ok' | 'lost'>('ok');
  const [notice, setNotice] = useState('');

  const [overview, setOverview] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [bookings, setBookings] = useState<OpsBooking[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [verifStatus, setVerifStatus] = useState('PENDING');
  const [verifRows, setVerifRows] = useState<PendingProvider[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketHistory, setTicketHistory] = useState<Ticket[] | null>(null);
  const [refundCap, setRefundCap] = useState<number | null>(null);
  const [ops, setOps] = useState<{ escalated: OpsBooking[]; stalled: OpsBooking[] } | null>(null);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [balances, setBalances] = useState<WalletBalances | null>(null);
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [cats, setCats] = useState<(Category & { isActive?: boolean })[]>([]);
  const [catEdit, setCatEdit] = useState<Record<string, string>>({});
  const [subsEdit, setSubsEdit] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [rate, setRate] = useState('');
  const [capInput, setCapInput] = useState('');
  const [assignPick, setAssignPick] = useState<Record<string, string>>({});
  const [bookingFilter, setBookingFilter] = useState('');
  const [ticketForm, setTicketForm] = useState<{
    id: string;
    mode: 'resolve' | 'reject';
    note: string;
    refund: string;
  } | null>(null);
  /** Meskel Square - the default pin for a booking taken over the phone. */
  const [pin, setPin] = useState({ lat: 9.0108, lng: 38.7613 });
  const [finance, setFinance] = useState<Finance | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [context, setContext] = useState<CustomerContext | null>(null);
  const [rules, setRules] = useState({
    offerWindowMinutes: '',
    escalateAfterAttempts: '',
    arrivalTargetMinutes: '',
    minWalletBalanceEtb: '',
    workingHours: '',
  });
  const [newCase, setNewCase] = useState({ bookingId: '', type: 'DISPUTE', note: '' });
  const [newBooking, setNewBooking] = useState({
    phone: '',
    customerName: '',
    categoryId: '',
    landmark: '',
    description: '',
  });
  const [newTech, setNewTech] = useState(EMPTY_TECH);
  /** the console form starts folded to the four fields staff use most */
  const [fullForm, setFullForm] = useState(false);
  /** which password fields are currently revealed, by field name */
  const [shownPw, setShownPw] = useState<Record<string, boolean>>({});
  /** bookings are paged - 78 rows in one scroll is unreadable */
  const [bookingPage, setBookingPage] = useState(0);
  /** the booking whose full detail is open underneath its row */
  const [openBooking, setOpenBooking] = useState<string | null>(null);
  const [openTech, setOpenTech] = useState<string | null>(null);
  /** finance window - empty means today */
  const [range, setRange] = useState({ from: '', to: '' });
  const [ledgerFilter, setLedgerFilter] = useState('');
  const [depositFilter, setDepositFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  /** show only technicians in the red, from the arrears tile */
  const [arrearsOnly, setArrearsOnly] = useState(false);
  /** what the officer has typed into the technician picker on the deposit form */
  const [techQuery, setTechQuery] = useState('');
  /** the application being rejected, and the reasons ticked so far */
  const [auditQuery, setAuditQuery] = useState({ who: '', action: '', target: '', from: '', to: '' });
  const [openAudit, setOpenAudit] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{
    id: string;
    name: string;
    reasons: string[];
    note: string;
  } | null>(null);
  const [techFilter, setTechFilter] = useState('');
  const [techGrouped, setTechGrouped] = useState(true);
  const [newStaff, setNewStaff] = useState({
    name: '',
    phone: '',
    username: '',
    password: '',
    role: 'SUPPORT_AGENT',
    subCity: '',
  });
  const [newDeposit, setNewDeposit] = useState({
    providerId: '',
    amountEtb: '',
    method: 'BANK_TRANSFER',
    reference: '',
    note: '',
    confirmNow: true,
  });
  /** staff row currently open for editing, keyed by id */
  const [editStaff, setEditStaff] = useState<{
    id: string;
    name: string;
    phone: string;
    role: string;
    subCity: string;
    password: string;
  } | null>(null);
  /** technician whose paperwork the desk is uploading, and the chosen type */
  const [docUpload, setDocUpload] = useState<{ providerId: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const can = useCallback((v: ViewKey, r: StaffRole | null = role) => (r ? MENU[r].includes(v) : false), [role]);

  const load = useCallback(
    (r: StaffRole) => {
      const has = (v: ViewKey) => MENU[r].includes(v);
      api<Overview>('/admin/overview')
        .then((o) => {
          setOverview(o);
          setConnection('ok');
        })
        .catch(() => setConnection('lost'));
      if (has('bookings') || has('map')) {
        api<OpsBooking[]>('/admin/bookings').then(setBookings).catch(() => {});
      }
      api<Technician[]>('/admin/technicians').then(setTechnicians).catch(() => {});
      if (MENU[r].includes('finance')) {
        const qs = new URLSearchParams();
        if (range.from) qs.set('from', range.from);
        if (range.to) qs.set('to', range.to);
        api<Finance>(`/admin/finance${qs.toString() ? `?${qs}` : ''}`)
          .then(setFinance)
          .catch(() => {});
      }
      if (r === 'ADMIN') api<SystemInfo>('/admin/system').then(setSystem).catch(() => {});
      if (r === 'ADMIN' || r === 'OPS_MANAGER') {
        api<Analytics>('/admin/analytics').then(setAnalytics).catch(() => {});
        api<{ escalated: OpsBooking[]; stalled: OpsBooking[] }>('/admin/ops/queue')
          .then(setOps)
          .catch(() => {});
        api<(Category & { isActive?: boolean })[]>('/admin/categories').then(setCats).catch(() => {});
        api<{ rate: number }>('/admin/config/commission')
          .then((res) => setRate(String(res.rate)))
          .catch(() => {});
      }
      if (has('verification')) {
        api<PendingProvider[]>(`/admin/providers?status=${verifStatus}`)
          .then((rows) => {
            setVerifRows(rows);
            setConnection('ok');
          })
          .catch(() => setConnection('lost'));
      }
      if (has('tickets')) {
        api<Ticket[]>('/admin/tickets').then(setTickets).catch(() => {});
        api<{ capEtb: number }>('/admin/config/refund-cap')
          .then((res) => {
            setRefundCap(res.capEtb);
            setCapInput(String(res.capEtb));
          })
          .catch(() => {});
      }
      if (has('deposits')) {
        api<AdminDeposit[]>('/admin/deposits').then(setDeposits).catch(() => {});
        api<WalletBalances>('/admin/wallets').then(setBalances).catch(() => {});
      }
      if (has('reviews')) api<PendingReview[]>('/admin/reviews').then(setReviews).catch(() => {});
      if (has('staff')) api<StaffAccount[]>('/admin/staff').then(setStaff).catch(() => {});
      if (has('audit')) {
        const qs = new URLSearchParams(
          Object.entries(auditQuery).filter(([, v]) => v) as [string, string][],
        );
        api<AuditEntry[]>(`/admin/audit${qs.toString() ? `?${qs}` : ''}`)
          .then(setAudit)
          .catch(() => {});
      }
    },
    [verifStatus, range, auditQuery],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/admin');
      return;
    }
    const r = getUser()?.role;
    if (!isStaff(r)) {
      setError('This area requires a staff account. Sign in as admin, ops, verifier or support.');
      return;
    }
    setRole(r);
    load(r);
    const t = setInterval(() => load(r), 30000);
    return () => clearInterval(t);
  }, [load, router]);

  const reload = useCallback(() => {
    const r = getUser()?.role;
    if (isStaff(r)) load(r);
  }, [load]);

  async function act(path: string, body?: object, method: 'POST' | 'PUT' = 'POST') {
    setError('');
    setNotice('');
    try {
      await api(path, { method, body: JSON.stringify(body ?? {}) });
      setNotice('Done.');
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function assign(bookingId: string) {
    const providerId = assignPick[bookingId];
    if (!providerId) {
      setError('Pick a technician first.');
      return;
    }
    const reason = window.prompt('Reason code for this manual assignment (goes to the audit log):');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('A short reason is required - it feeds the audit log.');
      return;
    }
    await act(`/admin/bookings/${bookingId}/assign`, { providerId, reason: reason.trim() });
  }

  async function submitTicketForm() {
    if (!ticketForm) return;
    const { id, mode, note, refund } = ticketForm;
    if (note.trim().length < 3) {
      setError('A resolution note is required - the customer receives it.');
      return;
    }
    const refundEtb = refund.trim() ? Number(refund) : undefined;
    if (refund.trim() && !Number.isFinite(refundEtb)) {
      setError('Refund must be a number.');
      return;
    }
    await act(`/admin/tickets/${id}/${mode}`, {
      resolutionNote: note.trim(),
      ...(mode === 'resolve' ? { refundEtb } : {}),
    });
    setTicketForm(null);
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/staff', { method: 'POST', body: JSON.stringify(newStaff) });
      setNotice(`Staff account "${newStaff.username}" created (${newStaff.role}).`);
      setNewStaff({ name: '', phone: '', username: '', password: '', role: 'SUPPORT_AGENT', subCity: '' });
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function updateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editStaff) return;
    setError('');
    try {
      // only send what actually changed - password stays untouched when blank
      const body: Record<string, unknown> = {
        name: editStaff.name,
        phone: editStaff.phone,
        role: editStaff.role,
      };
      if (editStaff.role === 'SUBCITY_COORDINATOR') body.subCity = editStaff.subCity;
      if (editStaff.password) body.password = editStaff.password;
      await api(`/admin/staff/${editStaff.id}`, { method: 'PUT', body: JSON.stringify(body) });
      setNotice(`Saved changes to ${editStaff.name || 'the account'}.`);
      setEditStaff(null);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleStaff(m: StaffAccount) {
    const disabling = !m.disabledAt;
    if (disabling && !confirm(`Disable ${m.name ?? m.username}? They will not be able to sign in.`)) {
      return;
    }
    await act(`/admin/staff/${m.id}/${disabling ? 'disable' : 'enable'}`);
  }

  /**
   * Upload a technician's paperwork from the console. Most applicants bring the
   * Fayda ID and CoC certificate to the office or send a photo, so the desk
   * files it for them: the file goes to object storage first, then we record
   * what it is against the technician.
   */
  async function uploadDocumentFor(file: File, providerId: string, type: string) {
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      // no content-type header - the browser sets the multipart boundary itself
      const res = await authorizedFetch('/uploads', { method: 'POST', body });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { objectKey } = (await res.json()) as { objectKey: string };
      await api(`/admin/providers/${providerId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ type, objectKey }),
      });
      setNotice(`${type.replace(/_/g, ' ').toLowerCase()} uploaded.`);
      setDocUpload(null);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function recordDeposit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/deposits', {
        method: 'POST',
        body: JSON.stringify({
          providerId: newDeposit.providerId,
          amountEtb: Number(newDeposit.amountEtb),
          method: newDeposit.method,
          reference: newDeposit.reference.trim(),
          note: newDeposit.note.trim() || undefined,
          confirmNow: newDeposit.confirmNow,
        }),
      });
      setNotice(
        newDeposit.confirmNow
          ? `${newDeposit.amountEtb} ETB credited.`
          : `${newDeposit.amountEtb} ETB recorded, waiting for confirmation.`,
      );
      setNewDeposit({
        providerId: '',
        amountEtb: '',
        method: 'BANK_TRANSFER',
        reference: '',
        note: '',
        confirmNow: true,
      });
      setTechQuery('');
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Onboard a technician the office vetted in person, instead of waiting for a
   *  website self-registration. They sign in with phone OTP - no password here. */
  async function createTechnician(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const years = Number(newTech.yearsExperience);
      await api('/admin/technicians', {
        method: 'POST',
        body: JSON.stringify({
          name: newTech.name.trim(),
          phone: newTech.phone.trim(),
          categoryId: newTech.categoryId,
          subCity: newTech.subCity || undefined,
          woreda: newTech.woreda.trim() || undefined,
          gender: newTech.gender || undefined,
          idType: newTech.idNumber.trim() ? newTech.idType : undefined,
          idNumber: newTech.idNumber.trim() || undefined,
          email: newTech.email.trim() || undefined,
          residentialSubCity: newTech.residentialSubCity || undefined,
          residentialWoreda: newTech.residentialWoreda.trim() || undefined,
          houseNumber: newTech.houseNumber.trim() || undefined,
          specialization: newTech.specialization.trim() || undefined,
          educationLevel: newTech.educationLevel || undefined,
          certifications: newTech.certifications.trim() || undefined,
          guarantorName: newTech.guarantorName.trim() || undefined,
          guarantorRelation: newTech.guarantorRelation.trim() || undefined,
          guarantorPhone: newTech.guarantorPhone.trim() || undefined,
          guarantorSubCity: newTech.guarantorSubCity || undefined,
          guarantorWoreda: newTech.guarantorWoreda.trim() || undefined,
          guarantorHouseNo: newTech.guarantorHouseNo.trim() || undefined,
          guarantorIdNumber: newTech.guarantorIdNumber.trim() || undefined,
          declarationName: newTech.declarationName.trim() || undefined,
          yearsExperience: Number.isFinite(years) && years > 0 ? years : undefined,
          verified: newTech.verified,
        }),
      });
      setNotice(
        `Technician "${newTech.name.trim()}" added. They sign in with their phone number; dispatch reaches them once they go online in the app.`,
      );
      setNewTech(EMPTY_TECH);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Pull the whole customer picture behind a case - history, money, cases. */
  async function loadContext(customerId: string) {
    setError('');
    setContext(null);
    try {
      setContext(await api<CustomerContext>(`/admin/customers/${customerId}/context`));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Support raising a case from a phone call. */
  async function createCase(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/admin/tickets', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: newCase.bookingId.trim(),
          type: newCase.type,
          note: newCase.note.trim(),
        }),
      });
      setNotice('Case opened - it is now in the queue.');
      setNewCase({ bookingId: '', type: 'DISPUTE', note: '' });
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Call-centre booking: staff take the job for a customer on the phone. */
  async function createBookingForCaller(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await api<{ id: string }>('/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          phone: newBooking.phone.trim(),
          customerName: newBooking.customerName.trim() || undefined,
          categoryId: newBooking.categoryId,
          lat: pin.lat,
          lng: pin.lng,
          landmarkNote: newBooking.landmark.trim() || undefined,
          description: newBooking.description.trim() || undefined,
        }),
      });
      setNotice(
        `Booking #${created.id.slice(-6).toUpperCase()} created - the closest technician has been offered the job.`,
      );
      setNewBooking({ phone: '', customerName: '', categoryId: '', landmark: '', description: '' });
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Dispatch rules the platform actually runs on. */
  async function saveRules(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // working hours is a string like 06:00-20:00; the rest are numbers
      const body: Record<string, number | string> = {};
      if (rules.offerWindowMinutes) body.offerWindowMinutes = Number(rules.offerWindowMinutes);
      if (rules.escalateAfterAttempts) body.escalateAfterAttempts = Number(rules.escalateAfterAttempts);
      if (rules.arrivalTargetMinutes) body.arrivalTargetMinutes = Number(rules.arrivalTargetMinutes);
      if (rules.minWalletBalanceEtb)
        body.minWalletBalanceEtb = Number(rules.minWalletBalanceEtb);
      if (rules.workingHours.trim()) body.workingHours = rules.workingHours.trim();
      await api('/admin/config/dispatch', { method: 'PUT', body: JSON.stringify(body) });
      setNotice('Dispatch rules updated - they apply to new jobs within a minute.');
      setRules({
        offerWindowMinutes: '',
        escalateAfterAttempts: '',
        arrivalTargetMinutes: '',
        minWalletBalanceEtb: '',
        workingHours: '',
      });
      api<SystemInfo>('/admin/system').then(setSystem).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** Same shape as the finance export - fetch with auth, then save the blob. */
  async function exportAudit() {
    setError('');
    try {
      const qs = new URLSearchParams(
        Object.entries(auditQuery).filter(([, v]) => v) as [string, string][],
      );
      const res = await authorizedFetch(`/admin/audit/export${qs.toString() ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /** The finance CSV needs the auth header, so fetch then save the blob. */
  async function exportFinance() {
    setError('');
    try {
      const qs = new URLSearchParams();
      if (range.from) qs.set('from', range.from);
      if (range.to) qs.set('to', range.to);
      const res = await authorizedFetch(`/admin/finance/export${qs.toString() ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `addis-tiggena-finance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openDocument(objectKey: string) {
    setError('');
    try {
      const res = await authorizedFetch(`/files/${objectKey}`);
      if (!res.ok) throw new Error(`Could not open document (${res.status})`);
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadTicketHistory() {
    try {
      const [resolved, rejected] = await Promise.all([
        api<Ticket[]>('/admin/tickets?status=RESOLVED'),
        api<Ticket[]>('/admin/tickets?status=REJECTED'),
      ]);
      setTicketHistory(
        [...resolved, ...rejected].sort(
          (a, b) => +new Date(b.resolvedAt ?? b.createdAt) - +new Date(a.resolvedAt ?? a.createdAt),
        ),
      );
    } catch {
      setTicketHistory([]);
    }
  }

  const titles = role ? ROLE_TITLES[role] : null;
  const stuckCount = (overview?.ops.escalated ?? 0) + (overview?.ops.stalledEnRoute ?? 0);
  const badge = (v: ViewKey): number | null => {
    if (!overview) return null;
    if (v === 'verification') return overview.verification.pendingApplications || null;
    if (v === 'tickets') return overview.support.openTickets || null;
    if (v === 'map') return overview.ops.activeJobs + overview.ops.awaitingDispatch || null;
    if (v === 'reviews') return reviews.length || null;
    if (v === 'deposits') return deposits.filter((d) => d.status === 'PENDING').length || null;
    return null;
  };

  // ── reusable pieces ────────────────────────────────────────────────────────

  /** technicians, filtered by name/phone/trade and optionally grouped by trade */
  const techRows = technicians.filter((t) => {
    const q = techFilter.trim().toLowerCase();
    if (!q) return true;
    return [t.name, t.phone, t.category.nameEn, t.category.nameAm, t.subCity]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const techByTrade = techRows.reduce<Record<string, Technician[]>>((acc, t) => {
    (acc[t.category.nameEn] ??= []).push(t);
    return acc;
  }, {});

  /** a yyyy-mm-dd string for a day N days back, in the operator's own timezone */
  const dayKey = (back: number) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const presetRange = (back: number) =>
    back === 0 ? { from: '', to: '' } : { from: dayKey(back), to: dayKey(0) };
  const isRangePreset = (back: number) => {
    const p = presetRange(back);
    return range.from === p.from && range.to === p.to;
  };
  const financeLabel =
    !range.from && !range.to
      ? 'Money today'
      : `Money ${range.from || 'the beginning'} to ${range.to || 'now'}`;

  const ledgerRows = (finance?.queue ?? []).filter((r) => {
    const q = ledgerFilter.trim().toLowerCase();
    if (!q) return true;
    return [r.technician, r.ref, r.category].filter(Boolean).some((v) =>
      String(v).toLowerCase().includes(q),
    );
  });

  /** one label per technician, so the datalist can match what was typed */
  const techOptionLabel = (t: Technician) =>
    `${t.name ?? 'Unnamed'} · ${t.phone} · ${t.category.nameEn}`;

  const depositRows = deposits.filter((d) => {
    const q = depositFilter.trim().toLowerCase();
    if (!q) return true;
    const who = d.wallet.provider.user;
    return [who.name, who.phone, d.reference, d.method, d.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const balanceRows = (balances?.wallets ?? []).filter((w) => {
    if (arrearsOnly && w.balanceEtb >= 0) return false;
    const q = balanceFilter.trim().toLowerCase();
    if (!q) return true;
    return [w.technician, w.phone, w.trade]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  /** 34 - top up a blocked technician without hunting for them in the form */
  const startTopUp = (phone: string) => {
    const t = technicians.find((x) => x.phone === phone);
    if (!t) return;
    setTechQuery(techOptionLabel(t));
    setNewDeposit({
      providerId: t.id,
      amountEtb: '',
      method: 'BANK_TRANSFER',
      reference: '',
      note: '',
      confirmNow: true,
    });
    document.getElementById('record-deposit')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const missingDocs = (p: PendingProvider) =>
    REQUIRED_DOCS.filter((r) => !p.documents.some((d) => d.type === r.type)).map((r) => r.label);
  const hasAllRequired = (p: PendingProvider) => missingDocs(p).length === 0;

  /** 24 - record why, and let the applicant know */
  async function submitRejection() {
    if (!rejecting) return;
    const note = [...rejecting.reasons, rejecting.note.trim()].filter(Boolean).join('; ');
    if (!note) {
      setError('Pick at least one reason - it is kept on record and sent to the applicant.');
      return;
    }
    const target = rejecting.id;
    setRejecting(null);
    await act(`/admin/providers/${target}/reject`, { note });
  }

  const tile = (v: string | number, k: string, hi = false, sub?: string) => (
    <div className={`tile${hi ? ' hi' : ''}`} key={k}>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );

  /** a KPI tile that opens the view behind the number */
  const tileLink = (v: string | number, k: string, to: ViewKey) => (
    <button type="button" className="tile as-link" key={k} onClick={() => setView(to)}>
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </button>
  );

  /** password input with an eye to reveal it - staff mistype silently otherwise */
  const passwordField = (
    name: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <span className="pw-wrap">
      <input
        className="input"
        type={shownPw[name] ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="peek"
        aria-label={shownPw[name] ? 'Hide password' : 'Show password'}
        title={shownPw[name] ? 'Hide password' : 'Show password'}
        onClick={() => setShownPw((p) => ({ ...p, [name]: !p[name] }))}
      >
        {shownPw[name] ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2" />
            <path d="M9.9 4.6A9.7 9.7 0 0 1 12 4.4c5 0 9 4.4 9 7.6a9.6 9.6 0 0 1-2.3 3.7M6.2 6.6C3.9 8.1 3 10.6 3 12c0 3.2 4 7.6 9 7.6 1.3 0 2.5-.3 3.6-.8" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12c0-3.2 4-7.6 9-7.6s9 4.4 9 7.6-4 7.6-9 7.6-9-4.4-9-7.6Z" />
            <circle cx="12" cy="12" r="2.8" />
          </svg>
        )}
      </button>
    </span>
  );

  const assignRow = (b: OpsBooking, flavor: 'escalated' | 'stalled') => (
    <div key={b.id} className="booking-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
      <span>
        <span className="what">
          #{b.id.slice(-6).toUpperCase()} · {b.category.nameEn}
          {flavor === 'stalled' && b.provider?.user
            ? ` - ${b.provider.user.name ?? b.provider.user.phone} (no GPS ping 15+ min)`
            : ''}
        </span>
        <span className="when" style={{ display: 'block' }}>
          {b.customer?.name ?? b.customer?.phone ?? 'customer'} ·{' '}
          {flavor === 'escalated'
            ? `escalated after 3 declined/expired offers${b.escalatedAt ? ` · ${fmtDate(b.escalatedAt)}` : ''}`
            : `en route since ${fmtDate(b.createdAt)}`}
        </span>
      </span>
      <span className="row" style={{ gap: '0.4rem' }}>
        <select
          className="input"
          style={{ maxWidth: 220 }}
          value={assignPick[b.id] ?? ''}
          onChange={(e) => setAssignPick((prev) => ({ ...prev, [b.id]: e.target.value }))}
        >
          <option value="">Assign technician…</option>
          {technicians
            .filter((t) => t.verificationStatus === 'VERIFIED')
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? t.phone} · {t.category.nameEn}
                {t.isAvailable ? ' · online' : ''}
              </option>
            ))}
        </select>
        <button className="btn btn-teal btn-sm" onClick={() => assign(b.id)}>
          Assign
        </button>
      </span>
    </div>
  );

  const exceptionsPanel = (
    <div className="panel">
      <h2>Dispatch exceptions ({(ops?.escalated.length ?? 0) + (ops?.stalled.length ?? 0)})</h2>
      {ops && ops.escalated.length === 0 && ops.stalled.length === 0 && (
        <p className="hint">
          No stuck jobs.{' '}
          <span
            className="explain"
            title="Escalations land here after a declined or expired offer; en-route jobs appear when the technician stops sending GPS pings for 15 minutes."
          >
            What lands here?
          </span>
        </p>
      )}
      {ops?.escalated.map((b) => assignRow(b, 'escalated'))}
      {ops?.stalled.map((b) => assignRow(b, 'stalled'))}
    </div>
  );

  const ticketRow = (t: Ticket, history = false) => (
    <div key={t.id} className="booking-row" style={{ cursor: 'default', flexWrap: 'wrap' }}>
      <span>
        <span className="what">
          {TICKET_LABEL[t.type]}
          {t.status === 'RE_INSPECTION' ? ' · re-inspection scheduled' : ''}
          {history ? ` · ${t.status.toLowerCase()}` : ''} - #{t.booking.id.slice(-6).toUpperCase()} (
          {t.booking.category.nameEn})
        </span>
        <span className="when" style={{ display: 'block', maxWidth: 460 }}>
          “{t.note}” -{' '}
          <button type="button" className="link-btn" onClick={() => loadContext(t.booking.customer.id)}>
            {t.booking.customer.name ?? t.booking.customer.phone}
          </button>{' '}
          · <a href={`tel:${t.booking.customer.phone}`} className="link-btn">
            {t.booking.customer.phone}
          </a>{' '}
          · {fmtDate(t.createdAt)}
          {t.booking.provider?.user
            ? ` · technician: ${t.booking.provider.user.name ?? t.booking.provider.user.phone}`
            : ''}
          {history && t.resolutionNote ? ` · outcome: ${t.resolutionNote}` : ''}
        </span>
        {ticketForm?.id === t.id && (
          <span className="ticket-form">
            <textarea
              rows={2}
              className="input"
              placeholder={
                ticketForm.mode === 'resolve'
                  ? 'Resolution note (sent to the customer)…'
                  : 'Why is this ticket being rejected?…'
              }
              value={ticketForm.note}
              onChange={(e) => setTicketForm({ ...ticketForm, note: e.target.value })}
            />
            {ticketForm.mode === 'resolve' && (
              <input
                className="input"
                style={{ maxWidth: 190 }}
                placeholder={`Refund ETB (optional${refundCap != null && role === 'SUPPORT_AGENT' ? `, cap ${refundCap}` : ''})`}
                inputMode="decimal"
                value={ticketForm.refund}
                onChange={(e) => setTicketForm({ ...ticketForm, refund: e.target.value })}
              />
            )}
            <span className="row" style={{ gap: '0.4rem' }}>
              <button className="btn btn-teal btn-sm" onClick={submitTicketForm}>
                Confirm {ticketForm.mode}
              </button>
              <button className="btn btn-line btn-sm" onClick={() => setTicketForm(null)}>
                Cancel
              </button>
            </span>
          </span>
        )}
      </span>
      {!history && ticketForm?.id !== t.id && (
        <span className="row" style={{ gap: '0.4rem' }}>
          {t.type === 'GUARANTEE_CLAIM' && t.status === 'OPEN' && (
            <button className="btn btn-dark btn-sm" onClick={() => act(`/admin/tickets/${t.id}/reinspect`)}>
              Re-inspection
            </button>
          )}
          <button
            className="btn btn-teal btn-sm"
            onClick={() => setTicketForm({ id: t.id, mode: 'resolve', note: '', refund: '' })}
          >
            Resolve ✓
          </button>
          <button
            className="btn btn-line btn-sm"
            onClick={() => setTicketForm({ id: t.id, mode: 'reject', note: '', refund: '' })}
          >
            Reject
          </button>
        </span>
      )}
    </div>
  );

  // ── views ──────────────────────────────────────────────────────────────────

  const dashboardView = (
    <>
      {role === 'ADMIN' && analytics && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(MONEY(analytics.totals.bookings), 'bookings, all time')}
          {tile(`${MONEY(Number(analytics.totals.grossRevenueEtb))} ETB`, 'gross revenue')}
          {tile(`${MONEY(Number(analytics.totals.commissionEtb))} ETB`, 'platform commission')}
          {tile(overview?.ops.activeJobs ?? '…', 'jobs live now')}
          {tile(overview?.support.openTickets ?? '…', 'open tickets')}
          {tile(overview?.verification.pendingApplications ?? '…', 'pending vetting')}
        </div>
      )}
      {role === 'OPS_MANAGER' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.ops.activeJobs ?? '…', 'active jobs')}
          {tile(overview?.ops.awaitingDispatch ?? '…', 'awaiting dispatch')}
          {tile(stuckCount, 'stuck / stalled')}
          {tile(overview?.ops.techniciansOnline ?? '…', 'technicians online')}
          {tile(
            overview?.ops.avgArrivalMin != null ? `${overview.ops.avgArrivalMin} min` : '-',
            'avg arrival (7d)',
          )}
        </div>
      )}
      {role === 'SUPPORT_AGENT' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.support.openTickets ?? '…', 'open tickets')}
          {tile(overview?.support.activeClaims ?? '…', 'guarantee claims active')}
          {tile(overview?.support.resolvedToday ?? '…', 'resolved today')}
          {tile(
            overview?.support.avgResolutionMin != null
              ? `${Math.round(overview.support.avgResolutionMin / 60)}h`
              : '-',
            'avg resolution (7d)',
          )}
        </div>
      )}
      {role === 'VERIFICATION_OFFICER' && (
        <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tile(overview?.verification.pendingApplications ?? '…', 'pending applications')}
          {tile(overview?.verification.approvedThisWeek ?? '…', 'approved this week')}
          {tile(overview?.verification.flaggedForReview ?? '…', 'suspended / flagged')}
        </div>
      )}

      {/* quick actions (spec: one write action or one jump each) */}
      <div className="qa-row">
        {can('map') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('map')}>
            Live dispatch map
          </button>
        )}
        {(role === 'ADMIN' || role === 'OPS_MANAGER') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('dashboard')}>
            Stuck jobs ({stuckCount})
          </button>
        )}
        {can('verification') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('verification')}>
            Review next application
          </button>
        )}
        {can('tickets') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('tickets')}>
            Ticket queue ({overview?.support.openTickets ?? 0})
          </button>
        )}
        {can('staff') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('staff')}>
            + Create staff account
          </button>
        )}
        {can('audit') && (
          <button className="btn btn-line btn-sm" onClick={() => setView('audit')}>
            Audit log
          </button>
        )}
      </div>

      {/* the role's primary queue sits on the dashboard (spec section 8) */}
      {(role === 'ADMIN' || role === 'OPS_MANAGER') && exceptionsPanel}
      {role === 'SUPPORT_AGENT' && (
        <div className="panel">
          <h2>Open tickets ({tickets.length})</h2>
          {tickets.length === 0 && <p className="hint">No open disputes or guarantee claims.</p>}
          {tickets.slice(0, 5).map((t) => ticketRow(t))}
          {tickets.length > 5 && (
            <button className="btn btn-line btn-sm" onClick={() => setView('tickets')}>
              See all →
            </button>
          )}
        </div>
      )}
      {role === 'VERIFICATION_OFFICER' && verificationTable(verifRows, true)}

      {(role === 'ADMIN' || role === 'OPS_MANAGER') && analytics && (
        <>
          <div className="panel">
            <h2>Bookings - last 14 days</h2>
            <DailyBars data={analytics.daily} />
          </div>
          <div className="panel">
            <h2>Service Demand · የአገልግሎት ፍላጎት</h2>
            <CategoryBars data={analytics.byCategory} />
          </div>
        </>
      )}
    </>
  );

  function verificationTable(rows: PendingProvider[] | null, compact = false) {
    return (
      <div className="panel" key="verif">
        <h2>
          Verification queue{rows ? ` (${rows.length})` : ''}
        </h2>
        {!compact && (
          <div className="qa-row">
            {['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
              <button
                key={st}
                className={`btn btn-sm ${verifStatus === st ? 'btn-dark' : 'btn-line'}`}
                onClick={() => setVerifStatus(st)}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>
        )}
        {rows?.length === 0 && <p className="hint">Nothing in this list.</p>}
        {!!rows?.length && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Trade</th>
                  <th>Documents</th>
                  <th>Applied</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.user.name ?? 'Unnamed'}</strong>
                      <div className="hint">{p.user.phone}</div>
                      <div className="hint">
                        {[
                          p.gender?.toLowerCase(),
                          p.specialization,
                          p.yearsExperience != null && `${p.yearsExperience} yrs exp.`,
                          p.educationLevel?.replace(/_/g, ' ').toLowerCase(),
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'no professional details submitted'}
                      </div>
                      {/* the whole registration form, folded away until the
                          officer actually needs to check it against the paper */}
                      <details className="form-detail">
                        <summary>Registration form</summary>
                        <dl>
                          <dt>ID</dt>
                          <dd>
                            {p.idNumber
                              ? `${p.idNumber} (${(p.idType ?? 'FAYDA').toLowerCase()})`
                              : '-'}
                          </dd>
                          <dt>Email</dt>
                          <dd>{p.email ?? '-'}</dd>
                          <dt>Lives at</dt>
                          <dd>
                            {[
                              p.residentialSubCity,
                              p.residentialWoreda && `Woreda ${p.residentialWoreda}`,
                              p.houseNumber && `House ${p.houseNumber}`,
                            ]
                              .filter(Boolean)
                              .join(', ') || '-'}
                          </dd>
                          <dt>Works in</dt>
                          <dd>
                            {[p.subCity, p.woreda && `Woreda ${p.woreda}`].filter(Boolean).join(', ') || '-'}
                          </dd>
                          <dt>Certificates</dt>
                          <dd>{p.certifications ?? '-'}</dd>
                          <dt>Guarantor</dt>
                          <dd>
                            {p.guarantorName
                              ? [
                                  p.guarantorName,
                                  p.guarantorRelation && `(${p.guarantorRelation})`,
                                  p.guarantorPhone,
                                  p.guarantorIdNumber && `ID ${p.guarantorIdNumber}`,
                                  [
                                    p.guarantorSubCity,
                                    p.guarantorWoreda && `Woreda ${p.guarantorWoreda}`,
                                    p.guarantorHouseNo && `House ${p.guarantorHouseNo}`,
                                  ]
                                    .filter(Boolean)
                                    .join(', '),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')
                              : '-'}
                          </dd>
                          <dt>Declaration</dt>
                          <dd>
                            {p.declarationSignedAt
                              ? `signed by ${p.declarationName ?? 'applicant'} on ${fmtDate(p.declarationSignedAt)}`
                              : 'not signed'}
                          </dd>
                          <dt>Registered by</dt>
                          <dd>
                            {p.registeredBy
                              ? `${p.registeredBy.name ?? p.registeredBy.username}${p.registeredAt ? ` on ${fmtDate(p.registeredAt)}` : ''}`
                              : 'self-registered'}
                          </dd>
                        </dl>
                      </details>
                    </td>
                    <td>{p.category.nameEn}</td>
                    <td>
                      {p.documents.length === 0 && <span className="hint">none yet</span>}
                      {p.documents.map((d) => (
                        <DocPreview
                          key={d.id}
                          objectKey={d.objectKey}
                          label={d.type.replace(/_/g, ' ').toLowerCase()}
                        />
                      ))}
                      {/* wraps onto several lines - on one it runs past the cell
                          and over the next column */}
                      <div
                        className="hint"
                        style={{
                          marginTop: '0.3rem',
                          maxWidth: 230,
                          display: 'flex',
                          flexWrap: 'wrap',
                          columnGap: '0.6rem',
                        }}
                      >
                        {REQUIRED_DOCS.map((r) => (
                          <span key={r.type} style={{ whiteSpace: 'nowrap' }}>
                            {p.documents.some((d) => d.type === r.type) ? '✓' : '✗'} {r.label}
                          </span>
                        ))}
                      </div>

                      {/* Applicants usually bring their ID and CoC certificate to
                          the office or send a photo, so the desk files it here
                          rather than waiting for them to use the app. */}
                      {docUpload?.providerId === p.id ? (
                        <div
                          className="row"
                          style={{
                            gap: '0.4rem',
                            marginTop: '0.45rem',
                            flexWrap: 'wrap',
                            // keep the control inside the cell, or it pushes the
                            // verify/reject buttons off the edge of the table
                            maxWidth: 210,
                          }}
                        >
                          <select
                            className="input"
                            style={{ maxWidth: 175, fontSize: '0.78rem' }}
                            value={docUpload.type}
                            onChange={(e) => setDocUpload({ ...docUpload, type: e.target.value })}
                          >
                            {REQUIRED_DOCS.map((r) => (
                              <option key={r.type} value={r.type}>
                                {r.label}
                              </option>
                            ))}
                            <option value="OTHER">Other</option>
                          </select>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            disabled={uploading}
                            style={{ fontSize: '0.75rem', maxWidth: 200 }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadDocumentFor(file, p.id, docUpload.type);
                            }}
                          />
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setDocUpload(null)}
                          >
                            cancel
                          </button>
                          {uploading && <span className="hint">uploading…</span>}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="link-btn"
                          style={{ marginTop: '0.4rem' }}
                          onClick={() =>
                            setDocUpload({ providerId: p.id, type: REQUIRED_DOCS[0].type })
                          }
                        >
                          + upload a document
                        </button>
                      )}
                    </td>
                    <td className="hint">{fmtDate(p.createdAt)}</td>
                    <td>
                      <span className="row" style={{ justifyContent: 'flex-end' }}>
                        {p.verificationStatus !== 'VERIFIED' && (
                          <button
                            className="btn btn-teal btn-sm"
                            disabled={!hasAllRequired(p)}
                            title={
                              hasAllRequired(p)
                                ? 'Approve this technician'
                                : `Still missing: ${missingDocs(p).join(', ')}`
                            }
                            onClick={() => act(`/admin/providers/${p.id}/verify`)}
                          >
                            Verify ✓
                          </button>
                        )}
                        {p.verificationStatus === 'PENDING' && (
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() =>
                              setRejecting({
                                id: p.id,
                                name: p.user.name ?? p.user.phone,
                                reasons: [],
                                note: '',
                              })
                            }
                          >
                            Reject
                          </button>
                        )}
                        {p.verificationStatus === 'VERIFIED' && (
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() => {
                              const note = window.prompt('Reason for suspension (required):');
                              if (!note || note.trim().length < 3) return;
                              act(`/admin/providers/${p.id}/suspend`, { note: note.trim() });
                            }}
                          >
                            Suspend
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    const q = bookingFilter.trim().toLowerCase();
    if (!q) return true;
    return [
      b.id.slice(-6),
      b.customer?.name,
      b.customer?.phone,
      b.provider?.user?.name,
      b.provider?.user?.phone,
      b.category.nameEn,
      b.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const bookingPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pagedBookings = filteredBookings.slice(
    bookingPage * PAGE_SIZE,
    (bookingPage + 1) * PAGE_SIZE,
  );

  const mapJobs = bookings
    .filter((b) => ACTIVE_STATUSES.includes(b.status))
    .map((b) => ({
      id: b.id,
      status: b.status,
      lat: b.lat,
      lng: b.lng,
      label: `#${b.id.slice(-6).toUpperCase()} ${b.category.nameEn}`,
      sub: `${b.status} · ${b.customer?.name ?? b.customer?.phone ?? ''}`,
    }));
  const mapTechs = technicians
    .filter((t) => t.isAvailable && t.verificationStatus === 'VERIFIED' && t.lat != null && t.lng != null)
    .map((t) => ({
      id: t.id,
      lat: t.lat!,
      lng: t.lng!,
      label: t.name ?? t.phone,
      sub: `${t.category.nameEn} · online`,
    }));

  return (
    <main className="console">
      <ConsoleBar subtitle="Staff console" />

      <div className="container console-container">
        <h1 className="page-title">{titles ? `${titles.en} · ${titles.am}` : 'Staff console'}</h1>
        <p className="page-sub">{titles?.sub ?? ''}</p>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="ok-box">{notice}</div>}
        {rejecting && (
          <div className="modal-veil" onClick={() => setRejecting(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reject {rejecting.name}</h2>
              <p className="hint mb">
                The reason is kept on the application and texted to the applicant, so they know
                what to fix before re-applying.
              </p>
              {REJECT_REASONS.map((reason) => (
                <label key={reason} className="check-row">
                  <input
                    type="checkbox"
                    checked={rejecting.reasons.includes(reason)}
                    onChange={(e) =>
                      setRejecting({
                        ...rejecting,
                        reasons: e.target.checked
                          ? [...rejecting.reasons, reason]
                          : rejecting.reasons.filter((r) => r !== reason),
                      })
                    }
                  />
                  <span>{reason}</span>
                </label>
              ))}
              <div className="field" style={{ marginTop: '0.8rem' }}>
                <label>Anything else (optional)</label>
                <input
                  className="input"
                  placeholder="in your own words"
                  value={rejecting.note}
                  onChange={(e) => setRejecting({ ...rejecting, note: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-dark btn-sm" onClick={submitRejection}>
                  Reject and notify
                </button>
                <button className="btn btn-line btn-sm" onClick={() => setRejecting(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {connection === 'lost' && (
          <div className="warn-box">
            Lost contact with the server - showing the last data we loaded.{' '}
            <button type="button" className="link-btn" onClick={reload}>
              retry now
            </button>
          </div>
        )}

        {role && (
          <div className="admin-shell">
            <aside className="admin-side">
              <div className="role-tag">{role.replace(/_/g, ' ')}</div>
              <nav className="admin-nav">
                {NAV_GROUPS.map((g) => {
                  const items = g.items.filter((v) => MENU[role].includes(v));
                  if (items.length === 0) return null;
                  return (
                    <div className="nav-group" key={g.label}>
                      <span className="nav-group-label">{g.label}</span>
                      {items.map((v) => (
                        <button
                          key={v}
                          className={view === v ? 'on' : ''}
                          onClick={() => {
                            setView(v);
                            if (v === 'tickets') setTicketHistory(null);
                          }}
                        >
                          <span className="nav-item">
                            <span className="ic">{ICONS[v]}</span>
                            {VIEW_LABEL[v]}
                          </span>
                          {badge(v) != null && <span className="badge">{badge(v)}</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </aside>

            <section className="admin-main">
              <div className="view-head">
                <span className="crumb">
                  {VIEW_LABEL[view]}
                </span>
                <button className="btn btn-line btn-sm" onClick={reload}>
                  ↻ Refresh
                </button>
              </div>
              {view === 'dashboard' && dashboardView}

              {view === 'map' && can('map') && (
                <>
                  <div className="panel mb">
                    <h2>Create booking (phone order)</h2>
                    <p className="hint mb">
                      For a customer who calls instead of using the app. An unknown number becomes a
                      customer account, and the closest verified technician is offered the job the
                      moment you save. Drag the pin on the map below first if the caller is not near
                      Meskel Square.
                    </p>
                    <form onSubmit={createBookingForCaller}>
                      <div className="form-grid">
                        <div className="field">
                          <label>Caller phone</label>
                          <input className="input" placeholder="09…" inputMode="tel"
                            value={newBooking.phone}
                            onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Caller name</label>
                          <input className="input" placeholder="who is calling"
                            value={newBooking.customerName}
                            onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })} />
                        </div>
                        <div className="field span-2">
                          <label>Service</label>
                          <select className="input" value={newBooking.categoryId}
                            onChange={(e) => setNewBooking({ ...newBooking, categoryId: e.target.value })}>
                            <option value="">Choose…</option>
                            {cats.filter((c) => c.isActive !== false).map((c) => (
                              <option key={c.id} value={c.id}>{c.nameEn}</option>
                            ))}
                          </select>
                        </div>
                        <div className="field span-2">
                          <label>Landmark</label>
                          <input className="input" placeholder="e.g. behind Edna Mall"
                            value={newBooking.landmark}
                            onChange={(e) => setNewBooking({ ...newBooking, landmark: e.target.value })} />
                        </div>
                        <div className="field span-full">
                          <label>What is broken?</label>
                          <input className="input" placeholder="in the caller's words"
                            value={newBooking.description}
                            onChange={(e) => setNewBooking({ ...newBooking, description: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-dark btn-sm"
                          disabled={newBooking.phone.trim().length < 9 || !newBooking.categoryId}>
                          + Create booking
                        </button>
                        <span className="hint">
                          pin {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                        </span>
                        <button type="button" className="link-btn"
                          onClick={() => setPin({ lat: 9.0108, lng: 38.7613 })}>
                          reset pin
                        </button>
                      </div>
                    </form>
                  </div>

                <div className="panel">
                  <h2>
                    Live dispatch map · {mapJobs.length} active job{mapJobs.length === 1 ? '' : 's'},{' '}
                    {mapTechs.length} technician{mapTechs.length === 1 ? '' : 's'} online
                  </h2>
                  <DispatchMap jobs={mapJobs} techs={mapTechs} />
                  </div>
                </>
              )}

              {view === 'bookings' && (
                <div className="panel">
                  <h2>Bookings ({filteredBookings.length})</h2>
                  <input
                    className="input mb"
                    style={{ maxWidth: 340 }}
                    placeholder="Search ref, customer, phone, technician…"
                    value={bookingFilter}
                    onChange={(e) => {
                      setBookingFilter(e.target.value);
                      setBookingPage(0);
                    }}
                  />
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Service</th>
                          <th>Customer</th>
                          <th>Technician</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedBookings.map((b) => (
                          <Fragment key={b.id}>
                            <tr
                              className={`row-open${openBooking === b.id ? ' on' : ''}`}
                              onClick={() => setOpenBooking(openBooking === b.id ? null : b.id)}
                            >
                              <td className="hint">
                                #{b.id.slice(-6).toUpperCase()}
                                {b.disputedAt && <span title="open ticket"> ⚑</span>}
                              </td>
                              <td>{b.category.nameEn}</td>
                              <td>
                                {b.customer?.name ?? '-'}
                                <div className="hint">{b.customer?.phone}</div>
                              </td>
                              <td>{b.provider?.user?.name ?? '-'}</td>
                              <td>
                                {b.payment
                                  ? `${MONEY(Number(b.payment.amountEtb))} ETB`
                                  : b.finalPriceEtb
                                    ? `${MONEY(Number(b.finalPriceEtb))} ETB`
                                    : '-'}
                              </td>
                              <td>
                                <StatusBadge status={b.status} />
                              </td>
                            </tr>
                            {openBooking === b.id && (
                              <tr className="row-detail">
                                <td colSpan={6}>
                                  <dl>
                                    <dt>Booked</dt>
                                    <dd>{fmtDate(b.createdAt)}</dd>
                                    <dt>Completed</dt>
                                    <dd>{b.completedAt ? fmtDate(b.completedAt) : '-'}</dd>
                                    <dt>What is wrong</dt>
                                    <dd>{b.description || '-'}</dd>
                                    <dt>Landmark</dt>
                                    <dd>{b.landmarkNote || '-'}</dd>
                                    <dt>Technician</dt>
                                    <dd>
                                      {b.provider?.user
                                        ? `${b.provider.user.name ?? 'unnamed'} · ${b.provider.user.phone}`
                                        : 'not assigned'}
                                    </dd>
                                    <dt>Payment</dt>
                                    <dd>
                                      {b.payment
                                        ? `${MONEY(Number(b.payment.amountEtb))} ETB · ${b.payment.gateway.toLowerCase()} · ${b.payment.status.toLowerCase()}`
                                        : 'not paid'}
                                    </dd>
                                    <dt>Commission</dt>
                                    <dd>
                                      {b.payment?.commissionEtb
                                        ? `${MONEY(Number(b.payment.commissionEtb))} ETB`
                                        : '-'}
                                    </dd>
                                    <dt>Rating</dt>
                                    <dd>{b.review ? `★ ${b.review.stars}` : 'not rated'}</dd>
                                  </dl>
                                  {b.customer && (
                                    <button
                                      type="button"
                                      className="link-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        loadContext(b.customer!.id);
                                        setView('tickets');
                                      }}
                                    >
                                      Open this customer →
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {bookingPages > 1 && (
                    <div className="pager">
                      <button
                        className="btn btn-line btn-sm"
                        disabled={bookingPage === 0}
                        onClick={() => setBookingPage((p) => Math.max(0, p - 1))}
                      >
                        ← Previous
                      </button>
                      <span className="hint">
                        {bookingPage * PAGE_SIZE + 1}-
                        {Math.min((bookingPage + 1) * PAGE_SIZE, filteredBookings.length)} of{' '}
                        {filteredBookings.length}
                      </span>
                      <button
                        className="btn btn-line btn-sm"
                        disabled={bookingPage >= bookingPages - 1}
                        onClick={() => setBookingPage((p) => Math.min(bookingPages - 1, p + 1))}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {view === 'technicians' && (
                <>
                  <div className="panel">
                  <h2>Add a technician</h2>
                  <p className="hint" style={{ marginBottom: '0.7rem' }}>
                    For professionals onboarded in person. They sign in with this phone number
                    (one-time code) - no password is issued. Dispatch can only reach them once
                    they go online in the app, which shares their position.
                  </p>
                  <form onSubmit={createTechnician}>
                    <div className="form-grid">
                      <div className="field span-2">
                        <label>Full name</label>
                        <input className="input" placeholder="e.g. Abebe Tesfaye" value={newTech.name}
                          onChange={(e) => setNewTech({ ...newTech, name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Phone</label>
                        <input className="input" placeholder="09…" inputMode="tel" value={newTech.phone}
                          onChange={(e) => setNewTech({ ...newTech, phone: e.target.value })} />
                      </div>
                      <div className="field span-2">
                        <label>Trade</label>
                        <select className="input" value={newTech.categoryId}
                          onChange={(e) => setNewTech({ ...newTech, categoryId: e.target.value })}>
                          <option value="">Choose…</option>
                          {cats.filter((c) => c.isActive !== false).map((c) => (
                            <option key={c.id} value={c.id}>{c.nameEn}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Service sub-city</label>
                        <select className="input" value={newTech.subCity}
                          onChange={(e) => setNewTech({ ...newTech, subCity: e.target.value })}>
                          <option value="">Choose…</option>
                          {SUB_CITIES.map((sc) => (
                            <option key={sc.name} value={sc.name}>{sc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Years of experience</label>
                        <input className="input" placeholder="e.g. 6" inputMode="numeric"
                          value={newTech.yearsExperience}
                          onChange={(e) => setNewTech({ ...newTech, yearsExperience: e.target.value.replace(/\D/g, '') })} />
                      </div>
                    </div>

                    {fullForm && (
                      <>
                        <div className="form-section">
                          <div className="sub-h">Personal details</div>
                          <div className="form-grid">
                            <div className="field">
                              <label>Gender</label>
                              <select className="input" value={newTech.gender}
                                onChange={(e) => setNewTech({ ...newTech, gender: e.target.value })}>
                                <option value="">Choose…</option>
                                <option value="MALE">Male</option>
                                <option value="FEMALE">Female</option>
                              </select>
                            </div>
                            <div className="field">
                              <label>ID type</label>
                              <select className="input" value={newTech.idType}
                                onChange={(e) => setNewTech({ ...newTech, idType: e.target.value })}>
                                <option value="FAYDA">Fayda / National</option>
                                <option value="KEBELE">Kebele ID</option>
                              </select>
                            </div>
                            <div className="field">
                              <label>ID number</label>
                              <input className="input" placeholder="ID number" value={newTech.idNumber}
                                onChange={(e) => setNewTech({ ...newTech, idNumber: e.target.value })} />
                            </div>
                            <div className="field span-2">
                              <label>Email (optional)</label>
                              <input className="input" type="email" placeholder="name@example.com" value={newTech.email}
                                onChange={(e) => setNewTech({ ...newTech, email: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Lives in</label>
                              <select className="input" value={newTech.residentialSubCity}
                                onChange={(e) => setNewTech({ ...newTech, residentialSubCity: e.target.value })}>
                                <option value="">Choose…</option>
                                {SUB_CITIES.map((sc) => (
                                  <option key={sc.name} value={sc.name}>{sc.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="field">
                              <label>Woreda</label>
                              <input className="input" placeholder="e.g. 04" value={newTech.residentialWoreda}
                                onChange={(e) => setNewTech({ ...newTech, residentialWoreda: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>House no.</label>
                              <input className="input" placeholder="e.g. 453" value={newTech.houseNumber}
                                onChange={(e) => setNewTech({ ...newTech, houseNumber: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        <div className="form-section">
                          <div className="sub-h">Skills and service area</div>
                          <div className="form-grid">
                            <div className="field span-2">
                              <label>Specialization</label>
                              <input className="input" placeholder="e.g. house wiring and breaker panels"
                                value={newTech.specialization}
                                onChange={(e) => setNewTech({ ...newTech, specialization: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Education</label>
                              <select className="input" value={newTech.educationLevel}
                                onChange={(e) => setNewTech({ ...newTech, educationLevel: e.target.value })}>
                                <option value="">Choose…</option>
                                <option value="TVET">TVET</option>
                                <option value="DIPLOMA">Diploma</option>
                                <option value="DEGREE">Degree</option>
                                <option value="ABOVE_DEGREE">Above degree</option>
                              </select>
                            </div>
                            <div className="field span-2">
                              <label>Certificates or licences</label>
                              <input className="input" placeholder="e.g. CoC Level III, TVET electrical"
                                value={newTech.certifications}
                                onChange={(e) => setNewTech({ ...newTech, certifications: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Service woreda</label>
                              <input className="input" placeholder="e.g. 04" value={newTech.woreda}
                                onChange={(e) => setNewTech({ ...newTech, woreda: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        <div className="form-section">
                          <div className="sub-h">Guarantor</div>
                          <div className="form-grid">
                            <div className="field span-2">
                              <label>Full name</label>
                              <input className="input" placeholder="Full name" value={newTech.guarantorName}
                                onChange={(e) => setNewTech({ ...newTech, guarantorName: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Relationship</label>
                              <input className="input" placeholder="e.g. brother" value={newTech.guarantorRelation}
                                onChange={(e) => setNewTech({ ...newTech, guarantorRelation: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Phone</label>
                              <input className="input" placeholder="09…" inputMode="tel" value={newTech.guarantorPhone}
                                onChange={(e) => setNewTech({ ...newTech, guarantorPhone: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Sub-city</label>
                              <select className="input" value={newTech.guarantorSubCity}
                                onChange={(e) => setNewTech({ ...newTech, guarantorSubCity: e.target.value })}>
                                <option value="">Choose…</option>
                                {SUB_CITIES.map((sc) => (
                                  <option key={sc.name} value={sc.name}>{sc.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="field">
                              <label>Woreda</label>
                              <input className="input" placeholder="e.g. 02" value={newTech.guarantorWoreda}
                                onChange={(e) => setNewTech({ ...newTech, guarantorWoreda: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>House no.</label>
                              <input className="input" placeholder="e.g. 117" value={newTech.guarantorHouseNo}
                                onChange={(e) => setNewTech({ ...newTech, guarantorHouseNo: e.target.value })} />
                            </div>
                            <div className="field">
                              <label>Their ID number</label>
                              <input className="input" placeholder="ID number" value={newTech.guarantorIdNumber}
                                onChange={(e) => setNewTech({ ...newTech, guarantorIdNumber: e.target.value })} />
                            </div>
                          </div>
                        </div>

                        <div className="form-section">
                          <div className="sub-h">Declaration</div>
                          <p className="hint mb">
                            Type the name the applicant signed the paper form under. Your own account
                            is recorded as the registrar automatically.
                          </p>
                          <div className="form-grid">
                            <div className="field span-2">
                              <label>Name on the signature line</label>
                              <input className="input" placeholder="Full name as signed"
                                value={newTech.declarationName}
                                onChange={(e) => setNewTech({ ...newTech, declarationName: e.target.value })} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="form-actions">
                      <button className="btn btn-dark btn-sm"
                        disabled={newTech.name.trim().length < 2 || newTech.phone.trim().length < 9 || !newTech.categoryId}>
                        + Add technician
                      </button>
                      <label className="check">
                        <input type="checkbox" checked={newTech.verified}
                          onChange={(e) => setNewTech({ ...newTech, verified: e.target.checked })} />
                        documents already vetted
                      </label>
                      <button type="button" className="link-btn" onClick={() => setFullForm(!fullForm)}>
                        {fullForm ? 'hide the rest of the form' : 'fill the whole registration form'}
                      </button>
                    </div>
                  </form>
                  </div>

                  <div className="panel">
                  <div className="spread mb">
                    <h2 style={{ margin: 0 }}>
                      Technicians ({techRows.length}
                      {techRows.length !== technicians.length ? ` of ${technicians.length}` : ''})
                    </h2>
                    <span className="row" style={{ gap: '0.5rem' }}>
                      <input
                        className="input"
                        style={{ maxWidth: 260 }}
                        placeholder="Search name, phone, trade, sub-city…"
                        value={techFilter}
                        onChange={(e) => setTechFilter(e.target.value)}
                      />
                      <button
                        type="button"
                        className={`btn btn-sm ${techGrouped ? 'btn-dark' : 'btn-line'}`}
                        onClick={() => setTechGrouped(!techGrouped)}
                        title="Group the list by trade"
                      >
                        Group by trade
                      </button>
                    </span>
                  </div>
                  <p className="hint mb">
                    <span className="dot-on" /> online and taking jobs ·{' '}
                    <span className="dot-off" /> offline
                  </p>
                  <div className="table-scroll-y scroll-cap" style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Trade</th>
                          <th>Sub-city</th>
                          <th>Status</th>
                          <th>Rating</th>
                          <th>Jobs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {techRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="hint">
                              No technician matches “{techFilter}”.
                            </td>
                          </tr>
                        )}
                        {(techGrouped
                          ? Object.entries(techByTrade).sort(([a], [b]) => a.localeCompare(b))
                          : [['', techRows] as [string, Technician[]]]
                        ).map(([trade, rows]) => (
                          <Fragment key={trade || 'all'}>
                            {trade && (
                              <tr className="group-head">
                                <td colSpan={6}>
                                  {trade} <span className="hint">({rows.length})</span>
                                </td>
                              </tr>
                            )}
                            {rows.map((t) => (
                              <Fragment key={t.id}>
                                <tr
                                  className={`row-open${openTech === t.id ? ' on' : ''}`}
                                  onClick={() => setOpenTech(openTech === t.id ? null : t.id)}
                                >
                                  <td>
                                    <span
                                      className={
                                        t.isAvailable && t.verificationStatus === 'VERIFIED'
                                          ? 'dot-on'
                                          : 'dot-off'
                                      }
                                      title={
                                        t.isAvailable && t.verificationStatus === 'VERIFIED'
                                          ? 'online'
                                          : 'offline'
                                      }
                                    />
                                    {t.name ?? '-'}
                                    <div className="hint">{t.phone}</div>
                                  </td>
                                  <td>{t.category.nameEn}</td>
                                  <td>{t.subCity ?? '-'}</td>
                                  <td className="hint">{t.verificationStatus.toLowerCase()}</td>
                                  <td>{t.ratingCount ? `★ ${t.ratingAvg.toFixed(1)} (${t.ratingCount})` : '-'}</td>
                                  <td>{t.jobs}</td>
                                </tr>
                                {openTech === t.id && (
                                  <tr className="row-detail">
                                    <td colSpan={6}>
                                      <dl>
                                        <dt>Phone</dt>
                                        <dd>{t.phone}</dd>
                                        <dt>Trade</dt>
                                        <dd>
                                          {t.category.nameEn} · {t.category.nameAm}
                                        </dd>
                                        <dt>Service area</dt>
                                        <dd>{t.subCity ?? 'not set'}</dd>
                                        <dt>Vetting</dt>
                                        <dd>{t.verificationStatus.toLowerCase()}</dd>
                                        <dt>Dispatch</dt>
                                        <dd>
                                          {t.isAvailable ? 'online - receiving offers' : 'offline'}
                                        </dd>
                                        <dt>Jobs done</dt>
                                        <dd>{t.jobs}</dd>
                                        <dt>Rating</dt>
                                        <dd>
                                          {t.ratingCount
                                            ? `★ ${t.ratingAvg.toFixed(1)} from ${t.ratingCount} reviews`
                                            : 'no reviews yet'}
                                        </dd>
                                        <dt>Last seen</dt>
                                        <dd>
                                          {t.locationUpdatedAt ? fmtDate(t.locationUpdatedAt) : 'never shared GPS'}
                                        </dd>
                                        <dt>Joined</dt>
                                        <dd>{fmtDate(t.createdAt)}</dd>
                                      </dl>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                </>
              )}

              {view === 'verification' && can('verification') && verificationTable(verifRows)}

              {view === 'tickets' && can('tickets') && (
                <>
                  <div className="panel mb">
                    <div className="spread mb">
                      <h2>New support case</h2>
                      {context && (
                        <button className="btn btn-line btn-sm" onClick={() => setContext(null)}>
                          Close customer view
                        </button>
                      )}
                    </div>
                    <p className="hint mb">
                      Raise a case from a phone call. Paste the booking reference the customer reads
                      out - the six characters after the # - or open a booking below to load their
                      whole history first.
                    </p>
                    <form onSubmit={createCase}>
                      <div className="form-grid">
                        <div className="field span-2">
                          <label>Booking reference</label>
                          <input className="input" placeholder="the six characters after the #"
                            value={newCase.bookingId}
                            onChange={(e) => setNewCase({ ...newCase, bookingId: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Case type</label>
                          <select className="input" value={newCase.type}
                            onChange={(e) => setNewCase({ ...newCase, type: e.target.value })}>
                            <option value="DISPUTE">Dispute</option>
                            <option value="GUARANTEE_CLAIM">Guarantee claim</option>
                            <option value="SAFETY">Safety</option>
                          </select>
                        </div>
                        <div className="field span-full">
                          <label>What did the customer report?</label>
                          <input className="input" placeholder="in their words"
                            value={newCase.note}
                            onChange={(e) => setNewCase({ ...newCase, note: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-dark btn-sm"
                          disabled={newCase.bookingId.trim().length < 6 || newCase.note.trim().length < 5}>
                          Open case
                        </button>
                      </div>
                    </form>
                  </div>

                  {context && (
                    <div className="panel mb">
                      <div className="spread mb">
                        <h2>
                          {context.customer.name ?? 'Customer'}{' '}
                          <span className="hint">{context.customer.phone}</span>
                        </h2>
                        <span className="hint">
                          customer since {fmtDate(context.customer.createdAt)}
                        </span>
                      </div>
                      <div className="tiles" style={{ marginBottom: '1rem' }}>
                        {tile(context.stats.bookings, 'bookings')}
                        {tile(context.stats.completed, 'completed')}
                        {tile(context.stats.cancelled, 'cancelled')}
                        {tile(`${MONEY(context.stats.lifetimeSpendEtb)} ETB`, 'lifetime spend')}
                        {tile(context.stats.openCases, 'open cases')}
                      </div>

                      <h3 className="sub-h">Booking history</h3>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Booking</th>
                              <th>Status</th>
                              <th>Technician</th>
                              <th>Paid</th>
                              <th>Rating</th>
                              <th>When</th>
                            </tr>
                          </thead>
                          <tbody>
                            {context.bookings.map((b) => (
                              <tr key={b.id}>
                                <td>
                                  #{b.ref}
                                  <div className="hint">{b.category}</div>
                                </td>
                                <td>
                                  <StatusBadge status={b.status} />
                                </td>
                                <td>{b.technician ?? '-'}</td>
                                <td>{b.amountEtb ? `${MONEY(b.amountEtb)} ETB` : '-'}</td>
                                <td>{b.stars ? `★ ${b.stars}` : '-'}</td>
                                <td className="hint">{fmtDate(b.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <h3 className="sub-h mt">Communication timeline</h3>
                      {context.cases.length === 0 ? (
                        <p className="hint">No cases have ever been opened on this account.</p>
                      ) : (
                        context.cases.map((c) => (
                          <div key={c.id} className="booking-row" style={{ cursor: 'default' }}>
                            <span>
                              <span className="what">
                                {c.type.replace(/_/g, ' ').toLowerCase()} ·{' '}
                                <span className="hint">{c.status.toLowerCase()}</span>
                              </span>
                              <span className="when" style={{ display: 'block' }}>
                                {fmtDate(c.createdAt)}
                                {c.resolvedAt ? ` · closed ${fmtDate(c.resolvedAt)}` : ''}
                                {c.refundEtb ? ` · refunded ${MONEY(c.refundEtb)} ETB` : ''}
                              </span>
                              <span className="hint" style={{ display: 'block' }}>
                                {c.note}
                                {c.resolutionNote ? ` → ${c.resolutionNote}` : ''}
                              </span>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="panel">
                    <h2>Open tickets ({tickets.length})</h2>
                    {refundCap != null && role === 'SUPPORT_AGENT' && (
                      <p className="hint">
                        You can record refunds up to ETB {refundCap} independently - larger amounts
                        need Ops or the Super Admin.
                      </p>
                    )}
                    {tickets.length === 0 && <p className="hint">No open disputes or guarantee claims.</p>}
                    {tickets.map((t) => ticketRow(t))}
                  </div>
                  <div className="panel">
                    <h2>Resolved history</h2>
                    {ticketHistory === null ? (
                      <button className="btn btn-line btn-sm" onClick={loadTicketHistory}>
                        Load history
                      </button>
                    ) : ticketHistory.length === 0 ? (
                      <p className="hint">No resolved tickets yet.</p>
                    ) : (
                      ticketHistory.slice(0, 20).map((t) => ticketRow(t, true))
                    )}
                  </div>
                </>
              )}

              {view === 'deposits' && can('deposits') && (
                <>
                  <div className="panel mb" id="record-deposit">
                    <h2>Record a deposit</h2>
                    <p className="hint mb">
                      The technician keeps the customer cash at the door, so what they owe us is
                      commission. They pay it into the company account and we credit it here. Check
                      the reference against the bank statement first - confirming moves the balance
                      straight away.
                    </p>
                    <form onSubmit={recordDeposit}>
                      <div className="form-grid">
                        <div className="field span-2">
                          <label>Technician</label>
                          {/* a plain select means scrolling 30 names; this lets
                              the officer type a name or a phone number */}
                          <input
                            className="input"
                            list="technician-options"
                            placeholder="Type a name or phone number…"
                            value={techQuery}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTechQuery(value);
                              const picked = technicians.find(
                                (t) => techOptionLabel(t) === value || t.phone === value.trim(),
                              );
                              setNewDeposit({ ...newDeposit, providerId: picked?.id ?? '' });
                            }}
                          />
                          <datalist id="technician-options">
                            {technicians.map((t) => (
                              <option key={t.id} value={techOptionLabel(t)} />
                            ))}
                          </datalist>
                          {techQuery && !newDeposit.providerId && (
                            <span className="field-help" style={{ color: 'var(--err-fg)' }}>
                              Pick a technician from the list.
                            </span>
                          )}
                        </div>
                        <div className="field">
                          <label>Amount (ETB)</label>
                          <input className="input" placeholder="e.g. 1500" inputMode="numeric"
                            value={newDeposit.amountEtb}
                            onChange={(e) => setNewDeposit({ ...newDeposit, amountEtb: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Paid by</label>
                          <select className="input" value={newDeposit.method}
                            onChange={(e) => setNewDeposit({ ...newDeposit, method: e.target.value })}>
                            <option value="BANK_TRANSFER">Bank transfer</option>
                            <option value="TELEBIRR">Telebirr</option>
                            <option value="CBE_BIRR">CBE Birr</option>
                            <option value="CASH_OFFICE">Cash at office</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>Bank reference</label>
                          <input className="input" placeholder="e.g. FT25091234567"
                            value={newDeposit.reference}
                            onChange={(e) => setNewDeposit({ ...newDeposit, reference: e.target.value })} />
                        </div>
                        <div className="field span-2">
                          <label>Note (optional)</label>
                          <input className="input" placeholder="anything finance should know"
                            value={newDeposit.note}
                            onChange={(e) => setNewDeposit({ ...newDeposit, note: e.target.value })} />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button className="btn btn-dark btn-sm"
                          disabled={
                            !newDeposit.providerId ||
                            Number(newDeposit.amountEtb) < 1 ||
                            newDeposit.reference.trim().length < 3
                          }>
                          + Record deposit
                        </button>
                        <label className="check">
                          <input type="checkbox" checked={newDeposit.confirmNow}
                            onChange={(e) => setNewDeposit({ ...newDeposit, confirmNow: e.target.checked })} />
                          credit the balance now
                        </label>
                      </div>
                    </form>
                  </div>

                  <div className="panel mb">
                    <div className="spread mb">
                      <h2 style={{ margin: 0 }}>
                        Deposits ({deposits.filter((d) => d.status === 'PENDING').length} waiting)
                      </h2>
                      <input
                        className="input"
                        style={{ maxWidth: 260 }}
                        placeholder="Search technician, reference…"
                        value={depositFilter}
                        onChange={(e) => setDepositFilter(e.target.value)}
                      />
                    </div>
                    {deposits.length === 0 && <p className="hint">No deposits recorded yet.</p>}
                    {deposits.length > 0 && depositRows.length === 0 && (
                      <p className="hint">Nothing matches “{depositFilter}”.</p>
                    )}
                    <div className="list-scroll scroll-cap">
                    {depositRows.map((d) => (
                      <div key={d.id} className="booking-row" style={{ cursor: 'default' }}>
                        <span>
                          <span className="what">
                            {MONEY(Number(d.amountEtb))} ETB ·{' '}
                            {d.wallet.provider.user.name ?? d.wallet.provider.user.phone}{' '}
                            <span
                              className={`pill ${
                                d.status === 'CONFIRMED'
                                  ? 'ok'
                                  : d.status === 'REJECTED'
                                    ? 'danger'
                                    : 'warn'
                              }`}
                            >
                              {d.status.toLowerCase()}
                            </span>
                          </span>
                          <span className="when" style={{ display: 'block' }}>
                            {d.method.replace(/_/g, ' ').toLowerCase()} · ref {d.reference} ·{' '}
                            {fmtDate(d.createdAt)}
                            {d.recordedBy ? ` · by ${d.recordedBy.name ?? d.recordedBy.username}` : ''}
                          </span>
                          {d.note && (
                            <span className="hint" style={{ display: 'block' }}>
                              {d.note}
                            </span>
                          )}
                        </span>
                        {d.status === 'PENDING' && (
                          <span className="row">
                            <button
                              className="btn btn-teal btn-sm"
                              onClick={() => act(`/admin/deposits/${d.id}/confirm`)}
                            >
                              Confirm ✓
                            </button>
                            <button
                              className="btn btn-line btn-sm"
                              onClick={() => act(`/admin/deposits/${d.id}/reject`)}
                            >
                              Reject
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="spread mb">
                      <h2 style={{ margin: 0 }}>
                        Commission balances{arrearsOnly ? ' · in the red' : ''}
                      </h2>
                      <span className="row" style={{ gap: '0.5rem' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${arrearsOnly ? 'btn-dark' : 'btn-line'}`}
                          onClick={() => setArrearsOnly(!arrearsOnly)}
                        >
                          Only in the red
                        </button>
                        <input
                          className="input"
                          style={{ maxWidth: 240 }}
                          placeholder="Search technician, trade…"
                          value={balanceFilter}
                          onChange={(e) => setBalanceFilter(e.target.value)}
                        />
                      </span>
                    </div>
                    <p className="hint mb">
                      Lowest first. Dispatch stops offering jobs below{' '}
                      {MONEY(balances?.minBalanceEtb ?? 0)} ETB, so anyone marked blocked has to top
                      up before they can work again.
                    </p>
                    <div className="table-scroll-y scroll-cap" style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Technician</th>
                            <th>Trade</th>
                            <th>Balance</th>
                            <th>Dispatch</th>
                            <th aria-label="Top up" />
                          </tr>
                        </thead>
                        <tbody>
                          {balanceRows.length === 0 && (
                            <tr>
                              <td colSpan={5} className="hint">
                                {arrearsOnly
                                  ? 'Nobody is in the red.'
                                  : `Nothing matches “${balanceFilter}”.`}
                              </td>
                            </tr>
                          )}
                          {balanceRows.map((w) => (
                            <tr key={w.id}>
                              <td>
                                {w.technician}
                                <div className="hint">{w.phone}</div>
                              </td>
                              <td>{w.trade ?? '-'}</td>
                              <td className={w.balanceEtb < 0 ? 'owing' : undefined}>
                                {MONEY(w.balanceEtb)} ETB
                              </td>
                              <td>
                                <span className={`pill ${w.blocked ? 'danger' : 'ok'}`}>
                                  {w.blocked ? 'blocked' : 'active'}
                                </span>
                              </td>
                              <td>
                                {w.blocked && (
                                  <button
                                    className="btn btn-teal btn-sm"
                                    onClick={() => startTopUp(w.phone)}
                                  >
                                    Record top-up
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!balances?.wallets.length && (
                      <p className="hint">No technician has a commission account yet.</p>
                    )}
                  </div>
                </>
              )}

              {view === 'reviews' && can('reviews') && (
                <div className="panel">
                  <h2>Review moderation ({reviews.length})</h2>
                  {reviews.length === 0 && <p className="hint">No reviews pending moderation.</p>}
                  {reviews.map((r) => (
                    <div key={r.id} className="booking-row" style={{ cursor: 'default' }}>
                      <span>
                        <span className="what">
                          {'★'.repeat(r.stars)}
                          {'☆'.repeat(5 - r.stars)}
                        </span>
                        <span className="when" style={{ display: 'block' }}>
                          {r.text ?? '(no text)'} - {fmtDate(r.createdAt)}
                        </span>
                      </span>
                      <span className="row">
                        <button className="btn btn-teal btn-sm" onClick={() => act(`/admin/reviews/${r.id}/publish`)}>
                          Publish
                        </button>
                        <button className="btn btn-line btn-sm" onClick={() => act(`/admin/reviews/${r.id}/reject`)}>
                          Reject
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {view === 'categories' && can('categories') && (
                <div className="panel">
                  <h2>Categories & pricing</h2>
                  <p className="hint">
                    The floor price is the &quot;from ETB…&quot; estimate customers see at booking
                    time. Sub-services feed the search box. Changes apply immediately and are
                    audit-logged.
                  </p>
                  <form
                    className="row cat-create"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const nameEn = String(f.get('nameEn') ?? '').trim();
                      const nameAm = String(f.get('nameAm') ?? '').trim();
                      if (nameEn.length < 2 || !nameAm) {
                        setError('English and Amharic names are required.');
                        return;
                      }
                      await act(
                        '/admin/categories',
                        {
                          nameEn,
                          nameAm,
                          priceFloorEtb: Number(f.get('floor') || 250),
                          subServices: String(f.get('subs') ?? '')
                            .split(',')
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                        'POST',
                      );
                      (e.target as HTMLFormElement).reset();
                    }}
                  >
                    <input className="input" name="nameEn" style={{ maxWidth: 180 }} placeholder="New category (English)" />
                    <input className="input" name="nameAm" style={{ maxWidth: 160 }} placeholder="ስም (Amharic)" />
                    <input className="input" name="floor" style={{ maxWidth: 110 }} placeholder="Floor ETB" inputMode="numeric" />
                    <input className="input" name="subs" style={{ minWidth: 220, flex: 1 }} placeholder="Sub-services, comma-separated" />
                    <button className="btn btn-dark btn-sm">+ Add category</button>
                  </form>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Floor price (ETB)</th>
                          <th>Sub-services</th>
                          <th>Active</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cats.map((c) => (
                          <tr key={c.id}>
                            <td>
                              {c.nameEn}
                              <div className="hint" style={{ fontFamily: 'var(--font-am)' }}>{c.nameAm}</div>
                            </td>
                            <td>
                              <input
                                className="input"
                                style={{ maxWidth: 110 }}
                                inputMode="numeric"
                                value={catEdit[c.id] ?? String(c.priceFloorEtb ?? '')}
                                onChange={(e) => setCatEdit((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                style={{ minWidth: 220 }}
                                placeholder="Sub-services, comma-separated"
                                value={subsEdit[c.id] ?? (c.subServices ?? []).join(', ')}
                                onChange={(e) => setSubsEdit((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              />
                            </td>
                            <td>{c.isActive === false ? <span className="hint">inactive</span> : 'yes'}</td>
                            <td>
                              <span className="row" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-dark btn-sm"
                                  onClick={() =>
                                    act(
                                      `/admin/categories/${c.id}`,
                                      {
                                        priceFloorEtb: Number(catEdit[c.id] ?? c.priceFloorEtb),
                                        subServices: (subsEdit[c.id] ?? (c.subServices ?? []).join(', '))
                                          .split(',')
                                          .map((x: string) => x.trim())
                                          .filter(Boolean),
                                      },
                                      'PUT',
                                    )
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-line btn-sm"
                                  onClick={() => act(`/admin/categories/${c.id}`, { isActive: c.isActive === false }, 'PUT')}
                                >
                                  {c.isActive === false ? 'Activate' : 'Deactivate'}
                                </button>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === 'finance' && can('finance') && (
                <>
                  <div className="panel mb">
                    <div className="spread">
                      <div>
                        <h2 style={{ marginBottom: '0.1rem' }}>
                          {financeLabel}
                        </h2>
                        <p className="hint" style={{ margin: 0 }}>
                          Pick any window - the figures, the table and the export all follow it.
                        </p>
                      </div>
                      <span className="row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
                        {(
                          [
                            ['Today', 0],
                            ['Last 7 days', 6],
                            ['Last 30 days', 29],
                          ] as [string, number][]
                        ).map(([label, back]) => (
                          <button
                            key={label}
                            type="button"
                            className={`btn btn-sm ${
                              isRangePreset(back) ? 'btn-dark' : 'btn-line'
                            }`}
                            onClick={() => setRange(presetRange(back))}
                          >
                            {label}
                          </button>
                        ))}
                        <input
                          className="input"
                          type="date"
                          style={{ maxWidth: 160 }}
                          value={range.from}
                          max={range.to || undefined}
                          onChange={(e) => setRange({ ...range, from: e.target.value })}
                        />
                        <span className="hint" style={{ alignSelf: 'center' }}>
                          to
                        </span>
                        <input
                          className="input"
                          type="date"
                          style={{ maxWidth: 160 }}
                          value={range.to}
                          min={range.from || undefined}
                          onChange={(e) => setRange({ ...range, to: e.target.value })}
                        />
                        {(range.from || range.to) && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setRange({ from: '', to: '' })}
                          >
                            back to today
                          </button>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="tiles">
                    {tile(
                      `${MONEY(finance?.collectedTodayEtb ?? 0)} ETB`,
                      'collected',
                      false,
                      finance ? `${finance.completedToday} paid jobs` : undefined,
                    )}
                    {tile(
                      `${MONEY(finance?.commissionTodayEtb ?? 0)} ETB`,
                      'commission earned',
                      false,
                      'from jobs settled in this window',
                    )}
                    {tile(
                      `${MONEY(finance?.depositsTodayEtb ?? 0)} ETB`,
                      'deposits confirmed',
                      false,
                      finance
                        ? `${finance.depositsPendingCount} waiting \u00b7 ${MONEY(finance.depositsPendingEtb)} ETB`
                        : undefined,
                    )}
                    <button
                      type="button"
                      className="tile as-link danger"
                      key="arrears"
                      title="See exactly who is in the red"
                      onClick={() => {
                        setArrearsOnly(true);
                        setBalanceFilter('');
                        setView('deposits');
                      }}
                    >
                      <div className="v">{MONEY(finance?.arrearsEtb ?? 0)} ETB</div>
                      <div className="k">commission in arrears</div>
                      <div className="s">
                        {finance ? `${finance.arrearsCount} technicians in the red - see who` : ''}
                      </div>
                    </button>
                    {tile(
                      (finance?.exceptions.unpaidJobs ?? 0) + (finance?.exceptions.openRefunds ?? 0),
                      'exceptions',
                      false,
                      finance
                        ? `${finance.exceptions.openRefunds} refund · ${finance.exceptions.unpaidJobs} unpaid`
                        : undefined,
                    )}
                  </div>

                  <div className="panel">
                    <div className="spread mb">
                      <h2 style={{ margin: 0 }}>Payment queue</h2>
                      <span className="row" style={{ gap: '0.5rem' }}>
                        <input
                          className="input"
                          style={{ maxWidth: 240 }}
                          placeholder="Search technician, booking, service…"
                          value={ledgerFilter}
                          onChange={(e) => setLedgerFilter(e.target.value)}
                        />
                        <button className="btn btn-primary btn-sm" onClick={exportFinance}>
                          Export report
                        </button>
                      </span>
                    </div>
                    <p className="hint mb">
                      The technician collects the full amount from the customer in cash. We take{' '}
                      {system ? Math.round(system.money.commissionRate * 100) : 14}% commission from
                      their deposit balance when the job settles.
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Booking</th>
                            <th>Technician</th>
                            <th>Customer paid</th>
                            <th>Commission to us</th>
                            <th>Technician keeps</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerRows.length === 0 && (
                            <tr>
                              <td colSpan={5} className="hint">
                                Nothing matches this window{ledgerFilter ? ` and “${ledgerFilter}”` : ''}.
                              </td>
                            </tr>
                          )}
                          {ledgerRows.map((r) => (
                            <tr key={r.id}>
                              <td>
                                #{r.ref}
                                <div className="hint">{r.category}</div>
                              </td>
                              <td>{r.technician ?? '-'}</td>
                              <td>
                                {r.customerPaidEtb ? `${MONEY(r.customerPaidEtb)} ETB` : '-'}
                                {r.gateway && <div className="hint">{r.gateway.toLowerCase()}</div>}
                              </td>
                              <td>
                                {r.commissionEtb ? `${MONEY(r.commissionEtb)} ETB` : '-'}
                              </td>
                              <td>
                                {r.technicianKeepsEtb !== null
                                  ? `${MONEY(r.technicianKeepsEtb)} ETB`
                                  : '-'}
                              </td>
                              <td>
                                <span
                                  className={r.state === 'READY' ? 'pill ok' : 'pill danger'}
                                >
                                  {r.state === 'READY' ? 'Ready' : 'Payment issue'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {finance && finance.queue.length === 0 && (
                            <tr>
                              <td colSpan={5} className="hint">
                                No completed jobs yet today.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {view === 'system' && can('system') && (
                <>
                  <div className="panel mb">
                    <h2>Service health · የአገልግሎት ሁኔታ</h2>
                    <p className="hint mb">
                      What is switched on right now. A service that is off is not broken - it is
                      waiting on credentials.
                      <span className="am-cell">
                        አሁን የሚሰሩት አገልግሎቶች። የጠፋ አገልግሎት አልተበላሸም - ፈቃድ እየተጠበቀ ነው።
                      </span>
                    </p>
                    <div className="sys-grid">
                      {[
                        {
                          label: 'SMS gateway',
                          on: (system?.services.sms ?? 'console') !== 'console',
                          detail:
                            system?.services.sms === 'console'
                              ? 'console only - codes reach the log, not the customer'
                              : `${system?.services.sms} · notifications ${system?.services.smsNotifications ? 'on' : 'OTP only'}`,
                        },
                        {
                          label: 'Telegram bot',
                          on: !!system?.services.telegramBot,
                          detail: system?.services.telegramBot ? 'running' : 'BOT_TOKEN not set',
                        },
                        {
                          label: 'Cash payments',
                          on: true,
                          detail: 'always available',
                        },
                        {
                          label: 'Chapa',
                          on: !!system?.services.payments.chapa,
                          detail: system?.services.payments.chapa ? 'connected' : 'merchant keys pending',
                        },
                        {
                          label: 'Telebirr',
                          on: !!system?.services.payments.telebirr,
                          detail: system?.services.payments.telebirr ? 'connected' : 'merchant keys pending',
                        },
                      ].map((x) => (
                        <div key={x.label} className="sys-card">
                          <span className={x.on ? 'dot on' : 'dot off'} aria-hidden />
                          <span>
                            <b>{x.label}</b>
                            {/* the on/off word in both languages - staff read one
                                or the other, and this is the line that matters */}
                            <span className={`pill ${x.on ? 'ok' : 'warn'}`}>
                              {x.on ? 'On · በስራ ላይ' : 'Off · አልተጀመረም'}
                            </span>
                            <small>{x.detail}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel mb">
                    <h2>Dispatch rules</h2>
                    <p className="hint mb">
                      These drive live dispatch. The offer window is how long the closest technician
                      has to accept before the job escalates to the Ops queue for manual assignment.
                      The minimum deposit balance is the commission credit a technician must still
                      hold to keep being offered work.
                    </p>
                    <form onSubmit={saveRules} className="form-grid" style={{ alignItems: 'end' }}>
                      <div className="field" style={{ maxWidth: 200 }}>
                        <label>Offer window (min)</label>
                        <input
                          className="input"
                          inputMode="numeric"
                          placeholder={String(system?.dispatch.offerWindowMinutes ?? 5)}
                          value={rules.offerWindowMinutes}
                          onChange={(e) =>
                            setRules({ ...rules, offerWindowMinutes: e.target.value.replace(/\D/g, '') })
                          }
                        />
                      </div>
                      <div className="field" style={{ maxWidth: 210 }}>
                        <label>Offers before escalation</label>
                        <input
                          className="input"
                          inputMode="numeric"
                          placeholder={String(system?.dispatch.escalateAfterAttempts ?? 1)}
                          value={rules.escalateAfterAttempts}
                          onChange={(e) =>
                            setRules({ ...rules, escalateAfterAttempts: e.target.value.replace(/\D/g, '') })
                          }
                        />
                      </div>
                      <div className="field" style={{ maxWidth: 200 }}>
                        <label>Arrival target (min)</label>
                        <input
                          className="input"
                          inputMode="numeric"
                          placeholder={String(system?.dispatch.arrivalTargetMinutes ?? 30)}
                          value={rules.arrivalTargetMinutes}
                          onChange={(e) =>
                            setRules({ ...rules, arrivalTargetMinutes: e.target.value.replace(/\D/g, '') })
                          }
                        />
                      </div>
                      <div className="field" style={{ maxWidth: 180 }}>
                        <label>Working hours</label>
                        <input
                          className="input"
                          placeholder={system?.dispatch.workingHours ?? '06:00-20:00'}
                          value={rules.workingHours}
                          onChange={(e) => setRules({ ...rules, workingHours: e.target.value })}
                        />
                      </div>
                      <div className="field" style={{ maxWidth: 210 }}>
                        <label>Minimum deposit balance (ETB)</label>
                        <input
                          className="input"
                          inputMode="numeric"
                          placeholder={String(system?.dispatch.minWalletBalanceEtb ?? 0)}
                          value={rules.minWalletBalanceEtb}
                          onChange={(e) =>
                            setRules({
                              ...rules,
                              minWalletBalanceEtb: e.target.value.replace(/\D/g, ''),
                            })
                          }
                        />
                      </div>
                      <button className="btn btn-dark btn-sm" style={{ alignSelf: 'center' }}>
                        Save rules
                      </button>
                    </form>
                    <p className="hint">
                      Support refund cap {MONEY(system?.money.supportRefundCapEtb ?? 500)} ETB
                    </p>
                  </div>

                  <div className="panel mb">
                    <h2>Controlled approvals</h2>
                    <div className="sys-grid">
                      <button className="sys-card as-btn" onClick={() => setView('verification')}>
                        <span>
                          <b>Technician verification</b>
                          <small>Approve skills and documents, suspend with a reason</small>
                        </span>
                        {!!system?.pending.vetting && (
                          <span className="pill warn">{system.pending.vetting} pending</span>
                        )}
                      </button>
                      <button className="sys-card as-btn" onClick={() => setView('tickets')}>
                        <span>
                          <b>Open support cases</b>
                          <small>Disputes, guarantee claims and re-inspections</small>
                        </span>
                        {!!system?.pending.tickets && (
                          <span className="pill warn">{system.pending.tickets} open</span>
                        )}
                      </button>
                      <button className="sys-card as-btn" onClick={() => setView('staff')}>
                        <span>
                          <b>Roles and permissions</b>
                          <small>
                            {system?.scale.staff ?? 0} staff accounts, each limited to their own views
                          </small>
                        </span>
                      </button>
                      <button className="sys-card as-btn" onClick={() => setView('audit')}>
                        <span>
                          <b>Audit log</b>
                          <small>
                            Every override, price change and account action
                            {system?.lastAuditEntry
                              ? ` · last ${fmtDate(system.lastAuditEntry)}`
                              : ''}
                          </small>
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="panel">
                    <h2>Platform at a glance</h2>
                    <div className="tiles" style={{ marginTop: '0.6rem' }}>
                      {tile(system?.scale.customers ?? '…', 'customers')}
                      {tileLink(system?.scale.technicians ?? '…', 'technicians', 'technicians')}
                      {tileLink(system?.scale.bookings ?? '…', 'bookings all time', 'bookings')}
                      {tileLink(system?.scale.staff ?? '…', 'staff accounts', 'staff')}
                    </div>
                  </div>
                </>
              )}

              {view === 'staff' && can('staff') && (
                <div className="panel">
                  <h2>Staff accounts ({staff.length})</h2>
                  {staff.map((m) => (
                    <div key={m.id}>
                      <div className="booking-row" style={{ cursor: 'default' }}>
                        <span>
                          <span className="what">
                            {m.name ?? m.username} · <code>{m.username}</code>{' '}
                            {m.disabledAt && <span className="pill danger">disabled</span>}
                          </span>
                          <span className="when" style={{ display: 'block' }}>
                            {m.role.replace(/_/g, ' ').toLowerCase()}
                            {m.subCity ? ` · ${m.subCity}` : ''} · {m.phone} · since{' '}
                            {fmtDate(m.createdAt)}
                          </span>
                        </span>
                        <span className="row">
                          <button
                            className="btn btn-line btn-sm"
                            onClick={() =>
                              setEditStaff(
                                editStaff?.id === m.id
                                  ? null
                                  : {
                                      id: m.id,
                                      name: m.name ?? '',
                                      phone: m.phone,
                                      role: m.role,
                                      subCity: m.subCity ?? '',
                                      password: '',
                                    },
                              )
                            }
                          >
                            {editStaff?.id === m.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            className={m.disabledAt ? 'btn btn-teal btn-sm' : 'btn btn-line btn-sm'}
                            onClick={() => toggleStaff(m)}
                          >
                            {m.disabledAt ? 'Enable' : 'Disable'}
                          </button>
                        </span>
                      </div>

                      {editStaff?.id === m.id && (
                        <form
                          onSubmit={updateStaff}
                          className="row"
                          style={{
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            padding: '0.7rem 0 1rem',
                            borderBottom: '1px solid var(--line)',
                          }}
                        >
                          <input
                            className="input"
                            style={{ maxWidth: 160 }}
                            placeholder="Full name"
                            value={editStaff.name}
                            onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
                          />
                          <input
                            className="input"
                            style={{ maxWidth: 140 }}
                            placeholder="09… phone"
                            value={editStaff.phone}
                            onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })}
                          />
                          <select
                            className="input"
                            style={{ maxWidth: 190 }}
                            value={editStaff.role}
                            onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
                          >
                            <option value="OPS_MANAGER">Operations Manager</option>
                            <option value="VERIFICATION_OFFICER">Verification Officer</option>
                            <option value="SUPPORT_AGENT">Support Agent</option>
                            <option value="FINANCE_OFFICER">Finance Officer</option>
                            <option value="SUBCITY_COORDINATOR">Sub-city Coordinator</option>
                            <option value="ADMIN">Super Admin</option>
                          </select>
                          {editStaff.role === 'SUBCITY_COORDINATOR' && (
                            <select
                              className="input"
                              style={{ maxWidth: 170 }}
                              value={editStaff.subCity}
                              onChange={(e) =>
                                setEditStaff({ ...editStaff, subCity: e.target.value })
                              }
                            >
                              <option value="">Sub-city…</option>
                              {SUB_CITIES.map((sc) => (
                                <option key={sc.name} value={sc.name}>
                                  {sc.name}
                                </option>
                              ))}
                            </select>
                          )}
                          <span style={{ maxWidth: 190, flex: '1 1 190px' }}>
                            {passwordField(`edit-${editStaff.id}`, editStaff.password,
                              (v) => setEditStaff({ ...editStaff, password: v }),
                              'new password (optional)')}
                          </span>
                          <button
                            className="btn btn-dark btn-sm"
                            disabled={
                              editStaff.name.trim().length < 2 ||
                              editStaff.phone.trim().length < 9 ||
                              (editStaff.password.length > 0 && editStaff.password.length < 8) ||
                              (editStaff.role === 'SUBCITY_COORDINATOR' && !editStaff.subCity)
                            }
                          >
                            Save changes
                          </button>
                          <span className="hint" style={{ alignSelf: 'center' }}>
                            leave the password blank to keep the current one
                          </span>
                        </form>
                      )}
                    </div>
                  ))}
                  <form onSubmit={createStaff} style={{ marginTop: '1.2rem' }}>
                    <div className="sub-h">Create an account</div>
                    <div className="form-grid">
                      <div className="field span-2">
                        <label>Full name</label>
                        <input className="input" placeholder="e.g. Selam Abraha" value={newStaff.name}
                          onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Phone</label>
                        <input className="input" placeholder="09…" inputMode="tel" value={newStaff.phone}
                          onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Username</label>
                        <input className="input" placeholder="sign-in name" value={newStaff.username}
                          onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })} />
                      </div>
                      <div className="field">
                        <label>Password</label>
                        {passwordField('new-staff', newStaff.password,
                          (v) => setNewStaff({ ...newStaff, password: v }), '8 characters or more')}
                      </div>
                      <div className="field span-2">
                        <label>Role</label>
                        <select className="input" value={newStaff.role}
                          onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                          <option value="OPS_MANAGER">Operations Manager</option>
                          <option value="VERIFICATION_OFFICER">Verification Officer</option>
                          <option value="SUPPORT_AGENT">Support Agent</option>
                          <option value="FINANCE_OFFICER">Finance Officer</option>
                          <option value="SUBCITY_COORDINATOR">Sub-city Coordinator</option>
                          <option value="ADMIN">Super Admin</option>
                        </select>
                        {ROLE_BLURB[newStaff.role] && (
                          <span className="field-help">{ROLE_BLURB[newStaff.role]}</span>
                        )}
                      </div>
                      {newStaff.role === 'SUBCITY_COORDINATOR' && (
                        <div className="field">
                          <label>Sub-city</label>
                          <select className="input" value={newStaff.subCity}
                            onChange={(e) => setNewStaff({ ...newStaff, subCity: e.target.value })}>
                            <option value="">Choose…</option>
                            {SUB_CITIES.map((sc) => (
                              <option key={sc.name} value={sc.name}>{sc.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-dark btn-sm"
                        disabled={
                          newStaff.name.length < 2 ||
                          newStaff.phone.length < 9 ||
                          newStaff.username.length < 3 ||
                          newStaff.password.length < 8 ||
                          (newStaff.role === 'SUBCITY_COORDINATOR' && !newStaff.subCity)
                        }
                      >
                        + Create account
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {view === 'audit' && can('audit') && (
                <div className="panel">
                  <div className="spread mb">
                    <h2 style={{ margin: 0 }}>Audit log ({audit.length})</h2>
                    <button className="btn btn-primary btn-sm" onClick={exportAudit}>
                      Export report
                    </button>
                  </div>
                  <div className="form-grid mb">
                    <div className="field">
                      <label>Who</label>
                      <input
                        className="input"
                        placeholder="name or username"
                        value={auditQuery.who}
                        onChange={(e) => setAuditQuery({ ...auditQuery, who: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Action</label>
                      <input
                        className="input"
                        placeholder="e.g. DEPOSIT_CONFIRM"
                        value={auditQuery.action}
                        onChange={(e) => setAuditQuery({ ...auditQuery, action: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Target</label>
                      <input
                        className="input"
                        placeholder="type or id"
                        value={auditQuery.target}
                        onChange={(e) => setAuditQuery({ ...auditQuery, target: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>From</label>
                      <input
                        className="input"
                        type="date"
                        value={auditQuery.from}
                        max={auditQuery.to || undefined}
                        onChange={(e) => setAuditQuery({ ...auditQuery, from: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>To</label>
                      <input
                        className="input"
                        type="date"
                        value={auditQuery.to}
                        min={auditQuery.from || undefined}
                        onChange={(e) => setAuditQuery({ ...auditQuery, to: e.target.value })}
                      />
                    </div>
                  </div>
                  {Object.values(auditQuery).some(Boolean) && (
                    <p className="hint mb">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setAuditQuery({ who: '', action: '', target: '', from: '', to: '' })}
                      >
                        clear all filters
                      </button>
                    </p>
                  )}
                  {audit.length === 0 && (
                    <p className="hint">
                      {Object.values(auditQuery).some(Boolean)
                        ? 'Nothing matches these filters.'
                        : 'No staff overrides recorded yet.'}
                    </p>
                  )}
                  {audit.length > 0 && (
                    <div className="table-scroll-y scroll-cap" style={{ overflowX: 'auto' }}>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>When</th>
                            <th>Who</th>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {audit.map((a) => (
                            <Fragment key={a.id}>
                              <tr
                                className={`row-open${openAudit === a.id ? ' on' : ''}`}
                                onClick={() => setOpenAudit(openAudit === a.id ? null : a.id)}
                              >
                                <td className="hint">{fmtDate(a.createdAt)}</td>
                                <td>
                                  {a.actor.name ?? a.actor.username}
                                  <div className="hint">{a.actorRole.replace(/_/g, ' ').toLowerCase()}</div>
                                </td>
                                <td>
                                  <code>{a.action}</code>
                                </td>
                                <td className="hint">
                                  {a.targetType} #{a.targetId.slice(-6)}
                                </td>
                                <td className="hint" style={{ maxWidth: 240 }}>
                                  {a.reason ?? '-'}
                                </td>
                              </tr>
                              {openAudit === a.id && (
                                <tr className="row-detail">
                                  <td colSpan={5}>
                                    <dl>
                                      <dt>When</dt>
                                      <dd>{new Date(a.createdAt).toLocaleString()}</dd>
                                      <dt>Who</dt>
                                      <dd>
                                        {a.actor.name ?? '-'}{' '}
                                        {a.actor.username ? `(${a.actor.username})` : ''} ·{' '}
                                        {a.actorRole.replace(/_/g, ' ').toLowerCase()}
                                      </dd>
                                      <dt>Action</dt>
                                      <dd>{a.action}</dd>
                                      <dt>Target</dt>
                                      <dd>
                                        {a.targetType} {a.targetId}
                                      </dd>
                                      <dt>Reason</dt>
                                      <dd>{a.reason ?? 'none given'}</dd>
                                      <dt>Detail</dt>
                                      <dd>
                                        {a.meta
                                          ? Object.entries(a.meta)
                                              .map(([k, v]) => `${k}: ${String(v)}`)
                                              .join(' · ')
                                          : '-'}
                                      </dd>
                                    </dl>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {view === 'settings' && can('settings') && (
                <>
                  <div className="panel">
                    <h2>Commission rate</h2>
                    <div className="row">
                      <input className="input" style={{ maxWidth: 140 }} value={rate}
                        onChange={(e) => setRate(e.target.value)} inputMode="decimal" />
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={() => act('/admin/config/commission', { rate: Number(rate) }, 'PUT')}
                      >
                        Save
                      </button>
                      <span className="hint">fraction of gross, e.g. 0.10 = 10% - applies to new settlements</span>
                    </div>
                  </div>
                  <div className="panel">
                    <h2>Support refund cap</h2>
                    <div className="row">
                      <input className="input" style={{ maxWidth: 140 }} value={capInput}
                        onChange={(e) => setCapInput(e.target.value)} inputMode="numeric" />
                      <button
                        className="btn btn-dark btn-sm"
                        onClick={() => act('/admin/config/refund-cap', { capEtb: Number(capInput) }, 'PUT')}
                      >
                        Save
                      </button>
                      <span className="hint">
                        ETB a Support Agent may refund independently - above it routes to Ops/Admin
                      </span>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
