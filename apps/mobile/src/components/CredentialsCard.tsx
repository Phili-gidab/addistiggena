import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Am, Btn, Card, ErrorBox, Field, Hint, OkBox } from './ui';
import { C, F, S } from '../lib/theme';
import { useAuth } from '../store/auth';

/**
 * Set or change the username + password. Phone-OTP always works; this is the
 * faster door for people who sign out often (and the only practical one when
 * the SMS gateway is slow or the account has no credit).
 */
export function CredentialsCard() {
  const { user, setCredentials } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Card style={{ marginTop: S.md }}>
      <Text style={st.h}>Sign-in details · የመግቢያ መረጃ</Text>
      <Hint style={{ marginTop: 6, marginBottom: S.md, lineHeight: 19 }}>
        {user?.username
          ? 'Change the username or password you sign in with. Your phone number still works.'
          : 'Set a username and password so you can sign in without waiting for an SMS code.'}
      </Hint>
      <ErrorBox>{error}</ErrorBox>
      <OkBox>{notice}</OkBox>
      <Field
        label="Username · መለያ ስም"
        placeholder="e.g. marta"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase())}
        maxLength={40}
      />
      <Field
        label="New password · የይለፍ ቃል (8+)"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Btn
        title="Save · አስቀምጥ"
        kind="dark"
        small
        busy={busy}
        disabled={username.trim().length < 3 || password.length < 8}
        onPress={async () => {
          setBusy(true);
          setError('');
          setNotice('');
          try {
            await setCredentials(username.trim(), password);
            setPassword('');
            setNotice('Saved - you can now sign in with this username and password.');
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Am style={{ marginTop: 8 }}>ስልክ ቁጥርዎ አሁንም ይሰራል</Am>
    </Card>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: F.displayBold, fontSize: 14.5, color: C.navy },
});
