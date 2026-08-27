import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, H1, Hint, Row, StatusPill } from '../../components/ui';
import { api, ProviderProfile } from '../../lib/api';
import { C, F, S } from '../../lib/theme';
import { useAuth } from '../../store/auth';

/** Technician profile: identity, verification state, rating, sign out. */
export default function TechProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      api<ProviderProfile | null>('/providers/me').then(setProfile).catch(() => {});
    }, []),
  );

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
          <Text style={st.h}>Documents & registration</Text>
          <Hint style={{ marginTop: 6, lineHeight: 19 }}>
            Vetting documents (Fayda ID, Woreda letter, CoC, police clearance) are uploaded from the
            website technician dashboard. Your verification status updates here automatically.
          </Hint>
          <Am style={{ marginTop: 8 }}>ሰነዶች በድረ-ገጹ በኩል ይላካሉ።</Am>
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
  stat: { alignItems: 'center' },
  statV: { fontFamily: F.display, fontSize: 20, color: C.navy },
});
