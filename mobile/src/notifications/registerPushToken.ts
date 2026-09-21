import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiClient } from '@/api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission and registers this device's Expo push token
 * with the backend. Safe to call repeatedly (e.g. on every login) — it's a no-op
 * on simulators/emulators and silently does nothing if permission is denied.
 */
export async function registerPushToken() {
  if (!Device.isDevice) return; // push tokens aren't available on simulators

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  // Requires an EAS projectId to mint a token outside of Expo Go — see docs/DEPLOYMENT.md.
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await apiClient.post('/users/me/push-token', { token });
}
