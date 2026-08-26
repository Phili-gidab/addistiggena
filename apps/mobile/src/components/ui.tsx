/** Addis Tiggena mobile UI kit - buttons, cards, fields, pills, timeline dots. */
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { C, F, R, S, SHADOW } from '../lib/theme';

// ── typography ───────────────────────────────────────────────────────────────

export const H1 = ({ children, style, ...rest }: TextProps & { style?: object }) => (
  <Text {...rest} style={[st.h1, style]}>{children}</Text>
);
export const H2 = ({ children, style, ...rest }: TextProps & { style?: object }) => (
  <Text {...rest} style={[st.h2, style]}>{children}</Text>
);
export const Body = ({ children, style, ...rest }: TextProps & { style?: object }) => (
  <Text {...rest} style={[st.body, style]}>{children}</Text>
);
export const Hint = ({ children, style, ...rest }: TextProps & { style?: object }) => (
  <Text {...rest} style={[st.hint, style]}>{children}</Text>
);
/** Amharic text - always Noto Sans Ethiopic. */
export const Am = ({ children, style, ...rest }: TextProps & { style?: object }) => (
  <Text {...rest} style={[st.am, style]}>{children}</Text>
);

// ── surfaces ─────────────────────────────────────────────────────────────────

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => (
  <View style={[st.card, style]}>{children}</View>
);

export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[st.row, style]}>{children}</View>
);

// ── buttons ──────────────────────────────────────────────────────────────────

export function Btn({
  title,
  onPress,
  kind = 'primary',
  busy,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'primary' | 'dark' | 'line' | 'ghost' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        st.btn,
        small && st.btnSmall,
        kind === 'primary' && { backgroundColor: C.blue },
        kind === 'dark' && { backgroundColor: C.navy },
        kind === 'danger' && { backgroundColor: C.red },
        kind === 'line' && st.btnLine,
        kind === 'ghost' && st.btnGhost,
        off && { opacity: 0.5 },
        pressed && !off && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={kind === 'line' || kind === 'ghost' ? C.navy : '#fff'} />
      ) : (
        <Text
          style={[
            st.btnText,
            small && { fontSize: 13 },
            (kind === 'line' || kind === 'ghost') && { color: C.navy },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

// ── form field ───────────────────────────────────────────────────────────────

export const Field = forwardRef<TextInput, TextInputProps & { label?: string }>(function Field(
  { label, style, ...props },
  ref,
) {
  return (
    <View style={{ marginBottom: S.lg }}>
      {label ? <Text style={st.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={C.muted}
        {...props}
        style={[st.input, props.multiline && { height: 88, textAlignVertical: 'top', paddingTop: 12 }, style]}
      />
    </View>
  );
});

// ── status pill ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  REQUESTED: { bg: C.warnBg, fg: C.warnFg },
  ACCEPTED: { bg: C.blueSoft, fg: C.blueDeep },
  EN_ROUTE: { bg: C.blueSoft, fg: C.blueDeep },
  ARRIVED: { bg: C.blueSoft, fg: C.navy },
  IN_PROGRESS: { bg: C.blueSoft, fg: C.navy },
  COMPLETED: { bg: C.okBg, fg: C.okFg },
  PAID: { bg: C.okBg, fg: C.okFg },
  CANCELLED: { bg: '#f3f4f7', fg: C.muted },
  EXPIRED: { bg: '#f3f4f7', fg: C.muted },
  REJECTED: { bg: '#f3f4f7', fg: C.muted },
};

export const StatusPill = ({ status }: { status: string }) => {
  const tone = STATUS_TONE[status] ?? { bg: C.blueSoft, fg: C.blueDeep };
  return (
    <View style={[st.pill, { backgroundColor: tone.bg }]}>
      <Text style={[st.pillText, { color: tone.fg }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
};

// ── notices ──────────────────────────────────────────────────────────────────

export const ErrorBox = ({ children }: { children: React.ReactNode }) =>
  children ? (
    <View style={[st.notice, { backgroundColor: '#fdecec', borderColor: '#f3c4c4' }]}>
      <Text style={[st.noticeText, { color: '#8f2525' }]}>{children}</Text>
    </View>
  ) : null;

export const OkBox = ({ children }: { children: React.ReactNode }) =>
  children ? (
    <View style={[st.notice, { backgroundColor: C.okBg, borderColor: '#bfe6d6' }]}>
      <Text style={[st.noticeText, { color: C.okFg }]}>{children}</Text>
    </View>
  ) : null;

// ── countdown (dispatch offer window) ────────────────────────────────────────

export function Countdown({ seconds, total = 300 }: { seconds: number; total?: number }) {
  const frac = Math.max(0, Math.min(1, seconds / total));
  const tone = frac > 0.45 ? C.blue : frac > 0.18 ? C.amber : C.red;
  const mmss = seconds > 99 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : `${seconds}s`;
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[st.hint, { color: C.warnFg }]}>Technician response window</Text>
        <Text style={{ fontFamily: F.displayBold, fontSize: 15, color: tone }}>{mmss}</Text>
      </Row>
      <View style={st.track}>
        <View style={[st.fill, { width: `${frac * 100}%`, backgroundColor: tone }]} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 26, color: C.navy, lineHeight: 33 },
  h2: { fontFamily: F.displayBold, fontSize: 17, color: C.navy },
  body: { fontFamily: F.body, fontSize: 14.5, color: C.ink, lineHeight: 21 },
  hint: { fontFamily: F.body, fontSize: 12.5, color: C.muted, lineHeight: 18 },
  am: { fontFamily: F.am, fontSize: 13.5, color: C.muted },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    padding: S.lg,
    ...SHADOW.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  btn: {
    height: 50,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  btnSmall: { height: 38, paddingHorizontal: 14 },
  btnLine: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.line },
  btnGhost: { backgroundColor: C.blueSoft },
  btnText: { fontFamily: F.bodySemi, fontSize: 15, color: '#fff' },
  label: { fontFamily: F.bodySemi, fontSize: 13, color: C.navy, marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: F.body,
    fontSize: 15,
    color: C.ink,
  },
  pill: { borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 0.4 },
  notice: { borderRadius: R.md, borderWidth: 1, padding: 12, marginBottom: S.md },
  noticeText: { fontFamily: F.bodyMedium, fontSize: 13.5, lineHeight: 19 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.07)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
