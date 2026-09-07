/**
 * Push notifications (Expo). Technicians have a 5-minute window to accept a
 * job, so an offer that only appears while the app is open is not much use -
 * this registers the device and hands the token to the API.
 *
 * Android standalone builds need FCM credentials in the Expo project before a
 * token can be issued; without them registration fails quietly and the app
 * falls back to the existing 6-second poll.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ask once, register with the API. Safe to call on every sign-in. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // simulators cannot receive push

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Job offers',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0072ce',
        sound: 'default',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;

    await api('/users/me/push-token', { method: 'POST', body: JSON.stringify({ token }) });
    return token;
  } catch {
    // no FCM credentials yet, permission denied, or offline - polling still works
    return null;
  }
}
