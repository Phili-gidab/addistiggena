import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../../lib/theme';

const icon =
  (glyph: keyof typeof MaterialCommunityIcons.glyphMap) =>
  ({ color }: { color: ColorValue }) => (
    <MaterialCommunityIcons name={glyph} size={23} color={color as string} />
  );

export default function TechTabs() {
  // Android runs edge-to-edge: without the bottom inset the system navigation
  // bar covers the tab bar entirely (seen on Samsung M10-class devices).
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: C.line,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon('hammer-wrench') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Earnings', tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('account-circle-outline') }} />
    </Tabs>
  );
}
