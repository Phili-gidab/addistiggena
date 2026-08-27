import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, CatIcon, Countdown, ErrorBox, H1, Hint, OkBox, Row, StatusPill } from '../../components/ui';
import { api, Booking, fmtDate, ProviderProfile } from '../../lib/api';
import { C, F, S } from '../../lib/theme';

/**
 * Technician job board: availability toggle (with a GPS ping so dispatch ranks
 * by real distance), incoming offers on a 5-minute countdown, one-tap lifecycle
 * transitions, and today's history.
 */
export default function Jobs() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, mine] = await Promise.all([
        api<ProviderProfile | null>('/providers/me').catch(() => null),
        api<Booking[]>('/bookings/mine'),
      ]);
      setProfile(p);
      setJobs(mine);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(t);
      clearInterval(tick);
    };
  }, [load]);

  async function pingLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api('/providers/me/location', {
        method: 'PUT',
        body: JSON.stringify({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      });
    } catch {
      /* location ping is best-effort */
    }
  }

  async function toggleAvailability(next: boolean) {
    setError('');
    try {
      if (next) await pingLocation();
      await api('/providers/me/availability', { method: 'PUT', body: JSON.stringify({ isAvailable: next }) });
      await load();
      setNotice(next ? 'You are online - jobs in your area come to you first.' : 'You are offline.');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function transition(id: string, action: string, body?: object) {
    setBusy(id + action);
    setError('');
    try {
      if (action === 'enroute') pingLocation();
      await api(`/bookings/${id}/${action}`, { method: 'POST', body: JSON.stringify(body ?? {}) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  const offers = jobs.filter((j) => j.status === 'REQUESTED');
  const active = jobs.filter((j) => ['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(j.status));
  const recent = jobs.filter((j) => ['COMPLETED', 'PAID'].includes(j.status)).slice(0, 5);
  const verified = profile?.verificationStatus === 'VERIFIED';

  const nextAction = (j: Booking): { label: string; action: string } | null => {
    switch (j.status) {
      case 'ACCEPTED':
        return { label: 'En route · ተነሳሁ', action: 'enroute' };
      case 'EN_ROUTE':
        return { label: 'Arrived · ደርሻለሁ', action: 'arrive' };
      case 'ARRIVED':
        return { label: 'Start work · ጀምር', action: 'start' };
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <H1>ሰሌዳ · Job board</H1>

        <Card style={{ marginTop: S.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Row style={{ gap: 7 }}>
                {verified && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: profile?.isAvailable ? C.green : C.line,
                    }}
                  />
                )}
                <Text style={st.availTitle}>
                  {verified
                    ? profile?.isAvailable
                      ? 'Online - receiving jobs'
                      : 'Offline'
                    : `Verification: ${profile?.verificationStatus ?? 'no profile yet'}`}
                </Text>
              </Row>
              <Hint>
                {verified
                  ? 'Going online shares your position so nearby jobs reach you first.'
                  : 'Complete registration on the website - once verified you can go online here.'}
              </Hint>
            </View>
            {verified && (
              <Switch
                value={!!profile?.isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ true: C.blue, false: C.line }}
                thumbColor="#fff"
              />
            )}
          </Row>
        </Card>

        <ErrorBox>{error}</ErrorBox>
        <OkBox>{notice}</OkBox>

        {/* incoming offers */}
        {offers.length > 0 && (
          <>
            <Text style={st.section}>አዲስ የስራ ጥያቄ · New job offers</Text>
            {offers.map((j) => {
              const secs = j.offerExpiresAt
                ? Math.max(0, Math.ceil((new Date(j.offerExpiresAt).getTime() - now) / 1000))
                : null;
              return (
                <Card key={j.id} style={{ marginBottom: S.md, borderColor: C.amber, borderWidth: 1.5 }}>
                  <Row style={{ gap: 10 }}>
                    <CatIcon slug={j.category.slug} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.jobTitle}>{j.category.nameEn}</Text>
                      <Hint>
                        #{j.id.slice(-6).toUpperCase()}
                        {j.landmarkNote ? ` · ${j.landmarkNote}` : ''}
                      </Hint>
                    </View>
                  </Row>
                  {j.description ? <Hint style={{ marginTop: 8 }}>“{j.description}”</Hint> : null}
                  {secs !== null && (
                    <View style={{ marginTop: 10 }}>
                      <Countdown seconds={secs} />
                    </View>
                  )}
                  <Row style={{ marginTop: 12 }}>
                    <Btn
                      title="Reject"
                      kind="line"
                      small
                      busy={busy === j.id + 'reject'}
                      onPress={() => transition(j.id, 'reject')}
                    />
                    <View style={{ flex: 1 }} />
                    <Btn
                      title="Accept job · ተቀበል"
                      small
                      busy={busy === j.id + 'accept'}
                      onPress={() => transition(j.id, 'accept')}
                    />
                  </Row>
                </Card>
              );
            })}
          </>
        )}

        {/* active jobs */}
        <Text style={st.section}>Active jobs ({active.length})</Text>
        {active.length === 0 && (
          <Hint style={{ marginBottom: S.md }}>
            No active jobs - stay online to receive requests from your surroundings.
          </Hint>
        )}
        {active.map((j) => {
          const na = nextAction(j);
          return (
            <Card key={j.id} style={{ marginBottom: S.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 8, flex: 1 }}>
                  <CatIcon slug={j.category.slug} size={32} />
                  <Text style={st.jobTitle}>{j.category.nameEn}</Text>
                </Row>
                <StatusPill status={j.status} />
              </Row>
              <Hint style={{ marginTop: 6 }}>
                {j.customer?.name ?? 'Customer'} · {j.customer?.phone?.replace('+251', '0')}
                {j.landmarkNote ? `\nLandmark: ${j.landmarkNote}` : ''}
              </Hint>
              {j.description ? <Hint style={{ marginTop: 4 }}>“{j.description}”</Hint> : null}
              <Row style={{ marginTop: 12, flexWrap: 'wrap' }}>
                {na && (
                  <Btn title={na.label} small busy={busy === j.id + na.action} onPress={() => transition(j.id, na.action)} />
                )}
                {j.status === 'IN_PROGRESS' && (
                  <CompleteButton busy={busy === j.id + 'complete'} onComplete={(price) => transition(j.id, 'complete', price ? { finalPriceEtb: price } : undefined)} />
                )}
              </Row>
            </Card>
          );
        })}

        {/* recent history */}
        {recent.length > 0 && (
          <>
            <Text style={st.section}>Recent</Text>
            {recent.map((j) => (
              <Row key={j.id} style={st.histRow}>
                <CatIcon slug={j.category.slug} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={st.histTitle}>{j.category.nameEn}</Text>
                  <Hint>
                    {fmtDate(j.createdAt)}
                    {j.finalPriceEtb ? ` · ETB ${Number(j.finalPriceEtb)}` : ''}
                  </Hint>
                </View>
                <StatusPill status={j.status} />
              </Row>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Complete needs the agreed price - small inline two-tap flow. */
function CompleteButton({ busy, onComplete }: { busy: boolean; onComplete: (price?: number) => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  if (!open) return <Btn title="Complete · ጨርስ" kind="dark" small onPress={() => setOpen(true)} />;
  return (
    <Row style={{ flex: 1, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Text style={st2.label}>Final price (ETB)</Text>
        <View style={st2.priceWrap}>
          <Text style={st2.etb}>ETB</Text>
          <TextInputPrice value={price} onChange={setPrice} />
        </View>
      </View>
      <Btn
        title="Confirm"
        small
        busy={busy}
        disabled={!price || Number.isNaN(Number(price))}
        onPress={() => onComplete(Number(price))}
      />
    </Row>
  );
}

function TextInputPrice({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ''))}
      keyboardType="decimal-pad"
      placeholder="850"
      placeholderTextColor={C.muted}
      style={st2.priceInput}
    />
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  availTitle: { fontFamily: F.bodySemi, fontSize: 14.5, color: C.navy, marginBottom: 3 },
  section: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy, marginTop: S.xl, marginBottom: S.md },
  jobTitle: { fontFamily: F.bodySemi, fontSize: 14.5, color: C.ink },
  histRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    marginBottom: S.sm,
    gap: 10,
  },
  histTitle: { fontFamily: F.bodyMedium, fontSize: 13, color: C.ink },
});

const st2 = StyleSheet.create({
  label: { fontFamily: F.bodySemi, fontSize: 11, color: C.navy, marginBottom: 4 },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    height: 40,
  },
  etb: { fontFamily: F.bodySemi, fontSize: 12, color: C.muted, marginRight: 6 },
  priceInput: { flex: 1, fontFamily: F.bodySemi, fontSize: 15, color: C.ink, padding: 0 },
});
