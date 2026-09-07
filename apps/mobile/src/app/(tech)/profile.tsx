import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, ErrorBox, H1, Hint, OkBox, Row, StatusPill } from '../../components/ui';
import { api, DocumentType, ProviderProfile, uploadImage } from '../../lib/api';
import { C, F, R, S } from '../../lib/theme';
import { useAuth } from '../../store/auth';

/** The paperwork the official onboarding protocol requires, in review order. */
const REQUIRED: { type: DocumentType; label: string; am: string; hint: string }[] = [
  { type: 'NATIONAL_ID', label: 'Fayda / Resident ID', am: 'ፋይዳ ወይም የነዋሪነት መታወቂያ', hint: 'A clear photo of the front' },
  { type: 'WOREDA_RECOMMENDATION', label: 'Woreda recommendation letter', am: 'የወረዳ የድጋፍ ደብዳቤ', hint: 'From your residential Woreda' },
  { type: 'COC_CERTIFICATE', label: 'CoC certificate', am: 'የCoC ሰርተፍኬት', hint: 'Government skill assessment' },
  { type: 'POLICE_CLEARANCE', label: 'Police clearance', am: 'የፖሊስ ማረጋገጫ', hint: 'Recent criminal record check' },
];

/** Technician profile: identity, verification state, rating, sign out. */
export default function TechProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [busy, setBusy] = useState<DocumentType | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api<ProviderProfile | null>('/providers/me').then(setProfile).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  /** Photograph or pick a document, upload it, then register it for review. */
  async function upload(type: DocumentType) {
    setError('');
    setNotice('');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    setBusy(type);
    try {
      const up = await uploadImage(res.assets[0].uri);
      await api('/providers/me/documents', {
        method: 'POST',
        body: JSON.stringify({ type, objectKey: up.objectKey }),
      });
      setNotice('Uploaded - our verification team reviews it within 3-5 days.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.wrap}>
        <H1>መገለጫ · Profile</H1>

        <Card style={{ marginTop: S.lg }}>
          <Row>
            <View style={st.avatar}>
              <Text style={st.avatarText}>{(user?.name ?? '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{user?.name ?? 'Technician'}</Text>
              <Hint>{user?.phone?.replace('+251', '0')}</Hint>
              {profile?.category && (
                <Am style={{ marginTop: 2 }}>
                  {profile.category.nameAm} · {profile.category.nameEn}
                </Am>
              )}
            </View>
            {profile && <StatusPill status={profile.verificationStatus} />}
          </Row>
        </Card>

        {profile && (
          <Card style={{ marginTop: S.md }}>
            <Row style={{ justifyContent: 'space-around' }}>
              <View style={st.stat}>
                <Text style={st.statV}>{profile.ratingCount ? profile.ratingAvg.toFixed(1) : '-'}</Text>
                <Hint>★ rating</Hint>
              </View>
              <View style={st.stat}>
                <Text style={st.statV}>{profile.ratingCount}</Text>
                <Hint>reviews</Hint>
              </View>
              <View style={st.stat}>
                <Text style={st.statV}>{profile.serviceRadiusKm} km</Text>
                <Hint>radius</Hint>
              </View>
            </Row>
          </Card>
        )}

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Documents · ሰነዶች</Text>
          <Hint style={{ marginTop: 6, lineHeight: 19 }}>
            Upload each document once. Our verification team reviews them within 3-5 days, and you
            can go online as soon as your profile is verified.
          </Hint>
          <ErrorBox>{error}</ErrorBox>
          <OkBox>{notice}</OkBox>
          {REQUIRED.map((d) => {
            const doc = profile?.documents?.find((x) => x.type === d.type);
            const tone =
              doc?.state === 'APPROVED' ? C.green : doc?.state === 'REJECTED' ? C.red : C.amber;
            return (
              <Pressable
                key={d.type}
                style={st.docRow}
                disabled={busy !== null || doc?.state === 'APPROVED'}
                onPress={() => upload(d.type)}
              >
                <MaterialCommunityIcons
                  name={
                    doc?.state === 'APPROVED'
                      ? 'check-circle'
                      : doc?.state === 'REJECTED'
                        ? 'alert-circle'
                        : doc
                          ? 'clock-outline'
                          : 'tray-arrow-up'
                  }
                  size={22}
                  color={doc ? tone : C.blue}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.docName} numberOfLines={1}>
                    {d.label}
                  </Text>
                  <Am style={{ fontSize: 11 }} numberOfLines={1}>
                    {d.am}
                  </Am>
                  <Hint style={{ fontSize: 11, marginTop: 2 }} numberOfLines={2}>
                    {busy === d.type
                      ? 'Uploading…'
                      : doc?.state === 'REJECTED'
                        ? doc.reviewNote || 'Rejected - please upload a clearer copy'
                        : doc
                          ? doc.state === 'APPROVED'
                            ? 'Approved'
                            : 'Waiting for review'
                          : d.hint}
                  </Hint>
                </View>
                {doc?.state !== 'APPROVED' && (
                  <Text style={st.docAction}>{doc ? 'Replace' : 'Upload'}</Text>
                )}
              </Pressable>
            );
          })}
        </Card>

        <Btn
          title="Sign out · ውጣ"
          kind="line"
          style={{ marginTop: S.xl }}
          onPress={async () => {
            await signOut();
            router.replace('/welcome');
          }}
        />
        <Hint style={{ textAlign: 'center', marginTop: S.lg }}>
          Addis Tiggena · Connect · Fix · Care
        </Hint>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.lg, paddingBottom: S.xxl },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: F.display, fontSize: 20, color: '#fff' },
  name: { fontFamily: F.displayBold, fontSize: 17, color: C.navy },
  h: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  docName: { fontFamily: F.bodySemi, fontSize: 13.5, color: C.ink },
  docAction: {
    fontFamily: F.bodySemi,
    fontSize: 11.5,
    color: C.blue,
    backgroundColor: C.blueSoft,
    borderRadius: R.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stat: { alignItems: 'center' },
  statV: { fontFamily: F.display, fontSize: 20, color: C.navy },
});
