import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, CatIcon, Hint } from '../../components/ui';
import { api, Category } from '../../lib/api';
import { POPULAR } from '../../lib/catalog';
import { tradeImg } from '../../lib/images';
import { C, F, R, S, SHADOW } from '../../lib/theme';

/**
 * Category page - browse before booking: what the trade covers and what it
 * costs. Technicians are deliberately NOT listed: a customer only meets one
 * after that technician accepts the job (or Ops assigns one). Booking starts
 * only when the customer picks a specific service and taps the book bar.
 */
export default function CategoryPage() {
  const { id, service } = useLocalSearchParams<{ id: string; service?: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [picked, setPicked] = useState<string>('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const cats = await api<Category[]>('/catalog/categories');
      setCategory(cats.find((c) => c.id === id) ?? null);
    } catch {
      /* offline - keep what we have */
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // arriving from a "popular repair" tap preselects that exact service
  useEffect(() => {
    if (service) setPicked(String(service));
  }, [service]);

  const book = (desc: string) =>
    router.push({ pathname: '/(customer)/book', params: { category: id, service: desc } });

  if (!category) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={st.center}>
          <Hint>Loading…</Hint>
        </View>
      </SafeAreaView>
    );
  }

  const rates = POPULAR.filter((p) => p.slug === category.slug);
  /** every bookable service on this page - if there are none, a general
   *  request for the trade is allowed */
  const choices = [...(category.subServices ?? []), ...rates.map((r) => r.name)];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: S.xxl }}>
        {/* hero */}
        <View style={st.hero}>
          <Image source={{ uri: tradeImg(category.slug) }} style={st.heroImg} resizeMode="cover" />
          <View style={st.heroWash} />
          <SafeAreaView edges={['top']} style={st.heroTop}>
            <Pressable style={st.backBtn} onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
            </Pressable>
          </SafeAreaView>
          <View style={st.heroBody}>
            <CatIcon slug={category.slug} size={48} />
            <Text style={st.heroTitle}>{category.nameEn}</Text>
            <Text style={st.heroAm}>{category.nameAm}</Text>
            {category.priceFloorEtb && (
              <View style={st.fromChip}>
                <Text style={st.fromChipText}>from {Number(category.priceFloorEtb)} ETB</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ padding: S.lg, gap: S.lg }}>
          {/* what's included */}
          {(category.subServices?.length ?? 0) > 0 && (
            <View>
              <Text style={st.section}>What we fix</Text>
              <Am style={{ fontSize: 11.5, marginBottom: S.md }}>የምንሰራቸው ስራዎች</Am>
              <Card>
                {category.subServices!.map((sv, i) => (
                  <Pressable
                    key={sv}
                    style={[st.svRow, i === category.subServices!.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => setPicked(picked === sv ? '' : sv)}
                  >
                    <MaterialCommunityIcons
                      name={picked === sv ? 'check-circle' : 'checkbox-blank-circle-outline'}
                      size={18}
                      color={picked === sv ? C.blue : C.line}
                    />
                    <Text style={[st.svText, picked === sv && { color: C.navy, fontFamily: F.bodySemi }]}>
                      {sv}
                    </Text>
                  </Pressable>
                ))}
              </Card>
            </View>
          )}

          {/* standard rates */}
          {rates.length > 0 && (
            <View>
              <Text style={st.section}>Standard rates</Text>
              <Am style={{ fontSize: 11.5, marginBottom: S.md }}>ግልፅ የዋጋ ተመን</Am>
              {rates.map((r) => (
                <Pressable
                  key={r.name}
                  style={[st.rateRow, picked === r.name && st.rateRowOn]}
                  onPress={() => setPicked(picked === r.name ? '' : r.name)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={st.rateName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Am style={{ fontSize: 11 }} numberOfLines={1}>
                      {r.nameAm}
                    </Am>
                  </View>
                  <Text style={st.ratePrice}>
                    {r.min.toLocaleString()} - {r.max.toLocaleString()} ETB
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {/* the only route into booking from this screen - always for ONE service */}
      <View style={st.bar}>
        {picked ? (
          <Text style={st.barPick} numberOfLines={1}>
            {picked}
          </Text>
        ) : (
          <Text style={st.barHint} numberOfLines={1}>
            {choices.length > 0
              ? 'Choose a service above · አገልግሎት ይምረጡ'
              : `${category.nameEn} - general request`}
          </Text>
        )}
        <Btn
          title={picked ? 'Book this service · ይህን ይዘዙ' : 'Book · ይዘዙ'}
          disabled={choices.length > 0 && !picked}
          onPress={() => book(picked || category.nameEn)}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { height: 240, backgroundColor: C.navy },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 24, 48, 0.66)',
  },
  heroTop: { paddingHorizontal: S.md },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: S.sm,
  },
  heroBody: { position: 'absolute', left: S.lg, right: S.lg, bottom: S.lg },
  heroTitle: { fontFamily: F.display, fontSize: 24, color: '#fff', marginTop: 10 },
  heroAm: { fontFamily: F.am, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  fromChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  fromChipText: { fontFamily: F.bodySemi, fontSize: 11.5, color: '#fff' },
  section: { fontFamily: F.displayBold, fontSize: 16, color: C.navy },
  svRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  svText: { flex: 1, fontFamily: F.body, fontSize: 13.5, color: C.ink },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    marginBottom: S.sm,
  },
  rateRowOn: { borderColor: C.blue, backgroundColor: C.blueSoft },
  rateName: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  ratePrice: { fontFamily: F.bodySemi, fontSize: 11.5, color: C.blueDeep, flexShrink: 0 },
  barPick: {
    fontFamily: F.bodySemi,
    fontSize: 13,
    color: C.navy,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  barHint: {
    fontFamily: F.body,
    fontSize: 12.5,
    color: C.muted,
    marginBottom: S.sm,
    textAlign: 'center',
  },
  bar: {
    padding: S.lg,
    paddingTop: S.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.line,
    ...SHADOW.card,
  },
});
