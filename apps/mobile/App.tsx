import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/tasks/locationTask';
import RootNavigator from './src/navigation';

export default function App() {
	return (
		<SafeAreaProvider>
			<RootNavigator />
		</SafeAreaProvider>
	);
}
