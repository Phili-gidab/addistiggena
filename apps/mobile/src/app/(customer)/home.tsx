import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageBackground,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Avatar, CatIcon, Hint, Row, StatusPill } from '../../components/ui';
import { api, Booking, Category, FeaturedProvider } from '../../lib/api';
import { POPULAR } from '../../lib/catalog';
import {
  BAND_IMG,
  SLIDE_GUARANTEE_IMG,
  SLIDE_PRO_IMG,
  SLIDE_VERIFIED_IMG,
  tradeImg,
} from '../../lib/images';
import { C, F, R, S, SHADOW } from '../../lib/theme';
import { useAuth } from '../../store/auth';

/** Promo slides - full-bleed photography under a navy wash, like the big
 *  marketplace apps' hero banners. */
const SLIDES = [
  {
    key: 'verified',
    bg: C.navy,
    img: SLIDE_VERIFIED_IMG,
    icon: 'shield-check' as const,
    title: 'ማንነቱ የተረጋገጠ ባለሙያ',
    sub: 'Woreda-cleared, CoC-certified, Fayda-verified - every single technician.',
    cta: 'Book now · ይዘዙ',
    action: () => router.push('/(customer)/book'),
  },
  {
    key: 'guarantee',
    bg: C.blueDeep,
    img: SLIDE_GUARANTEE_IMG,
    icon: 'shield-star' as const,
    title: 'የ5 ቀናት ዋስትና',
    sub: 'If the exact issue returns within 5 days, we fix it again at no service cost.',
    cta: 'How it works',
    action: () => router.push('/(customer)/bookings'),
  },
  {
    key: 'pro',
    bg: '#123058',
    img: SLIDE_PRO_IMG,
    icon: 'hammer-wrench' as const,
    title: 'ብቃትዎ ገቢዎ ይሁን',
    sub: 'Become a technician - no degree required. Skill and trust are enough.',
    cta: 'Join · ይመዝገቡ',
    action: () => Linking.openURL('https://addistiggena.com/provider').catch(() => {}),
  },
];

/** Customer home - search, promo carousel, live booking, categories,
 *  featured technicians, popular repairs and the trust band. */
