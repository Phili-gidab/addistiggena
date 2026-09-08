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

const GENDERS = [
  { value: 'MALE', label: 'Male · ወንድ' },
  { value: 'FEMALE', label: 'Female · ሴት' },
];

const ID_TYPES = [
  { value: 'FAYDA', label: 'Fayda / National ID · ፋይዳ' },
  { value: 'KEBELE', label: 'Kebele ID · የቀበሌ መታወቂያ' },
];

const EDUCATION = [
  { value: 'TVET', label: 'TVET · ቴክኒክና ሙያ' },
  { value: 'DIPLOMA', label: 'Diploma · ዲፕሎማ' },
  { value: 'DEGREE', label: 'Degree · ዲግሪ' },
  { value: 'ABOVE_DEGREE', label: 'Above degree · ከዲግሪ በላይ' },
];

/**
 * Technician onboarding, section by section from the company's official
 * Technician Registration Form. Signing in only creates an account - this is
 * where someone becomes a technician: who they are, what they can do, where
 * they want to work, who vouches for them, and the declaration they sign.
 * Documents are uploaded afterwards on the profile tab, and dispatch stays
 * closed until the verification desk marks them verified.
 */
export default function TechSignup() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  // 1 - area of service
  const [categoryId, setCategoryId] = useState('');

  // 2 - personal details
  const [gender, setGender] = useState('');
  const [idType, setIdType] = useState('FAYDA');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [residentialSubCity, setResidentialSubCity] = useState('');
  const [residentialWoreda, setResidentialWoreda] = useState('');
  const [houseNumber, setHouseNumber] = useState('');

  // 3 - skills and where they want to work
  const [specialization, setSpecialization] = useState('');
  const [years, setYears] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [certifications, setCertifications] = useState('');
  const [subCity, setSubCity] = useState('');
  const [woreda, setWoreda] = useState('');
  const [radius, setRadius] = useState('10');
  const [bio, setBio] = useState('');

  // 4 - guarantor and declaration
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorSubCity, setGuarantorSubCity] = useState('');
  const [guarantorWoreda, setGuarantorWoreda] = useState('');
  const [guarantorHouseNo, setGuarantorHouseNo] = useState('');
  const [guarantorIdNumber, setGuarantorIdNumber] = useState('');
  const [declarationName, setDeclarationName] = useState('');
  const [agreed, setAgreed] = useState(false);

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
          gender: gender || undefined,
          idType: idNumber.trim() ? idType : undefined,
          idNumber: idNumber.trim() || undefined,
          email: email.trim() || undefined,
          residentialSubCity: residentialSubCity || undefined,
          residentialWoreda: residentialWoreda.trim() || undefined,
          houseNumber: houseNumber.trim() || undefined,
          specialization: specialization.trim() || undefined,
          yearsExperience: years ? Number(years) : undefined,
          educationLevel: educationLevel || undefined,
          certifications: certifications.trim() || undefined,
          subCity: subCity || undefined,
          woreda: woreda.trim() || undefined,
          serviceRadiusKm: radius ? Number(radius) : undefined,
          bio: bio.trim() || undefined,
          guarantorName: guarantorName.trim() || undefined,
          guarantorRelation: guarantorRelation.trim() || undefined,
          guarantorPhone: guarantorPhone.trim() || undefined,
          guarantorSubCity: guarantorSubCity || undefined,
          guarantorWoreda: guarantorWoreda.trim() || undefined,
          guarantorHouseNo: guarantorHouseNo.trim() || undefined,
          guarantorIdNumber: guarantorIdNumber.trim() || undefined,
          declarationName: declarationName.trim() || undefined,
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
  const steps = ['Trade', 'You', 'Skills', 'Guarantor'];

  const Choice = ({
    options,
    value,
    onPick,
  }: {
    options: { value: string; label: string }[];
    value: string;
    onPick: (v: string) => void;
  }) => (
    <View style={st.chips}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[st.chip, value === o.value && st.chipOn]}
          onPress={() => onPick(o.value)}
        >
          <Text style={[st.chipText, value === o.value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <Text style={st.eyebrow}>BECOME A TECHNICIAN · ባለሙያ ይሁኑ</Text>
          <H1>ይመዝገቡ · Register</H1>
          <Hint style={{ marginTop: 6 }}>
            This is the official registration form. Tell us who you are, what you can do and where
            you want to work, then upload your documents - our verification desk reviews everything
            within 3-5 days.
          </Hint>

          <Row style={{ marginTop: S.lg, marginBottom: S.lg, flexWrap: 'wrap', gap: 6 }}>
            {steps.map((label, i) => (
              <View key={label} style={[st.stepChip, step === i + 1 && st.stepChipOn, step > i + 1 && st.stepChipDone]}>
                <Text style={[st.stepText, step >= i + 1 && { color: '#fff' }]}>
                  {step > i + 1 ? '✓' : i + 1} {label}
                </Text>
              </View>
            ))}
          </Row>

          <ErrorBox>{error}</ErrorBox>

          {/* 1 - area of service */}
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

          {/* 2 - personal details */}
          {step === 2 && (
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: S.md }}>
                <Text style={st.h}>የግል መረጃ · Personal details</Text>
                {category && <CatIcon slug={category.slug} size={32} />}
              </Row>

              <Text style={st.label}>Gender · ፆታ</Text>
              <Choice options={GENDERS} value={gender} onPick={setGender} />

              <Text style={st.label}>ID type · የመታወቂያ ዓይነት</Text>
              <Choice options={ID_TYPES} value={idType} onPick={setIdType} />

              <Field
                label="ID number · የመታወቂያ ቁጥር"
                placeholder="ID number"
                value={idNumber}
                onChangeText={setIdNumber}
              />
              <Field
                label="Email address (optional) · ኢመይል"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={st.label}>Where you live · የመኖሪያ ክፍለ ከተማ</Text>
              <View style={st.chips}>
                {SUB_CITIES.map((sc) => (
                  <Pressable
                    key={sc}
                    style={[st.chip, residentialSubCity === sc && st.chipOn]}
                    onPress={() => setResidentialSubCity(sc)}
                  >
                    <Text style={[st.chipText, residentialSubCity === sc && { color: '#fff' }]}>{sc}</Text>
                  </Pressable>
                ))}
              </View>
              <Row style={{ gap: S.md }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Woreda · ወረዳ"
                    placeholder="e.g. 04"
                    value={residentialWoreda}
                    onChangeText={setResidentialWoreda}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="House no. · የቤት ቁጥር"
                    placeholder="e.g. 453"
                    value={houseNumber}
                    onChangeText={setHouseNumber}
                  />
                </View>
              </Row>

              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(1)} />
                <View style={{ flex: 1 }} />
                <Btn title="Continue →" onPress={() => setStep(3)} />
              </Row>
            </Card>
          )}

          {/* 3 - skills and service area */}
          {step === 3 && (
            <Card>
              <Text style={st.h}>ሙያ እና አገልግሎት · Skills and service</Text>
              <Hint style={{ marginTop: 6, marginBottom: S.md }}>
                Your specialization is your trade in your own words. The area below is where you
                want jobs - it does not have to be where you live.
              </Hint>

              <Field
                label="Specialization · ዋና ሙያ"
                placeholder="e.g. house wiring and breaker panels"
                value={specialization}
                onChangeText={setSpecialization}
              />

              <Text style={st.label}>Education · የትምህርት ደረጃ</Text>
              <Choice options={EDUCATION} value={educationLevel} onPick={setEducationLevel} />

              <Field
                label="Certificates or licences held (optional)"
                placeholder="e.g. CoC Level III, TVET electrical"
                value={certifications}
                onChangeText={setCertifications}
              />

              <Text style={st.label}>Preferred service sub-city · የሚሰሩበት ክፍለ ከተማ</Text>
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
              <Field
                label="About your work (optional)"
                placeholder="e.g. 6 years on house wiring and breaker panels across Bole."
                value={bio}
                onChangeText={setBio}
                multiline
              />

              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(2)} />
                <View style={{ flex: 1 }} />
                <Btn title="Continue →" disabled={!subCity} onPress={() => setStep(4)} />
              </Row>
            </Card>
          )}

          {/* 4 - guarantor and the declaration */}
          {step === 4 && (
            <Card>
              <Text style={st.h}>የዋስ መረጃ · Guarantor</Text>
              <Hint style={{ marginTop: 6, marginBottom: S.md }}>
                Your emergency contact and guarantor - someone who vouches for you. The verification
                desk may call them.
              </Hint>
              <Field
                label="Full name · ስም"
                placeholder="Full name"
                value={guarantorName}
                onChangeText={setGuarantorName}
              />
              <Field
                label="Relationship · ግንኙነት"
                placeholder="e.g. brother, former employer"
                value={guarantorRelation}
                onChangeText={setGuarantorRelation}
              />
              <Field
                label="Phone · ስልክ ቁጥር"
                placeholder="09…"
                keyboardType="phone-pad"
                value={guarantorPhone}
                onChangeText={setGuarantorPhone}
              />

              <Text style={st.label}>Their sub-city · ክፍለ ከተማ</Text>
              <View style={st.chips}>
                {SUB_CITIES.map((sc) => (
                  <Pressable
                    key={sc}
                    style={[st.chip, guarantorSubCity === sc && st.chipOn]}
                    onPress={() => setGuarantorSubCity(sc)}
                  >
                    <Text style={[st.chipText, guarantorSubCity === sc && { color: '#fff' }]}>{sc}</Text>
                  </Pressable>
                ))}
              </View>
              <Row style={{ gap: S.md }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Woreda · ወረዳ"
                    placeholder="e.g. 04"
                    value={guarantorWoreda}
                    onChangeText={setGuarantorWoreda}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="House no."
                    placeholder="e.g. 453"
                    value={guarantorHouseNo}
                    onChangeText={setGuarantorHouseNo}
                  />
                </View>
              </Row>
              <Field
                label="Their ID number · የመታወቂያ ቁጥር"
                placeholder="ID number"
                value={guarantorIdNumber}
                onChangeText={setGuarantorIdNumber}
              />

              <View style={st.declaration}>
                <Text style={st.declTitle}>የስምምነት ማረጋገጫ · Declaration</Text>
                <Text style={st.declBody}>
                  ከላይ የተገለፀው ሙሉ መረጃ እውነተኛ እና የራሴ መሆኑን አረጋግጣለሁ። በፕላትፎርሙ በኩል የተመደብኩበትን
                  የሥራ ትእዛዝ ስቀበል የፕላትፎርሙን መመሪያዎች፣ ደንቦችና ሕጎች አክብሬ ለመሥራት እስማማለሁ፤ በሥራው
                  ወቅት ወይም በሥራው ምክንያት ለሚደርስ ጥፋት፣ ጉዳት ወይም ቸልተኝነት ሙሉ የሕግና የፋይናንስ ኃላፊነት
                  እወስዳለሁ።
                </Text>
                <Text style={[st.declBody, { marginTop: 8 }]}>
                  I certify that the information above is accurate and true. I consent to the
                  background checks required for onboarding. By accepting a work assignment through
                  the platform I agree to abide by all platform policies, standards and guidelines,
                  and I take full legal and financial liability for any damage, fault or negligence
                  occurring during or because of the service.
                </Text>
                <Pressable style={st.agreeRow} onPress={() => setAgreed(!agreed)}>
                  <View style={[st.box, agreed && st.boxOn]}>
                    {agreed && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={st.agreeText}>I agree · እስማማለሁ</Text>
                </Pressable>
                <Field
                  label="Type your full name to sign · ሙሉ ስም ይፃፉ"
                  placeholder="Your full name"
                  value={declarationName}
                  onChangeText={setDeclarationName}
                />
              </View>

              <View style={st.nextUp}>
                <MaterialCommunityIcons name="file-document-outline" size={18} color={C.blue} />
                <Hint style={{ flex: 1 }}>
                  Next you will upload your ID, Woreda letter, CoC certificate and police clearance
                  from your profile tab.
                </Hint>
              </View>
              <Row>
                <Btn title="← Back" kind="line" small onPress={() => setStep(3)} />
                <View style={{ flex: 1 }} />
                <Btn
                  title="ይመዝገቡ · Register"
                  busy={busy}
                  disabled={!categoryId || !agreed || declarationName.trim().length < 3}
                  onPress={submit}
                />
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
  declaration: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.md,
    marginBottom: S.lg,
  },
  declTitle: { fontFamily: F.displayBold, fontSize: 13.5, color: C.navy, marginBottom: 8 },
  declBody: { fontFamily: F.body, fontSize: 11.5, lineHeight: 18, color: C.muted },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.md, marginBottom: S.sm },
  box: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  boxOn: { backgroundColor: C.blue, borderColor: C.blue },
  agreeText: { fontFamily: F.bodySemi, fontSize: 13, color: C.navy },
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
