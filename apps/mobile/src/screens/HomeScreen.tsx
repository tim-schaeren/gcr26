import {
	View,
	Text,
	TouchableOpacity,
	ActivityIndicator,
	StyleSheet,
	Platform,
	Linking,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '../hooks/useUser';
import GameScreen from './GameScreen';
import JoinGameScreen from './JoinGameScreen';
import TeamPickerScreen from './TeamPickerScreen';

const ADMIN_URL = 'https://gcr26-dev.netlify.app';

export default function HomeScreen() {
	const { profile, loading } = useUser();

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	// Three states on the way into a race: no game, joined but teamless, playing
	if (profile?.teamId) {
		return <GameScreen teamId={profile.teamId} />;
	}

	if (profile?.gameId) {
		return (
			<TeamPickerScreen
				gameId={profile.gameId}
				name={profile?.name ?? 'A nameless player'}
			/>
		);
	}

	if (profile?.isAdmin) {
		return (
			<View style={styles.container}>
				<Text style={styles.title}>GCR</Text>
				<Text style={styles.heading}>Hey, Admin!</Text>
				<Text style={styles.message}>Looking for the admin panel?</Text>
				<TouchableOpacity
					style={styles.adminButton}
					onPress={() => Linking.openURL(ADMIN_URL)}
				>
					<Text style={styles.adminButtonText}>Open Admin Panel →</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.signOutButton}
					onPress={() => signOut(auth)}
				>
					<Text style={styles.signOutText}>Sign Out</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return <JoinGameScreen name={profile?.name ?? 'A nameless player'} />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 36,
		fontWeight: '700',
		letterSpacing: 4,
		marginBottom: 24,
	},
	heading: {
		fontSize: 22,
		fontWeight: '600',
		color: '#111',
		marginBottom: 12,
		textAlign: 'center',
	},
	message: {
		fontSize: 16,
		color: '#888',
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 64,
	},
	adminButton: {
		backgroundColor: '#111',
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
		marginBottom: 48,
	},
	adminButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	signOutButton: {
		padding: 12,
	},
	signOutText: {
		color: '#aaa',
		fontSize: 14,
	},
});