export default function Home() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const slideW = width - S.lg * 2;

  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<FeaturedProvider[]>([]);
  const [active, setActive] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [slide, setSlide] = useState(0);
  const slidesRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const [cats, pros, mine] = await Promise.all([
        api<Category[]>('/catalog/categories'),
        api<FeaturedProvider[]>('/catalog/featured').catch(() => [] as FeaturedProvider[]),
        api<Booking[]>('/bookings/mine').catch(() => [] as Booking[]),
      ]);
      setCategories(cats);
      setFeatured(pros);
      setActive(
        mine.find((b) =>
          ['REQUESTED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status),
        ) ?? null,
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

  // auto-rotate the promo carousel
  useEffect(() => {
    const t = setInterval(() => {
      setSlide((s) => {
        const next = (s + 1) % SLIDES.length;
        slidesRef.current?.scrollTo({ x: next * slideW, animated: true });
        return next;
      });
    }, 5200);
    return () => clearInterval(t);
  }, [slideW]);

  const onSlideScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / slideW);
    if (i !== slide) setSlide(i);
  };

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return categories
      .filter((c) =>
        [c.nameEn, c.nameAm, ...(c.subServices ?? [])].join(' ').toLowerCase().includes(term),
      )
      .slice(0, 5);
  }, [q, categories]);

  /** Browse a trade first - booking is always an explicit choice from there. */
  const goCategory = (categoryId: string) => router.push(`/category/${categoryId}`);
  const goBook = (categoryId?: string, desc?: string) =>
    router.push({ pathname: '/(customer)/book', params: { category: categoryId, desc } });

  const firstName = user?.name?.split(' ')[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={st.wrap}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* ── header ─────────────────────────────────────────────────────── */}
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: S.lg }}>
          <Text style={st.brand}>
            Addis <Text style={{ color: C.blue }}>Tiggena</Text>
          </Text>
          <Pressable style={st.bell} onPress={() => router.push('/(customer)/bookings')}>
            <MaterialCommunityIcons name="bell-outline" size={22} color={C.navy} />
            {active && <View style={st.bellDot} />}
          </Pressable>
        </Row>
        <View style={{ paddingHorizontal: S.lg }}>
          <Text style={st.greet}>{firstName ? `ሰላም ${firstName} · Hi ${firstName}` : 'ሰላም · Hello'}</Text>
          <Text style={st.tagline}>What needs fixing today? · ምን እንጠግንልዎ?</Text>
        </View>

        {/* ── search ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: S.lg, marginTop: S.lg }}>
          <View style={st.search}>
            <MaterialCommunityIcons name="magnify" size={20} color={C.muted} />
            <TextInput
              style={st.searchInput}
              placeholder="Mitad, socket, tap… · ይፈልጉ"
              placeholderTextColor={C.muted}
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              onSubmitEditing={() => matches[0] && goBook(matches[0].id)}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={C.muted} />
              </Pressable>
            )}
          </View>
          {matches.length > 0 && (
            <View style={st.searchPop}>
              {matches.map((c) => (
                <Pressable key={c.id} style={st.searchRow} onPress={() => { setQ(''); goCategory(c.id); }}>
                  <CatIcon slug={c.slug} size={30} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.searchName}>{c.nameEn}</Text>
                    <Am style={{ fontSize: 11 }}>{c.nameAm}</Am>
                  </View>
                  {c.priceFloorEtb && <Hint style={{ fontSize: 11 }}>from {Number(c.priceFloorEtb)} ETB</Hint>}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── promo carousel ─────────────────────────────────────────────── */}
        <ScrollView
          ref={slidesRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSlideScroll}
          style={{ marginTop: S.lg }}
          contentContainerStyle={{ paddingHorizontal: S.lg }}
          snapToInterval={slideW}
          decelerationRate="fast"
        >
          {SLIDES.map((s) => (
            <Pressable key={s.key} style={[st.slide, { width: slideW, backgroundColor: s.bg }]} onPress={s.action}>
              <Image source={{ uri: s.img }} style={st.fill} resizeMode="cover" />
              {/* navy wash keeps the photo on-brand and the copy legible */}
              <View style={st.slideWash} />
              <View style={st.slideBody}>
                <View style={st.slideIcon}>
                  <MaterialCommunityIcons name={s.icon} size={26} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.slideTitle}>{s.title}</Text>
                  <Text style={st.slideSub}>{s.sub}</Text>
                  <View style={st.slideCta}>
                    <Text style={st.slideCtaText}>{s.cta}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color={C.navy} />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <Row style={{ justifyContent: 'center', marginTop: 10, gap: 5 }}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[st.dot, i === slide && st.dotOn]} />
          ))}
        </Row>

        {/* ── live booking ───────────────────────────────────────────────── */}
        {active && (
          <Pressable style={{ paddingHorizontal: S.lg }} onPress={() => router.push(`/booking/${active.id}`)}>
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

        {/* ── categories rail ────────────────────────────────────────────── */}
        <Row style={st.sectionHead}>
          <View>
            <Text style={st.section}>Services</Text>
            <Am style={{ fontSize: 11.5 }}>አገልግሎቶች</Am>
          </View>
          <Pressable onPress={() => router.push('/categories')}>
            <Text style={st.seeAll}>See all →</Text>
          </Pressable>
        </Row>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.rail}>
          {categories.map((c) => (
            <Pressable
              key={c.id}
              style={({ pressed }) => [st.catCard, pressed && { transform: [{ scale: 0.97 }] }]}
              onPress={() => goCategory(c.id)}
            >
              <View style={st.catPhotoWrap}>
                <Image source={{ uri: tradeImg(c.slug) }} style={st.catPhoto} resizeMode="cover" />
                <View style={st.catPhotoWash} />
                <View style={st.catIconFloat}>
                  <CatIcon slug={c.slug} size={30} />
                </View>
              </View>
              <View style={{ padding: S.md, paddingTop: 20 }}>
                <Text style={st.catName} numberOfLines={1}>
                  {c.nameEn.split(' & ')[0]}
                </Text>
                <Am style={{ fontSize: 10 }} numberOfLines={1}>
                  {c.nameAm}
                </Am>
                <View style={st.countChip}>
                  <Text style={st.countText} numberOfLines={1}>
                    {c.subServices?.length
                      ? `${c.subServices.length} services`
                      : c.priceFloorEtb
                        ? `from ${Number(c.priceFloorEtb)} ETB`
                        : 'view'}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── featured technicians ───────────────────────────────────────── */}
        {featured.length > 0 && (
          <>
            <Row style={st.sectionHead}>
              <View>
                <Text style={st.section}>Top technicians</Text>
                <Am style={{ fontSize: 11.5 }}>ምርጥ ባለሙያዎች</Am>
              </View>
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.rail}>
              {featured.map((p) => (
                <Pressable key={p.id} style={st.proCard} onPress={() => goCategory(p.category.id)}>
                  <Row style={{ gap: 10 }}>
                    <Avatar name={p.name} url={p.avatarUrl} size={44} online={p.isAvailable} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.proName} numberOfLines={1}>
                        {p.name ?? 'Technician'}
                      </Text>
                      <View style={st.verified}>
                        <MaterialCommunityIcons name="check-decagram" size={12} color={C.green} />
                        <Text style={st.verifiedText}>Verified · የተረጋገጠ</Text>
                      </View>
                    </View>
                  </Row>
                  <Text style={st.proCat} numberOfLines={1}>
                    {p.category.nameEn}
                    {p.subCity ? ` · ${p.subCity}` : ''}
                  </Text>
                  <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
                    <Row style={{ gap: 4, flexShrink: 1 }}>
                      <MaterialCommunityIcons name="star" size={14} color="#f5a623" />
                      <Text style={st.proRating} numberOfLines={1}>
                        {p.ratingCount ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})` : 'New'}
                        {p.jobsCompleted > 0 ? ` · ${p.jobsCompleted} jobs` : ''}
                      </Text>
                    </Row>
                    {p.category.priceFloorEtb && (
                      <Text style={st.proPrice} numberOfLines={1}>
                        from {Number(p.category.priceFloorEtb)} ETB
                      </Text>
                    )}
                  </Row>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── popular repairs ────────────────────────────────────────────── */}
        <Row style={st.sectionHead}>
          <View>
            <Text style={st.section}>Popular repairs</Text>
            <Am style={{ fontSize: 11.5 }}>ተወዳጅ ጥገናዎች · ግልፅ የዋጋ ተመን</Am>
          </View>
        </Row>
        <View style={{ paddingHorizontal: S.lg, gap: S.sm }}>
          {POPULAR.map((s) => {
            const cat = categories.find((c) => c.slug === s.slug);
            return (
              <Pressable
                key={s.name}
                style={({ pressed }) => [st.popRow, pressed && { opacity: 0.85 }]}
                onPress={() => goBook(cat?.id, s.name)}
              >
                <Image source={{ uri: tradeImg(s.slug) }} style={st.popThumb} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.popName} numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Am style={{ fontSize: 11 }} numberOfLines={1}>
                    {s.nameAm}
                  </Am>
                  <Text style={st.popPrice} numberOfLines={1}>
                    {s.min.toLocaleString()} - {s.max.toLocaleString()} ETB
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
              </Pressable>
            );
          })}
        </View>

        {/* ── trust band ─────────────────────────────────────────────────── */}
        <ImageBackground
          source={{ uri: BAND_IMG }}
          style={st.trustBand}
          imageStyle={{ borderRadius: R.lg, opacity: 0.35 }}
        >
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
          <View style={st.trustDivider} />
          {(
            [
              ['shield-check', 'Woreda clearance letter on file'],
              ['certificate', 'Government CoC skill certification'],
              ['card-account-details', 'Fayda ID + police clearance'],
            ] as const
          ).map(([icon, label]) => (
            <Row key={label} style={{ gap: 10, marginTop: 9 }}>
              <MaterialCommunityIcons name={icon} size={16} color="#7cc0ff" />
              <Text style={st.trustLine}>{label}</Text>
            </Row>
          ))}
        </ImageBackground>

        <Hint style={{ textAlign: 'center', marginTop: S.lg, paddingHorizontal: S.lg }}>
          Addis Tiggena · a project of Amnen Marketing & Promotion
        </Hint>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingVertical: S.lg, paddingBottom: S.xxl },
  brand: { fontFamily: F.display, fontSize: 16, color: C.navy, letterSpacing: 0.2 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.red,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  greet: { fontFamily: F.display, fontSize: 24, color: C.navy, marginTop: S.md },
  tagline: { fontFamily: F.body, fontSize: 13.5, color: C.muted, marginTop: 3 },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: C.line,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.ink, padding: 0 },
  searchPop: {
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 6,
    paddingHorizontal: S.md,
    ...SHADOW.card,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  searchName: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },

  slide: {
    borderRadius: R.lg,
    overflow: 'hidden',
    ...SHADOW.navy,
  },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  slideWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 24, 48, 0.82)',
  },
  slideBody: {
    flexDirection: 'row',
    gap: 14,
    padding: S.lg,
    alignItems: 'flex-start',
  },
  slideIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: { fontFamily: F.amBold, fontSize: 16, color: '#fff' },
  slideSub: { fontFamily: F.body, fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  slideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  slideCtaText: { fontFamily: F.bodySemi, fontSize: 11.5, color: C.navy },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.line },
  dotOn: { backgroundColor: C.blue, width: 16 },

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

  sectionHead: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: S.lg,
    marginTop: S.xl,
    marginBottom: S.md,
  },
  section: { fontFamily: F.displayBold, fontSize: 16, color: C.navy },
  seeAll: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.blue },
  rail: { paddingHorizontal: S.lg, gap: S.sm },

  catCard: {
    width: 136,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  catPhotoWrap: { height: 72 },
  catPhoto: { width: '100%', height: '100%' },
  catPhotoWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 30, 63, 0.28)',
  },
  catIconFloat: {
    position: 'absolute',
    left: S.md,
    bottom: -15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: C.blueSoft,
  },
  catName: { fontFamily: F.bodySemi, fontSize: 12, color: C.ink },
  countChip: {
    backgroundColor: C.blueSoft,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  countText: { fontFamily: F.bodySemi, fontSize: 9.5, color: C.blueDeep },

  proCard: {
    width: 230,
    backgroundColor: '#fff',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    ...SHADOW.card,
  },
  proName: { fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  verifiedText: { fontFamily: F.bodyMedium, fontSize: 10, color: C.green },
  proCat: { fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 8 },
  proRating: { fontFamily: F.bodySemi, fontSize: 12, color: C.ink, flexShrink: 1 },
  proPrice: { fontFamily: F.bodySemi, fontSize: 11.5, color: C.blueDeep, flexShrink: 0, marginLeft: 6 },

  popRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.sm,
    paddingRight: S.md,
  },
  popThumb: { width: 56, height: 56, borderRadius: R.sm, backgroundColor: C.blueSoft },
  popName: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  popPrice: { fontFamily: F.bodySemi, fontSize: 11.5, color: C.blueDeep, marginTop: 3 },

  trustBand: {
    marginHorizontal: S.lg,
    marginTop: S.xl,
    backgroundColor: C.navy,
    borderRadius: R.lg,
    padding: S.lg,
    ...SHADOW.navy,
  },
  statV: { fontFamily: F.display, fontSize: 18, color: '#fff' },
  statK: { fontFamily: F.body, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  trustDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: S.md },
  trustLine: { fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});
