import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F, R, S, SHADOW } from '../lib/theme';

/**
 * Welcome / onboarding - the navy brand moment. A client picks their side
 * (book a service vs. work as a technician) and lands on the same login;
 * the account's role decides the experience after sign-in.
 */
export default function Welcome() {
  return (
    <View style={st.root}>
      {/* oversized Amharic watermark, like the web hero */}
      <Text style={st.watermark}>ጥገና</Text>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={st.inner}>
          <View style={st.brandCard}>
            <Image source={require('../../assets/images/icon.png')} style={st.logo} resizeMode="contain" />
          </View>

          <Text style={st.h1}>
            A verified technician,{'\n'}
            <Text style={{ color: '#7cc0ff' }}>at your door in minutes.</Text>
          </Text>
          <Text style={st.am}>ማንነቱ የተረጋገጠ የጥገና ባለሙያ በደቂቃ ውስጥ በርዎ ላይ</Text>

          <View style={st.badges}>
            {['✓ Woreda-cleared', '✓ CoC-certified', '★ Rated & reviewed'].map((b) => (
              <View key={b} style={st.badge}>
                <Text style={st.badgeText}>{b}</Text>
              </View>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          <Pressable style={({ pressed }) => [st.roleCard, pressed && st.pressed]} onPress={() => router.push('/login')}>
            <MaterialCommunityIcons name="home-variant" size={28} color={C.blue} />
            <View style={{ flex: 1 }}>
              <Text style={st.roleTitle}>I need a repair</Text>
              <Text style={st.roleAm}>አገልግሎት እፈልጋለሁ · book trusted technicians</Text>
            </View>
            <Text style={st.chev}>›</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [st.roleCard, st.roleCardAlt, pressed && st.pressed]}
            onPress={() => router.push('/login')}
          >
            <MaterialCommunityIcons name="hammer-wrench" size={28} color={C.navy} />
            <View style={{ flex: 1 }}>
              <Text style={st.roleTitle}>I am a technician</Text>
              <Text style={st.roleAm}>ባለሙያ ነኝ · receive jobs, earn money</Text>
            </View>
            <Text style={st.chev}>›</Text>
          </Pressable>

          <Text style={st.foot}>Addis Ababa · አዲስ አበባ - Connect · Fix · Care</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.navy },
  watermark: {
    position: 'absolute',
    right: -30,
    top: '30%',
    fontFamily: F.amBold,
    fontSize: 170,
    color: 'rgba(255,255,255,0.05)',
  },
  inner: { flex: 1, padding: S.xl, paddingTop: S.xxl },
  brandCard: {
    backgroundColor: '#fff',
    borderRadius: R.xl,
    alignSelf: 'flex-start',
    padding: 14,
    marginBottom: S.xl,
    ...SHADOW.navy,
  },
  logo: { width: 74, height: 74 },
  h1: { fontFamily: F.display, fontSize: 30, lineHeight: 38, color: '#fff' },
  am: { fontFamily: F.am, fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: S.lg },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { fontFamily: F.bodyMedium, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.md,
    ...SHADOW.navy,
  },
  roleCardAlt: { backgroundColor: 'rgba(232,241,251,0.96)' },
  pressed: { transform: [{ scale: 0.985 }] },
  roleTitle: { fontFamily: F.displayBold, fontSize: 16, color: C.navy },
  roleAm: { fontFamily: F.am, fontSize: 12, color: C.muted, marginTop: 2 },
  chev: { fontSize: 26, color: C.blue, fontFamily: F.displayBold },
  foot: {
    fontFamily: F.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: S.lg,
  },
});
