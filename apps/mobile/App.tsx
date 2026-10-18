import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/tasks/locationTask';
import RootNavigator from './src/navigation';

export default function App() {
	// Loaded up front so no screen ever draws in the wrong typeface or with
	// missing icons
	const [fontsLoaded, fontError] = useFonts({
		Righteous: require('./assets/fonts/Righteous-Regular.ttf'),
		...MaterialCommunityIcons.font,
	});

	// A font that fails to load shouldn't keep the app from opening
	if (!fontsLoaded && !fontError) return null;

	return (
		<SafeAreaProvider>
			<RootNavigator />
		</SafeAreaProvider>
	);
}
