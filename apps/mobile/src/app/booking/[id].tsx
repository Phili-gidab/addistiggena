import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, CatIcon, Countdown, ErrorBox, Field, Hint, OkBox, Row, StatusPill } from '../../components/ui';
import { api, authedImageSource, Booking, fmtDate, Ticket } from '../../lib/api';
import { STATUS_FLOW } from '../../lib/catalog';
import { C, F, R, S } from '../../lib/theme';

const ACTIVE = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const GUARANTEE_DAYS = 5;

/** Customer booking detail: live timeline, dispatch countdown, cash payment,
 *  rating, and the "something's wrong" / guarantee-claim door to Support. */
export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [track, setTrack] = useState<{ etaMinutes: number | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [stars, setStars] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [helpOpen, setHelpOpen] = useState<null | 'DISPUTE' | 'GUARANTEE_CLAIM'>(null);
  const [helpNote, setHelpNote] = useState('');

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const b = await api<Booking>(`/bookings/${id}`);
      setBooking(b);
      if (['EN_ROUTE', 'ARRIVED'].includes(b.status)) {
        api<{ etaMinutes: number | null }>(`/bookings/${id}/track`).then(setTrack).catch(() => {});
      }
      api<Ticket[]>('/tickets/mine').then((all) => setTickets(all.filter((t) => (t as Ticket & { booking?: { id: string } }).booking?.id === id || (t as Ticket & { bookingId?: string }).bookingId === id))).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(tick);
    };
  }, [refresh]);

  async function act(path: string, body?: object, label = '') {
    setBusy(label || path);
    setError('');
    setNotice('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  if (!booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={st.center}>
          <ErrorBox>{error}</ErrorBox>
          <Hint>Loading booking…</Hint>
        </View>
      </SafeAreaView>
    );
  }

  const flowIdx = STATUS_FLOW.findIndex((f) => f.key === booking.status);
  const offerSecs = booking.offerExpiresAt
    ? Math.max(0, Math.ceil((new Date(booking.offerExpiresAt).getTime() - now) / 1000))
    : null;
  const guaranteeOpen =
    booking.status === 'PAID' &&
    booking.completedAt &&
    (now - new Date(booking.completedAt).getTime()) / 86400000 <= GUARANTEE_DAYS;
  const canCancel = ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED'].includes(booking.status);
  const openTicket = tickets.find((t) => t.status === 'OPEN' || t.status === 'RE_INSPECTION');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={st.wrap}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()}>
            <Text style={st.back}>‹ Back</Text>
          </Pressable>
          <StatusPill status={booking.status} />
        </Row>

        <Row style={{ marginTop: S.md, gap: 10 }}>
          <CatIcon slug={booking.category.slug} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={st.title}>{booking.category.nameEn}</Text>
            <Am>{booking.category.nameAm} · #{booking.id.slice(-6).toUpperCase()}</Am>
          </View>
        </Row>

        <ErrorBox>{error}</ErrorBox>
        <OkBox>{notice}</OkBox>

        {/* dispatch countdown */}
        {booking.status === 'REQUESTED' && (
          <Card style={{ marginTop: S.lg, backgroundColor: C.warnBg, borderColor: C.warnLine }}>
            {booking.escalatedAt ? (
              <Hint style={{ color: C.warnFg }}>
                Our dispatch team is assigning a technician manually - hang tight, this rarely takes
                more than a few minutes.
              </Hint>
            ) : booking.provider ? (
              <>
                {offerSecs !== null && <Countdown seconds={offerSecs} />}
                <Hint style={{ color: C.warnFg, marginTop: 8 }}>
                  Waiting for the technician - if they don&apos;t respond we offer the job to the
                  next one automatically.
                </Hint>
              </>
            ) : (
              <Hint style={{ color: C.warnFg }}>Finding a technician near you…</Hint>
            )}
          </Card>
        )}

        {/* ETA while en-route */}
        {['EN_ROUTE', 'ARRIVED'].includes(booking.status) && (
          <Card style={{ marginTop: S.lg, backgroundColor: C.blueSoft, borderColor: '#cfe3f7' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={st.etaLabel}>
                  {booking.provider?.user?.name ?? 'Your technician'}{' '}
                  {booking.status === 'ARRIVED' ? 'has arrived' : 'is on the way'}
                </Text>
                <Am>{booking.status === 'ARRIVED' ? 'ደርሷል' : 'በመንገድ ላይ ነው'}</Am>
              </View>
              {track?.etaMinutes != null && booking.status === 'EN_ROUTE' && (
                <View style={st.etaBox}>
                  <Text style={st.etaV}>{track.etaMinutes}</Text>
                  <Text style={st.etaK}>min</Text>
                </View>
              )}
            </Row>
          </Card>
        )}

        {/* timeline */}
        {!['CANCELLED', 'EXPIRED', 'REJECTED'].includes(booking.status) && (
          <Card style={{ marginTop: S.lg }}>
            {STATUS_FLOW.map((f, i) => {
              const done = i < flowIdx;
              const nowStep = i === flowIdx;
              return (
                <Row key={f.key} style={{ alignItems: 'flex-start', opacity: done || nowStep ? 1 : 0.4, marginBottom: i === STATUS_FLOW.length - 1 ? 0 : 14 }}>
                  <View style={[st.dot, done && st.dotDone, nowStep && st.dotNow]}>
                    {done && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.tlTitle, nowStep && { color: C.blue }]}>{f.t}</Text>
                    <Hint>{f.s}</Hint>
                  </View>
                </Row>
              );
            })}
          </Card>
        )}

        {booking.status === 'CANCELLED' && (
          <Card style={{ marginTop: S.lg }}>
            <Text style={st.tlTitle}>This booking was cancelled</Text>
            <Hint style={{ marginTop: 4 }}>You can book again any time.</Hint>
          </Card>
        )}

        {/* details */}
        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Details</Text>
          <Hint style={{ marginTop: 6 }}>
            Location: {booking.landmarkNote ?? `${booking.lat.toFixed(4)}, ${booking.lng.toFixed(4)}`}
          </Hint>
          {booking.description ? <Text style={st.desc}>{booking.description}</Text> : null}
          {booking.photoObjectKey && (
            <Image source={authedImageSource(booking.photoObjectKey)} style={st.photo} resizeMode="cover" />
          )}
          {booking.priceQuoteEtb && !booking.finalPriceEtb && (
            <Hint style={{ marginTop: 8 }}>
              Estimate: from ETB {Number(booking.priceQuoteEtb)} - final price agreed on completion.
            </Hint>
          )}
          {booking.finalPriceEtb && (
            <Text style={st.price}>Final price · የመጨረሻ ዋጋ: ETB {Number(booking.finalPriceEtb)}</Text>
          )}
          <Hint style={{ marginTop: 6 }}>Booked {fmtDate(booking.createdAt)}</Hint>
        </Card>

        {/* pay */}
        {booking.status === 'COMPLETED' && (
          <Card style={{ marginTop: S.md, borderColor: C.blue, borderWidth: 1.5 }}>
            <Text style={st.h}>ክፍያ · Payment</Text>
            <Hint style={{ marginVertical: 8 }}>
              Pay the technician directly - cash, Telebirr or CBE Birr - then confirm here so your
              receipt and 5-day guarantee activate.
            </Hint>
            <Btn
              title={`I paid ETB ${Number(booking.finalPriceEtb ?? booking.priceQuoteEtb ?? 0)} in cash`}
              busy={busy === 'pay'}
              onPress={() =>
                Alert.alert('Confirm payment', 'Did you hand the payment to the technician?', [
                  { text: 'Not yet', style: 'cancel' },
                  { text: 'Yes, paid', onPress: () => act(`/payments/${booking.id}/initiate`, { gateway: 'CASH' }, 'pay') },
                ])
              }
            />
          </Card>
        )}

        {/* receipt + review */}
        {booking.status === 'PAID' && (
          <Card style={{ marginTop: S.md, backgroundColor: C.okBg, borderColor: '#bfe6d6' }}>
            <Text style={[st.h, { color: C.okFg }]}>Receipt · ደረሰኝ</Text>
            <Hint style={{ color: C.okFg, marginTop: 4 }}>
              ETB {Number(booking.payment?.amountEtb ?? booking.finalPriceEtb ?? 0)} ·{' '}
              {booking.payment?.gateway ?? 'CASH'} · እናመሰግናለን - thank you for choosing Addis Tiggena.
            </Hint>
          </Card>
        )}

        {booking.status === 'PAID' && !booking.review && (
          <Card style={{ marginTop: S.md }}>
            <Text style={st.h}>Rate your technician · ደረጃ ይስጡ</Text>
            <Row style={{ marginVertical: 10, justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)}>
                  <Text style={{ fontSize: 32, color: n <= stars ? '#f5a623' : C.line }}>★</Text>
                </Pressable>
              ))}
            </Row>
            <Field placeholder="How was the service? (optional)" value={reviewText} onChangeText={setReviewText} multiline />
            <Btn
              title="Submit review"
              disabled={stars === 0}
              busy={busy === 'review'}
              onPress={() =>
                act('/reviews', { bookingId: booking.id, stars, text: reviewText.trim() || undefined }, 'review').then(() =>
                  setNotice('Thank you! Your review is published after a quick moderation check.'),
                )
              }
            />
          </Card>
        )}
        {booking.review && (
          <Card style={{ marginTop: S.md }}>
            <Text style={st.h}>Your review</Text>
            <Text style={{ fontSize: 18, marginTop: 4 }}>
              {'★'.repeat(booking.review.stars)}
              {'☆'.repeat(5 - booking.review.stars)}
            </Text>
            {booking.review.text ? <Hint style={{ marginTop: 4 }}>{booking.review.text}</Hint> : null}
          </Card>
        )}

        {/* help / guarantee */}
        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Need help? · እርዳታ ይፈልጋሉ?</Text>
          {openTicket ? (
            <Hint style={{ marginTop: 6 }}>
              {openTicket.type === 'GUARANTEE_CLAIM' ? 'Guarantee claim' : 'Support ticket'}{' '}
              {openTicket.status === 'RE_INSPECTION' ? '- re-inspection scheduled' : 'is open'} - our
              team is on it and will contact you.
            </Hint>
          ) : helpOpen ? (
            <>
              <Field
                placeholder={helpOpen === 'DISPUTE' ? 'What went wrong?…' : 'What has failed since the repair?…'}
                value={helpNote}
                onChangeText={setHelpNote}
                multiline
                style={{ marginTop: 8 }}
              />
              <Row>
                <Btn title="Cancel" kind="line" small onPress={() => setHelpOpen(null)} />
                <View style={{ flex: 1 }} />
                <Btn
                  title="Send to support"
                  small
                  busy={busy === 'help'}
                  disabled={helpNote.trim().length < 5}
                  onPress={() =>
                    act('/tickets', { bookingId: booking.id, type: helpOpen, note: helpNote.trim() }, 'help').then(() => {
                      setHelpOpen(null);
                      setHelpNote('');
                      setNotice('Sent - the support desk answers fast.');
                    })
                  }
                />
              </Row>
            </>
          ) : (
            <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {ACTIVE.includes(booking.status) || booking.status === 'COMPLETED' ? (
                <Btn title="Something's wrong · ችግር አለ" kind="ghost" small onPress={() => setHelpOpen('DISPUTE')} />
              ) : null}
              {guaranteeOpen && (
                <Btn title="Guarantee claim (5-day) · ዋስትና" kind="ghost" small onPress={() => setHelpOpen('GUARANTEE_CLAIM')} />
              )}
              {!ACTIVE.includes(booking.status) && booking.status !== 'COMPLETED' && !guaranteeOpen && (
                <Hint>All good here. The 5-day guarantee window opens after payment.</Hint>
              )}
            </Row>
          )}
        </Card>

        {/* cancel */}
        {canCancel && (
          <Btn
            title="Cancel booking · ሰርዝ"
            kind="line"
            style={{ marginTop: S.lg }}
            busy={busy === 'cancel'}
            onPress={() => {
              const late = ['EN_ROUTE', 'ARRIVED'].includes(booking.status);
              Alert.alert(
                'Cancel booking?',
                late
                  ? 'Your technician is already on the way - a call-out fee may apply for late cancellations.'
                  : 'This booking will be cancelled.',
                [
                  { text: 'Keep it', style: 'cancel' },
                  {
                    text: 'Cancel booking',
                    style: 'destructive',
                    onPress: () => act(`/bookings/${booking.id}/cancel`, { reason: late ? 'Cancelled after dispatch' : 'Customer cancelled' }, 'cancel'),
                  },
                ],
              );
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl },
  back: { fontFamily: F.bodySemi, fontSize: 15, color: C.blue },
  title: { fontFamily: F.display, fontSize: 20, color: C.navy },
  h: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
  desc: { fontFamily: F.body, fontSize: 13.5, color: C.ink, marginTop: 8, lineHeight: 19 },
  photo: { width: 130, height: 100, borderRadius: R.md, marginTop: 10, borderWidth: 1, borderColor: C.line },
  price: { fontFamily: F.displayBold, fontSize: 15, color: C.navy, marginTop: 8 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  dotDone: { backgroundColor: C.navy, borderColor: C.navy },
  dotNow: { borderColor: C.blue, backgroundColor: C.blueSoft },
  tlTitle: { fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink },
  etaLabel: { fontFamily: F.bodySemi, fontSize: 14, color: C.navy },
  etaBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 6 },
  etaV: { fontFamily: F.display, fontSize: 22, color: C.blue },
  etaK: { fontFamily: F.body, fontSize: 11, color: C.muted },
});
