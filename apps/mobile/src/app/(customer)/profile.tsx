import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, Card, ErrorBox, Field, H1, Hint, OkBox, Row } from '../../components/ui';
import { C, F, S } from '../../lib/theme';
import { useAuth } from '../../store/auth';

export default function Profile() {
  const { user, updateName, signOut } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <H1>መገለጫ · Profile</H1>

        <Card style={{ marginTop: S.lg }}>
          <Row>
            <View style={st.avatar}>
              <Text style={st.avatarText}>{(user?.name ?? user?.phone ?? '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{user?.name ?? 'Unnamed'}</Text>
              <Hint>{user?.phone?.replace('+251', '0')}</Hint>
            </View>
          </Row>
        </Card>

        <Card style={{ marginTop: S.md }}>
          <ErrorBox>{error}</ErrorBox>
          <OkBox>{notice}</OkBox>
          <Field label="Display name · ስም" value={name} onChangeText={setName} maxLength={100} />
          <Btn
            title="Save name"
            kind="dark"
            small
            busy={busy}
            disabled={name.trim().length < 2 || name.trim() === (user?.name ?? '')}
            onPress={async () => {
              setBusy(true);
              setError('');
              setNotice('');
              try {
                await updateName(name.trim());
                setNotice('Saved - your technician greets you by this name.');
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </Card>

        <Card style={{ marginTop: S.md }}>
          <Text style={st.h}>Support · ድጋፍ</Text>
          <Hint style={{ marginTop: 6, lineHeight: 19 }}>
            Something wrong with a booking? Open it from My bookings and tap “Need help?” - our
            support desk answers fast. Every repair carries a 5-day guarantee.
          </Hint>
          <Am style={{ marginTop: 8 }}>ችግር ካለ ማስያዣዎን ከፍተው “እርዳታ” ይንኩ።</Am>
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
          Addis Tiggena · a project of Amnen Marketing & Promotion
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
});
