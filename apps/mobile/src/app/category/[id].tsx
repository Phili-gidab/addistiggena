import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Avatar, Btn, Card, CatIcon, Hint, Row } from '../../components/ui';
import { api, Category, FeaturedProvider } from '../../lib/api';
import { POPULAR } from '../../lib/catalog';
import { tradeImg } from '../../lib/images';
import { C, F, R, S, SHADOW } from '../../lib/theme';

/**
 * Category page - browse before booking: what the trade covers, the standard
 * rates, and the verified technicians who do it. Booking starts only when the
 * customer taps a book button.
 */
export default function CategoryPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [pros, setPros] = useState<FeaturedProvider[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [cats, featured] = await Promise.all([
        api<Category[]>('/catalog/categories'),
        api<FeaturedProvider[]>('/catalog/featured').catch(() => [] as FeaturedProvider[]),
      ]);
      setCategory(cats.find((c) => c.id === id) ?? null);
      setPros(featured.filter((p) => p.category.id === id));
    } catch {
      /* offline - keep what we have */
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const book = (desc?: string) =>
    router.push({ pathname: '/(customer)/book', params: { category: id, desc } });

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
                    onPress={() => book(sv)}
                  >
                    <MaterialCommunityIcons name="check-circle-outline" size={18} color={C.blue} />
                    <Text style={st.svText}>{sv}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={C.muted} />
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
                <Pressable key={r.name} style={st.rateRow} onPress={() => book(r.name)}>
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

          {/* technicians in this trade */}
          <View>
            <Text style={st.section}>Verified technicians</Text>
            <Am style={{ fontSize: 11.5, marginBottom: S.md }}>የተረጋገጡ ባለሙያዎች</Am>
            {pros.length === 0 && (
              <Hint>
                No technician is featured here yet - book anyway and the nearest available
                professional in this trade is dispatched to you.
              </Hint>
            )}
            {pros.map((p) => (
              <Card key={p.id} style={{ marginBottom: S.sm }}>
                <Row style={{ gap: 12 }}>
                  <Avatar name={p.name} url={p.avatarUrl} size={48} online={p.isAvailable} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Row style={{ gap: 5 }}>
                      <Text style={st.proName} numberOfLines={1}>
                        {p.name ?? 'Technician'}
                      </Text>
                      <MaterialCommunityIcons name="check-decagram" size={14} color={C.green} />
                    </Row>
                    <Hint numberOfLines={1}>
                      {p.subCity ?? 'Addis Ababa'}
                      {p.yearsExperience ? ` · ${p.yearsExperience} yrs` : ''}
                    </Hint>
                    <Row style={{ gap: 4, marginTop: 3 }}>
                      <MaterialCommunityIcons name="star" size={13} color="#f5a623" />
                      <Text style={st.proRating} numberOfLines={1}>
                        {p.ratingCount ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : 'New'}
                        {p.jobsCompleted ? ` · ${p.jobsCompleted} jobs` : ''}
                      </Text>
                    </Row>
                  </View>
                </Row>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* the only route into booking from this screen */}
      <View style={st.bar}>
        <Btn title="Book this service · ይህን አገልግሎት ይዘዙ" onPress={() => book()} style={{ width: '100%' }} />
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
  rateName: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  ratePrice: { fontFamily: F.bodySemi, fontSize: 11.5, color: C.blueDeep, flexShrink: 0 },
  proName: { fontFamily: F.bodySemi, fontSize: 14, color: C.ink, flexShrink: 1 },
  proRating: { fontFamily: F.bodyMedium, fontSize: 12, color: C.muted },
  bar: {
    padding: S.lg,
    paddingTop: S.md,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.line,
    ...SHADOW.card,
  },
});
