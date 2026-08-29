import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, CatIcon, Hint } from '../components/ui';
import { api, Category } from '../lib/api';
import { tradeImg } from '../lib/images';
import { C, F, R, S } from '../lib/theme';

/** All services - photo-card grid; a tap opens the category page (browse
 *  first, book from there). */
export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api<Category[]>('/catalog/categories').then(setCategories).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <FlatList
        data={categories}
        numColumns={2}
        keyExtractor={(c) => c.id}
        columnWrapperStyle={{ gap: S.sm }}
        contentContainerStyle={st.wrap}
        ListHeaderComponent={
          <View style={{ marginBottom: S.lg }}>
            <Pressable onPress={() => router.back()} style={st.back}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={C.blue} />
              <Text style={st.backText}>Back</Text>
            </Pressable>
            <Text style={st.title}>All services</Text>
            <Am style={{ fontSize: 13 }}>ሁሉም አገልግሎቶች</Am>
          </View>
        }
        renderItem={({ item: c }) => (
          <Pressable
            style={({ pressed }) => [st.card, pressed && { transform: [{ scale: 0.98 }] }]}
            onPress={() => router.push(`/category/${c.id}`)}
          >
            <View style={st.photoWrap}>
              <Image source={{ uri: tradeImg(c.slug) }} style={st.photo} resizeMode="cover" />
              <View style={st.wash} />
              <View style={st.iconFloat}>
                <CatIcon slug={c.slug} size={32} />
              </View>
            </View>
            <View style={{ padding: S.md, paddingTop: 22 }}>
              <Text style={st.name} numberOfLines={1}>
                {c.nameEn}
              </Text>
              <Am style={{ fontSize: 10.5 }} numberOfLines={1}>
                {c.nameAm}
              </Am>
              <View style={st.metaRow}>
                {(c.subServices?.length ?? 0) > 0 && (
                  <View style={st.chip}>
                    <Text style={st.chipText} numberOfLines={1}>
                      {c.subServices!.length} services
                    </Text>
                  </View>
                )}
                {c.priceFloorEtb && (
                  <Hint style={{ fontSize: 10.5 }} numberOfLines={1}>
                    from {Number(c.priceFloorEtb)} ETB
                  </Hint>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  back: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md, marginLeft: -6 },
  backText: { fontFamily: F.bodySemi, fontSize: 15, color: C.blue },
  title: { fontFamily: F.display, fontSize: 24, color: C.navy },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    marginBottom: S.sm,
  },
  photoWrap: { height: 86 },
  photo: { width: '100%', height: '100%' },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 30, 63, 0.28)',
  },
  iconFloat: {
    position: 'absolute',
    left: S.md,
    bottom: -16,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: C.blueSoft,
  },
  name: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  chip: {
    backgroundColor: C.blueSoft,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipText: { fontFamily: F.bodySemi, fontSize: 9.5, color: C.blueDeep },
});
