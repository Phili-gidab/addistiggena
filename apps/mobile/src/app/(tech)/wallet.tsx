import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Btn, Card, ErrorBox, Field, H1, Hint, OkBox, Row } from '../../components/ui';
import { api, fmtDate, Wallet } from '../../lib/api';
import { C, F, R, S } from '../../lib/theme';

/** Technician earnings: balance, payout request, transaction history. */
export default function WalletScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={st.wrap}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <H1>ገቢዬ · Earnings</H1>

        <View style={st.balanceCard}>
          <Text style={st.balanceLabel}>Available balance · ቀሪ ሂሳብ</Text>
          <Text style={st.balanceV}>
            ETB {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <Hint style={{ color: 'rgba(255,255,255,0.65)' }}>
            Credited automatically when a customer confirms payment (platform commission already
            deducted).
          </Hint>
        </View>

        <ErrorBox>{error}</ErrorBox>
        <OkBox>{notice}</OkBox>

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Request payout · ክፍያ ጠይቅ</Text>
          <Hint style={{ marginTop: 4, marginBottom: S.md }}>Processed same-day to your Telebirr or bank account.</Hint>
          <Field
            label="Amount (ETB)"
            placeholder={balance > 0 ? `up to ${balance}` : '0.00'}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ''))}
          />
          <Field
            label="Destination · Telebirr / bank account"
            placeholder="e.g. Telebirr 09xx xxx xxx"
            value={destination}
            onChangeText={setDestination}
          />
          <Btn
            title="Request payout"
            kind="dark"
            busy={busy}
            disabled={!amount || Number(amount) <= 0 || Number(amount) > balance || destination.trim().length < 5}
            onPress={async () => {
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await api('/wallet/payouts', {
                  method: 'POST',
                  body: JSON.stringify({ amountEtb: Number(amount), destination: destination.trim() }),
                });
                setAmount('');
                setNotice('Payout requested - processed same-day.');
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>History · ታሪክ</Text>
          {!wallet?.transactions?.length && <Hint style={{ marginTop: 6 }}>No transactions yet - completed, paid jobs appear here.</Hint>}
          {wallet?.transactions?.map((t) => (
            <Row key={t.id} style={st.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.txType}>
                  {t.type === 'CREDIT' ? '↓ Job payment' : t.type === 'PAYOUT' ? '↑ Payout' : t.type}
                </Text>
                <Hint>
                  {fmtDate(t.createdAt)}
                  {t.note ? ` · ${t.note}` : ''}
                </Hint>
              </View>
              <Text style={[st.txAmt, { color: t.type === 'CREDIT' ? C.okFg : C.navy }]}>
                {t.type === 'CREDIT' ? '+' : '-'}ETB {Number(t.amountEtb)}
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
  balanceLabel: { fontFamily: F.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  balanceV: { fontFamily: F.display, fontSize: 32, color: '#fff' },
  h: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
  txRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  txType: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  txAmt: { fontFamily: F.displayBold, fontSize: 14 },
});
