import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { C, F } from '../../lib/theme';

const icon =
  (glyph: string) =>
  ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>
  );

export default function CustomerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: F.bodySemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.line, height: 60, paddingBottom: 6, paddingTop: 6 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('🏠') }} />
      <Tabs.Screen name="book" options={{ title: 'Book', tabBarIcon: icon('🛠️') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('👤') }} />
    </Tabs>
  );
}
