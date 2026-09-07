import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
} from '@expo-google-fonts/noto-sans-ethiopic';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { registerForPush } from '../lib/push';
import { C } from '../lib/theme';
import { AuthProvider, useAuth } from '../store/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready, user } = useAuth();
  const pushed = useRef(false);
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    NotoSansEthiopic_400Regular,
    NotoSansEthiopic_700Bold,
  });

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [ready, fontsLoaded]);

  // register the device once per signed-in session
  useEffect(() => {
    if (!user || pushed.current) return;
    pushed.current = true;
    registerForPush();
  }, [user]);

  // tapping a job notification opens that booking
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const id = (res.notification.request.content.data as { bookingId?: string } | undefined)?.bookingId;
      if (id) router.push(`/booking/${id}`);
    });
    return () => sub.remove();
  }, []);

  if (!ready || !fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
