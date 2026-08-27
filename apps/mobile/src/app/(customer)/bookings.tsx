import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Btn, CatIcon, H1, Hint, StatusPill } from '../../components/ui';
import { api, Booking, fmtDate } from '../../lib/api';
import { C, F, R, S } from '../../lib/theme';

export default function Bookings() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api<Booking[]>('/bookings/mine'));
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <FlatList
        data={items ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: S.lg }}>
            <H1>ማስያዣዎቼ · My bookings</H1>
            <Hint style={{ marginTop: 4 }}>Every job, live status, receipts and reviews.</Hint>
          </View>
        }
        ListEmptyComponent={
          items === null ? null : (
            <View style={st.empty}>
              <MaterialCommunityIcons name="toolbox-outline" size={44} color={C.muted} />
              <Text style={st.emptyTitle}>No bookings yet</Text>
              <Hint style={{ textAlign: 'center', marginBottom: S.lg }}>
                Your first fix is a minute away - pick a service and the nearest verified technician
                is dispatched to you.
              </Hint>
              <Btn title="Book a service · አገልግሎት ይዘዙ" onPress={() => router.push('/(customer)/book')} />
            </View>
          )
        }
        renderItem={({ item: b }) => (
          <Pressable style={({ pressed }) => [st.row, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/booking/${b.id}`)}>
            <CatIcon slug={b.category.slug} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{b.category.nameEn}</Text>
              <Hint>
                #{b.id.slice(-6).toUpperCase()} · {fmtDate(b.createdAt)}
                {b.provider?.user?.name ? ` · ${b.provider.user.name}` : ''}
                {b.finalPriceEtb ? ` · ${Number(b.finalPriceEtb)} ETB` : ''}
              </Hint>
            </View>
            <StatusPill status={b.status} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    marginBottom: S.sm,
  },
  title: { fontFamily: F.bodySemi, fontSize: 14, color: C.ink },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: S.xl, gap: 8 },
  emptyTitle: { fontFamily: F.displayBold, fontSize: 17, color: C.navy },
});
