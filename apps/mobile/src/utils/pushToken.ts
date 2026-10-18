import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go on Android dropped push in SDK 53, and expo-notifications throws as
// soon as it loads there, which stopped the whole app at the splash screen.
// So the module is only loaded here, when permission is actually asked for,
// and never in Expo Go on Android. Real builds behave as before.
const pushUnavailable =
	Platform.OS === 'android' &&
	Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Asks for permission and returns this device's Expo push token, or null if
// push is unavailable or declined
export async function requestPushToken(): Promise<string | null> {
	if (pushUnavailable) return null;
	const Notifications = await import('expo-notifications');
	const { status } = await Notifications.requestPermissionsAsync();
	if (status !== 'granted') return null;
	return (await Notifications.getExpoPushTokenAsync()).data;
}
