import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, CatIcon, ErrorBox, Field, H1, Hint, Row } from '../components/ui';
import { api, Category, ProviderProfile } from '../lib/api';
import { SUB_CITIES } from '../lib/catalog';
import { C, F, R, S } from '../lib/theme';
import { useAuth } from '../store/auth';

/**
 * Technician onboarding, straight from the official vetting protocol. Signing
 * in only creates an account - this is where someone becomes a technician:
 * trade, where they work, experience, and the guarantor/ID details the
 * verification desk needs. Documents are uploaded afterwards on the profile
 * tab, and dispatch stays closed until the desk marks them verified.
 */
export default function TechSignup() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [subCity, setSubCity] = useState('');
  const [woreda, setWoreda] = useState('');
  const [years, setYears] = useState('');
  const [radius, setRadius] = useState('10');
  const [bio, setBio] = useState('');
  const [faydaId, setFaydaId] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>('/catalog/categories').then(setCategories).catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api<ProviderProfile>('/providers/me', {
        method: 'PUT',
        body: JSON.stringify({
          categoryId,
          subCity: subCity || undefined,
          woreda: woreda.trim() || undefined,
          yearsExperience: years ? Number(years) : undefined,
          serviceRadiusKm: radius ? Number(radius) : undefined,
          bio: bio.trim() || undefined,
          faydaIdNumber: faydaId.trim() || undefined,
          guarantorName: guarantorName.trim() || undefined,
          guarantorPhone: guarantorPhone.trim() || undefined,
        }),
      });
      // the account is a PROVIDER now - refresh the session so routing follows
      await refreshUser();
      router.replace('/(tech)/profile');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const category = categories.find((c) => c.id === categoryId);
  const steps = ['Trade', 'Area', 'Vetting'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <Text style={st.eyebrow}>BECOME A TECHNICIAN · ባለሙያ ይሁኑ</Text>
          <H1>ይመዝገቡ · Register</H1>
          <Hint style={{ marginTop: 6 }}>
            No degree required. Tell us your trade and where you work, then upload your documents -
            our verification desk reviews everything within 3-5 days.
          </Hint>

          <Row style={{ marginTop: S.lg, marginBottom: S.lg }}>
            {steps.map((label, i) => (
              <View key={label} style={[st.stepChip, step === i + 1 && st.stepChipOn, step > i + 1 && st.stepChipDone]}>
                <Text style={[st.stepText, step >= i + 1 && { color: '#fff' }]}>
                  {step > i + 1 ? '✓' : i + 1} {label}
                </Text>
              </View>
            ))}
          </Row>

          <ErrorBox>{error}</ErrorBox>

          {/* 1 - trade */}
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
                </Pressable>
              ))}
            </View>
          )}

          {/* 2 - where they work */}
          {step === 2 && (
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: S.md }}>
                <Text style={st.h}>የስራ አካባቢዎ · Where you work</Text>
                {category && <CatIcon slug={category.slug} size={32} />}
              </Row>
              <Text style={st.label}>Sub-city · ክፍለ ከተማ</Text>
              <View style={st.chips}>
                {SUB_CITIES.map((sc) => (
                  <Pressable key={sc} style={[st.chip, subCity === sc && st.chipOn]} onPress={() => setSubCity(sc)}>
                    <Text style={[st.chipText, subCity === sc && { color: '#fff' }]}>{sc}</Text>
                  </Pressable>
                ))}
              </View>
              <Field label="Woreda · ወረዳ" placeholder="e.g. 04" value={woreda} onChangeText={setWoreda} />
              <Row style={{ gap: S.md }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Years of experience"
                    placeholder="e.g. 6"
                    keyboardType="number-pad"
                    value={years}
                    onChangeText={(v) => setYears(v.replace(/\D/g, ''))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Travel radius (km)"
                    placeholder="10"
                    keyboardType="number-pad"
                    value={radius}
                    onChangeText={(v) => setRadius(v.replace(/\D/g, ''))}
                  />
                </View>
              </Row>
              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(1)} />
                <View style={{ flex: 1 }} />
                <Btn title="Continue →" disabled={!subCity} onPress={() => setStep(3)} />
              </Row>
            </Card>
          )}

          {/* 3 - vetting details */}
          {step === 3 && (
            <Card>
              <Text style={st.h}>ማረጋገጫ · Vetting details</Text>
              <Hint style={{ marginTop: 6, marginBottom: S.md }}>
                Required by the onboarding protocol. A guarantor is someone from your area who
                vouches for you - the verification desk may call them.
              </Hint>
              <Field
                label="Fayda / Resident ID number"
                placeholder="ID number"
                value={faydaId}
                onChangeText={setFaydaId}
              />
              <Field
                label="Guarantor name · የዋስ ስም"
                placeholder="Full name"
                value={guarantorName}
                onChangeText={setGuarantorName}
              />
              <Field
                label="Guarantor phone · የዋስ ስልክ"
                placeholder="09…"
                keyboardType="phone-pad"
                value={guarantorPhone}
                onChangeText={setGuarantorPhone}
              />
              <Field
                label="About your work (optional)"
                placeholder="e.g. 6 years on house wiring and breaker panels across Bole."
                value={bio}
                onChangeText={setBio}
                multiline
              />
              <View style={st.nextUp}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color={C.blue} />
                <Hint style={{ flex: 1 }}>
                  Next you will upload your Fayda ID, Woreda letter, CoC certificate and police
                  clearance from your profile tab.
                </Hint>
              </View>
              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(2)} />
                <View style={{ flex: 1 }} />
                <Btn title="ይመዝገቡ · Register" busy={busy} disabled={!categoryId} onPress={submit} />
              </Row>
            </Card>
          )}

          <Pressable onPress={() => router.replace(user ? '/(customer)/home' : '/welcome')}>
            <Text style={st.skip}>Not a technician? Continue as a customer</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  eyebrow: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, color: C.blue, marginBottom: 8 },
  h: { fontFamily: F.displayBold, fontSize: 15.5, color: C.navy },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: C.navy, marginBottom: 6 },
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
  stepText: { fontFamily: F.bodySemi, fontSize: 11, color: C.muted },
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
  nextUp: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: C.blueSoft,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.lg,
  },
  skip: { fontFamily: F.body, fontSize: 12.5, color: C.muted, textAlign: 'center', marginTop: S.xl },
});
