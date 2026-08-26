import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Am, Btn, ErrorBox, Field, H1, Hint, OkBox } from '../components/ui';
import { User } from '../lib/api';
import { C, F, S } from '../lib/theme';
import { useAuth } from '../store/auth';

type Stage = 'phone' | 'code' | 'name' | 'password';

/** Phone-OTP first (the consumer flow), with a username/password door for staff & demo. */
export default function Login() {
  const { requestOtp, verifyOtp, passwordLogin, updateName } = useAuth();
  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<TextInput>(null);

  const go = (user: User) => {
    if (user.role === 'PROVIDER') router.replace('/(tech)/jobs');
    else router.replace('/(customer)/home');
  };

  async function run(fn: () => Promise<void>) {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <Text style={st.eyebrow}>WELCOME · እንኳን ደህና መጡ</Text>
          <H1>ይግቡ · Sign in</H1>
          <Hint style={{ marginTop: 6, marginBottom: S.xl }}>
            {stage === 'password'
              ? 'Sign in with your username and password.'
              : 'One phone number is all you need - we text you a code.'}
          </Hint>

          <ErrorBox>{error}</ErrorBox>

          {stage === 'phone' && (
            <>
              <Field
                label="Phone number · ስልክ ቁጥር"
                placeholder="09… or +2519…"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
              <Btn
                title="Send code · ኮድ ላክ"
                busy={busy}
                disabled={phone.replace(/\D/g, '').length < 9}
                onPress={() =>
                  run(async () => {
                    const res = await requestOtp(phone);
                    setDevCode(res.devCode ?? null);
                    setStage('code');
                    setTimeout(() => codeRef.current?.focus(), 350);
                  })
                }
              />
              <Btn title="Use username & password" kind="ghost" style={{ marginTop: S.md }} onPress={() => setStage('password')} />
            </>
          )}

          {stage === 'code' && (
            <>
              <Field
                ref={codeRef}
                label={`6-digit code sent to ${phone}`}
                placeholder="••••••"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                style={st.codeInput}
              />
              {devCode && <OkBox>Test mode (SMS gateway pending) - your code is {devCode}</OkBox>}
              <Btn
                title="Verify · አረጋግጥ"
                busy={busy}
                disabled={code.length !== 6}
                onPress={() =>
                  run(async () => {
                    const user = await verifyOtp(phone, code);
                    if (!user.name) setStage('name');
                    else go(user);
                  })
                }
              />
              <Btn title="← Change number" kind="ghost" style={{ marginTop: S.md }} onPress={() => { setStage('phone'); setCode(''); }} />
            </>
          )}

          {stage === 'name' && (
            <>
              <OkBox>Verified ✓ - welcome to Addis Tiggena.</OkBox>
              <Field
                label="Your name · ስምዎ"
                placeholder="e.g. Marta Abebe"
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={100}
              />
              <Hint style={{ marginBottom: S.md }}>Shown to your technician when they arrive.</Hint>
              <Btn
                title="Continue · ይቀጥሉ"
                busy={busy}
                disabled={name.trim().length < 2}
                onPress={() =>
                  run(async () => {
                    await updateName(name.trim());
                    router.replace('/(customer)/home');
                  })
                }
              />
              <Btn title="Skip for now" kind="ghost" style={{ marginTop: S.md }} onPress={() => router.replace('/(customer)/home')} />
            </>
          )}

          {stage === 'password' && (
            <>
              <Field
                label="Username · መለያ ስም"
                placeholder="e.g. technician"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
                autoFocus
              />
              <Field
                label="Password · የይለፍ ቃል"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <Btn
                title="Sign in · ይግቡ"
                busy={busy}
                disabled={username.trim().length < 2 || password.length < 6}
                onPress={() => run(async () => go(await passwordLogin(username, password)))}
              />
              <Btn title="← Use phone code instead" kind="ghost" style={{ marginTop: S.md }} onPress={() => setStage('phone')} />
            </>
          )}

          <View style={{ marginTop: S.xl }}>
            <Am style={{ textAlign: 'center' }}>የተረጋገጡ ባለሙያዎች፣ በደቂቃዎች።</Am>
            <Hint style={{ textAlign: 'center', marginTop: 4 }}>Verified professionals, minutes away - across Addis Ababa.</Hint>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { padding: S.xl, paddingTop: S.xxl },
  eyebrow: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, color: C.blue, marginBottom: 8 },
  codeInput: { fontFamily: F.displayBold, fontSize: 24, letterSpacing: 12, textAlign: 'center' },
});
