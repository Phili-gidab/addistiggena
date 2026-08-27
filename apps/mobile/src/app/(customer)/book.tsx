import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Am, Btn, Card, CatIcon, ErrorBox, Field, H1, Hint, Row } from '../../components/ui';
import { api, Booking, Category, fmtDistance, NearbyProvider, uploadImage } from '../../lib/api';
import { SUB_CITIES } from '../../lib/catalog';
import { C, F, R, S } from '../../lib/theme';

/** Meskel Square - the landmark every Addis resident knows. */
const ADDIS = { lat: 9.0108, lng: 38.7613 };

/**
 * Booking wizard: category → location (device GPS + sub-city + landmark) →
 * details + photo → technician → confirm. Mirrors the web /book flow.
 */
export default function Book() {
  const params = useLocalSearchParams<{ category?: string }>();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(params.category ?? '');
  const [pos, setPos] = useState(ADDIS);
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'locked' | 'denied'>('idle');
  const [subCity, setSubCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [providers, setProviders] = useState<NearbyProvider[] | null>(null);
  const [providerId, setProviderId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>('/catalog/categories').then(setCategories).catch(() => {});
  }, []);

  // a tap on a home tile pre-selects the category
  useFocusEffect(
    useCallback(() => {
      if (params.category) {
        setCategoryId(params.category);
        setStep((s) => (s === 1 ? 2 : s));
      }
    }, [params.category]),
  );

  const category = categories.find((c) => c.id === categoryId);

  async function locate() {
    setGpsState('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsState('denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setGpsState('locked');
    } catch {
      setGpsState('denied');
    }
  }

  async function pickPhoto() {
    setError('');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets[0]) return;
    setPhotoBusy(true);
    try {
      const up = await uploadImage(res.assets[0].uri);
      setPhotoKey(up.objectKey);
      setPhotoUri(res.assets[0].uri);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function loadNearby() {
    setBusy(true);
    setError('');
    try {
      const list = await api<NearbyProvider[]>(
        `/providers/nearby?categoryId=${categoryId}&lat=${pos.lat}&lng=${pos.lng}`,
      );
      setProviders(list);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const fullLandmark = [subCity, landmark.trim()].filter(Boolean).join(' - ');
      const booking = await api<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          providerId,
          lat: pos.lat,
          lng: pos.lng,
          landmarkNote: fullLandmark || undefined,
          description: description.trim() || undefined,
          photoObjectKey: photoKey ?? undefined,
        }),
      });
      setStep(1);
      setDescription('');
      setLandmark('');
      setPhotoKey(null);
      setPhotoUri(null);
      setProviderId(undefined);
      router.push(`/booking/${booking.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const steps = ['Service', 'Location', 'Details', 'Confirm'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <H1>ማዘዣ · Book a service</H1>
        <Row style={{ marginTop: S.md, marginBottom: S.lg }}>
          {steps.map((label, i) => (
            <View key={label} style={[st.stepChip, step === i + 1 && st.stepChipOn, step > i + 1 && st.stepChipDone]}>
              <Text style={[st.stepText, (step === i + 1 || step > i + 1) && { color: '#fff' }]}>
                {step > i + 1 ? '✓' : i + 1} {label}
              </Text>
            </View>
          ))}
        </Row>

        <ErrorBox>{error}</ErrorBox>

        {/* step 1 - category */}
        {step === 1 && (
          <View style={st.grid}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[st.catTile, categoryId === c.id && st.catTileOn]}
                onPress={() => {
                  setCategoryId(c.id);
                  setStep(2);
                }}
              >
                <CatIcon slug={c.slug} size={36} />
                <Text style={[st.catName, { marginTop: 6 }]}>{c.nameEn}</Text>
                <Am style={{ fontSize: 11 }}>{c.nameAm}</Am>
                {c.priceFloorEtb && <Hint style={{ fontSize: 10.5 }}>from ETB {Number(c.priceFloorEtb)}</Hint>}
              </Pressable>
            ))}
          </View>
        )}

        {/* step 2 - location */}
        {step === 2 && (
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: S.md }}>
              <Text style={st.stepTitle}>ቦታዎ · Your location</Text>
              {category && <CatIcon slug={category.slug} size={32} />}
            </Row>

            <Pressable style={[st.gpsBox, gpsState === 'locked' && st.gpsBoxOk]} onPress={locate}>
              <MaterialCommunityIcons
                name={gpsState === 'locked' ? 'check-circle' : 'crosshairs-gps'}
                size={24}
                color={gpsState === 'locked' ? C.green : C.blue}
              />
              <View style={{ flex: 1 }}>
                <Text style={st.gpsTitle}>
                  {gpsState === 'locked'
                    ? 'GPS pin locked'
                    : gpsState === 'locating'
                      ? 'Locating…'
                      : gpsState === 'denied'
                        ? 'Location denied - pick your sub-city below'
                        : 'Use my GPS location · አካባቢዬን አግኝ'}
                </Text>
                <Hint>
                  {gpsState === 'locked'
                    ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} - the technician navigates here`
                    : 'The nearest technician is matched from your pin'}
                </Hint>
              </View>
            </Pressable>

            <Text style={[st.label, { marginTop: S.lg }]}>Sub-city · ክፍለ ከተማ</Text>
            <View style={st.chips}>
              {SUB_CITIES.map((sc) => (
                <Pressable key={sc} style={[st.chip, subCity === sc && st.chipOn]} onPress={() => setSubCity(sc)}>
                  <Text style={[st.chipText, subCity === sc && { color: '#fff' }]}>{sc}</Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Landmark note · ምልክት"
              placeholder="e.g. Blue gate behind Edna Mall, 3rd floor"
              value={landmark}
              onChangeText={setLandmark}
            />
            <Row>
              <Btn title="← Back" kind="line" small onPress={() => setStep(1)} />
              <View style={{ flex: 1 }} />
              <Btn title="Continue →" disabled={gpsState !== 'locked' && !subCity} onPress={() => setStep(3)} />
            </Row>
          </Card>
        )}

        {/* step 3 - details + photo */}
        {step === 3 && (
          <Card>
            <Text style={st.stepTitle}>ዝርዝር · Describe the problem</Text>
            <Field
              placeholder="Kitchen sink is leaking under the cabinet…"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ marginTop: S.md }}
            />
            <Text style={st.label}>Photo (optional) · ፎቶ</Text>
            {photoUri ? (
              <Row style={{ marginBottom: S.lg }}>
                <Image source={{ uri: photoUri }} style={st.photo} />
                <Btn title="Remove" kind="line" small onPress={() => { setPhotoUri(null); setPhotoKey(null); }} />
              </Row>
            ) : (
              <Btn
                title={photoBusy ? 'Uploading…' : 'Attach a photo · ፎቶ ያያይዙ'}
                kind="ghost"
                busy={photoBusy}
                style={{ marginBottom: S.lg }}
                onPress={pickPhoto}
              />
            )}
            <Hint style={{ marginBottom: S.lg }}>A photo helps the technician arrive with the right tools and parts.</Hint>
            <Row>
              <Btn title="← Back" kind="line" small onPress={() => setStep(2)} />
              <View style={{ flex: 1 }} />
              <Btn title="Find technicians →" busy={busy} onPress={loadNearby} />
            </Row>
          </Card>
        )}

        {/* step 4 - technician + confirm */}
        {step === 4 && (
          <>
            <Card style={{ marginBottom: S.md }}>
              <Text style={st.stepTitle}>ባለሙያ · Technician</Text>
              {providers?.length === 0 && (
                <Hint style={{ marginTop: 8 }}>
                  No one is online in this area right now - post the request anyway and the first
                  available professional takes it.
                </Hint>
              )}
              <Pressable style={[st.provRow, !providerId && st.provRowOn]} onPress={() => setProviderId(undefined)}>
                <MaterialCommunityIcons name="flash" size={20} color={C.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={st.provName}>First available · የመጀመሪያው ነጻ ባለሙያ</Text>
                  <Hint>Broadcast the job - fastest response</Hint>
                </View>
                <View style={[st.radio, !providerId && st.radioOn]} />
              </Pressable>
              {providers?.map((p) => (
                <Pressable key={p.id} style={[st.provRow, providerId === p.id && st.provRowOn]} onPress={() => setProviderId(p.id)}>
                  <MaterialCommunityIcons name="account-hard-hat" size={20} color={C.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.provName}>{p.name ?? 'Technician'}</Text>
                    <Hint>
                      {p.ratingCount ? `★ ${p.ratingAvg.toFixed(1)} (${p.ratingCount}) · ` : ''}
                      {fmtDistance(p.distanceM)}
                      {p.etaMinutes ? ` · ~${p.etaMinutes} min away` : ''}
                    </Hint>
                  </View>
                  <View style={[st.radio, providerId === p.id && st.radioOn]} />
                </Pressable>
              ))}
            </Card>

            <Card>
              <Text style={st.stepTitle}>ያረጋግጡ · Confirm</Text>
              {[
                ['Service', category ? `${category.nameAm} - ${category.nameEn}` : '-'],
                ['Location', subCity || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`],
                ['Landmark', landmark || '-'],
                ['Photo', photoKey ? 'Attached ✓' : '-'],
                ['Estimate', category?.priceFloorEtb ? `from ETB ${Number(category.priceFloorEtb)}` : '-'],
              ].map(([k, v]) => (
                <Row key={k} style={st.receiptRow}>
                  <Hint style={{ width: 84 }}>{k}</Hint>
                  <Text style={st.receiptV}>{v}</Text>
                </Row>
              ))}
              <Hint style={{ marginVertical: S.md }}>
                You pay the technician directly - cash, Telebirr or CBE Birr - at the standard
                platform rate. Every repair carries a 5-day guarantee.
              </Hint>
              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(3)} />
                <View style={{ flex: 1 }} />
                <Btn title="አዝዝ · Book now" busy={busy} onPress={submit} />
              </Row>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  stepChip: {
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  stepChipOn: { backgroundColor: C.blue, borderColor: C.blue },
  stepChipDone: { backgroundColor: C.navy, borderColor: C.navy },
  stepText: { fontFamily: F.bodySemi, fontSize: 10.5, color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  catTile: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.line,
    padding: S.md,
    gap: 2,
  },
  catTileOn: { borderColor: C.blue, backgroundColor: C.blueSoft },
  catName: { fontFamily: F.bodySemi, fontSize: 13, color: C.ink },
  stepTitle: { fontFamily: F.displayBold, fontSize: 15.5, color: C.navy },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: C.navy, marginBottom: 6 },
  gpsBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.blue,
    backgroundColor: C.blueSoft,
    padding: S.md,
  },
  gpsBoxOk: { borderColor: C.green, backgroundColor: C.okBg },
  gpsTitle: { fontFamily: F.bodySemi, fontSize: 13.5, color: C.navy },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: S.lg },
  chip: {
    borderRadius: R.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.navy, borderColor: C.navy },
  chipText: { fontFamily: F.bodyMedium, fontSize: 12, color: C.ink },
  photo: { width: 84, height: 84, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  provRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  provRowOn: { backgroundColor: C.blueSoft, borderRadius: R.sm, paddingHorizontal: 8 },
  provName: { fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.line },
  radioOn: { borderColor: C.blue, backgroundColor: C.blue },
  receiptRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  receiptV: { fontFamily: F.bodyMedium, fontSize: 13, color: C.ink, flex: 1 },
});
