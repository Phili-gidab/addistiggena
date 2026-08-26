import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import {
  NotoSansEthiopic_400Regular,
  NotoSansEthiopic_700Bold,
} from '@expo-google-fonts/noto-sans-ethiopic';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { C } from '../lib/theme';
import { AuthProvider, useAuth } from '../store/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready } = useAuth();
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
