import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, Card, ErrorBox, Field, H1, Hint, OkBox, Row } from '../../components/ui';
import { api, fmtDate, Wallet } from '../../lib/api';
import { C, F, R, S } from '../../lib/theme';

const METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank' },
  { value: 'TELEBIRR', label: 'Telebirr' },
  { value: 'CBE_BIRR', label: 'CBE Birr' },
  { value: 'CASH_OFFICE', label: 'At office' },
];

/**
 * The technician's commission account. They take the customer's cash at the
 * door, so the platform never pays them anything - instead they keep this
 * balance topped up and each completed job draws the commission from it.
 * Dispatch stops offering jobs when it runs out.
 */
export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setWallet(await api<Wallet>('/wallet/me'));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const balance = Number(wallet?.balanceEtb ?? 0);
  const low = balance <= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={st.wrap}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <H1>ሂሳቤ · My balance</H1>

        <View style={[st.balanceCard, low && st.balanceCardLow]}>
          <Text style={st.balanceLabel}>Deposit balance · ቀሪ ሂሳብ</Text>
          <Text style={st.balanceV}>
            ETB {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <Hint style={{ color: 'rgba(255,255,255,0.65)' }}>
            {low
              ? 'Your balance has run out - top up to start receiving job offers again.'
              : 'You keep the customer cash. Our commission comes out of this balance when a job completes.'}
          </Hint>
        </View>

        <ErrorBox>{error}</ErrorBox>
        <OkBox>{notice}</OkBox>

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Top up · ገንዘብ አስገባ</Text>
          <Hint style={{ marginTop: 4, marginBottom: S.md }}>
            Pay into the company account, then enter the bank reference here. Finance checks it
            against the statement before your balance goes up.
          </Hint>
          <Field
            label="Amount (ETB)"
            placeholder="e.g. 500"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
          />
          <Text style={st.label}>How did you pay?</Text>
          <Row style={st.methods}>
            {METHODS.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => setMethod(m.value)}
                style={[st.method, method === m.value && st.methodOn]}
              >
                <Text style={[st.methodT, method === m.value && st.methodTOn]}>{m.label}</Text>
              </Pressable>
            ))}
          </Row>
          <Field
            label="Bank reference · receipt number"
            placeholder="e.g. FT25091234567"
            value={reference}
            onChangeText={setReference}
          />
          <Btn
            title="Submit deposit"
            kind="dark"
            busy={busy}
            disabled={Number(amount) < 50 || reference.trim().length < 3}
            onPress={async () => {
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await api('/wallet/deposits', {
                  method: 'POST',
                  body: JSON.stringify({
                    amountEtb: Number(amount),
                    method,
                    reference: reference.trim(),
                  }),
                });
                setAmount('');
                setReference('');
                setNotice('Submitted - finance will confirm it shortly.');
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>

        {!!wallet?.deposits?.length && (
          <Card style={{ marginTop: S.md }}>
            <Text style={st.h}>Deposits · ተቀማጭ</Text>
            {wallet.deposits.map((d) => (
              <Row key={d.id} style={st.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={st.txType}>
                    ETB {Number(d.amountEtb)} · {d.method.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                  <Hint>
                    ref {d.reference} · {fmtDate(d.createdAt)}
                  </Hint>
                </View>
                <Text
                  style={[
                    st.txAmt,
                    { color: d.status === 'CONFIRMED' ? C.okFg : d.status === 'REJECTED' ? C.red : C.navy },
                  ]}
                >
                  {d.status.toLowerCase()}
                </Text>
              </Row>
            ))}
          </Card>
        )}

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>History · ታሪክ</Text>
          {!wallet?.transactions?.length && (
            <Hint style={{ marginTop: 6 }}>
              Nothing yet - deposits and job commission appear here.
            </Hint>
          )}
          {wallet?.transactions?.map((t) => (
            <Row key={t.id} style={st.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.txType}>
                  {t.type === 'DEPOSIT'
                    ? '↓ Deposit'
                    : t.type === 'COMMISSION'
                      ? '↑ Job commission'
                      : t.type}
                </Text>
                <Hint>
                  {fmtDate(t.createdAt)}
                  {t.note ? ` · ${t.note}` : ''}
                </Hint>
              </View>
              <Text style={[st.txAmt, { color: Number(t.amountEtb) < 0 ? C.red : C.okFg }]}>
                {Number(t.amountEtb) < 0 ? '-' : '+'}ETB {Math.abs(Number(t.amountEtb))}
              </Text>
            </Row>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  balanceCard: {
    backgroundColor: C.navy,
    borderRadius: R.lg,
    padding: S.xl,
    marginTop: S.lg,
    gap: 6,
  },
  balanceCardLow: { backgroundColor: '#8d2b1f' },
  balanceLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceV: { fontFamily: F.display, fontSize: 32, color: '#fff' },
  h: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
  label: { fontFamily: F.bodyMedium, fontSize: 12, color: C.muted, marginBottom: 6 },
  methods: { flexWrap: 'wrap', gap: 6, marginBottom: S.md },
  method: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: R.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  methodOn: { borderColor: C.navy, backgroundColor: C.navy },
  methodT: { fontFamily: F.bodyMedium, fontSize: 12.5, color: C.ink },
  methodTOn: { color: '#fff' },
  txRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  txType: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  txAmt: { fontFamily: F.displayBold, fontSize: 14 },
});
