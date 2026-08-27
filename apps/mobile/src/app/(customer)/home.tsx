import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Card, CatIcon, Hint, Row, StatusPill } from '../../components/ui';
import { api, Booking, Category } from '../../lib/api';
import { C, F, R, S, SHADOW } from '../../lib/theme';
import { useAuth } from '../../store/auth';

/** Customer home - greeting, active booking card, category grid, trust band. */
export default function Home() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, mine] = await Promise.all([
        api<Category[]>('/catalog/categories'),
        api<Booking[]>('/bookings/mine').catch(() => [] as Booking[]),
      ]);
      setCategories(cats);
      setActive(
        mine.find((b) => ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status)) ??
          null,
      );
    } catch {
      /* offline - keep last data */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const firstName = user?.name?.split(' ')[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <FlatList
        data={categories}
        numColumns={3}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: S.sm }}
        contentContainerStyle={st.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListHeaderComponent={
          <View>
            <Text style={st.brand}>
              Addis <Text style={{ color: C.blue }}>Tiggena</Text>
            </Text>
            <Text style={st.greet}>
              {firstName ? `ሰላም ${firstName} · Hi ${firstName}` : 'ሰላም · Hello'}
            </Text>
            <Text style={st.tagline}>What needs fixing today?</Text>

            {/* live booking follows the user home */}
            {active && (
              <Pressable onPress={() => router.push(`/booking/${active.id}`)}>
                <View style={st.activeCard}>
                  <CatIcon slug={active.category.slug} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.activeTitle}>{active.category.nameEn}</Text>
                    <Text style={st.activeSub}>
                      {active.provider?.user?.name ? `${active.provider.user.name} · ` : ''}#
                      {active.id.slice(-6).toUpperCase()} · tap to track
                    </Text>
                  </View>
                  <StatusPill status={active.status} />
                </View>
              </Pressable>
            )}

            <Row style={{ justifyContent: 'space-between', marginTop: S.xl, marginBottom: S.md }}>
              <Text style={st.section}>Services · አገልግሎቶች</Text>
            </Row>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [st.tile, pressed && { transform: [{ scale: 0.97 }] }]}
            onPress={() => router.push({ pathname: '/(customer)/book', params: { category: item.id } })}
          >
            <View style={{ marginBottom: 8 }}>
              <CatIcon slug={item.slug} size={42} />
            </View>
            <Text style={st.tileName} numberOfLines={1}>
              {item.nameEn.split(' & ')[0]}
            </Text>
            <Am style={{ fontSize: 10.5 }} numberOfLines={1}>
              {item.nameAm}
            </Am>
            {item.priceFloorEtb && <Hint style={{ fontSize: 10, marginTop: 2 }}>from {Number(item.priceFloorEtb)} ETB</Hint>}
          </Pressable>
        )}
        ListFooterComponent={
          <Card style={{ marginTop: S.xl, backgroundColor: C.navy, borderColor: C.navySoft }}>
            <Row style={{ justifyContent: 'space-between' }}>
              {[
                ['15-30′', 'avg. arrival'],
                ['5-day', 'guarantee'],
                ['11/11', 'sub-cities'],
              ].map(([v, k]) => (
                <View key={k} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={st.statV}>{v}</Text>
                  <Text style={st.statK}>{k}</Text>
                </View>
              ))}
            </Row>
            <Text style={st.trust}>
              Every technician is Woreda-cleared, CoC-certified and rated by real customers. You pay
              directly - cash, Telebirr or CBE Birr.
            </Text>
          </Card>
        }
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  brand: { fontFamily: F.display, fontSize: 15, color: C.navy, letterSpacing: 0.2 },
  greet: { fontFamily: F.display, fontSize: 25, color: C.navy, marginTop: S.lg },
  tagline: { fontFamily: F.body, fontSize: 14, color: C.muted, marginTop: 4 },
  section: { fontFamily: F.displayBold, fontSize: 15, color: C.navy },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    borderLeftWidth: 4,
    borderLeftColor: C.blue,
    padding: S.lg,
    marginTop: S.lg,
    ...SHADOW.card,
  },
  activeTitle: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
  activeSub: { fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: S.sm,
  },
  tileName: { fontFamily: F.bodySemi, fontSize: 12, color: C.ink },
  statV: { fontFamily: F.display, fontSize: 18, color: '#fff' },
  statK: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  trust: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.75)', marginTop: S.lg },
});
