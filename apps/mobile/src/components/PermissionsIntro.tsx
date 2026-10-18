import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	ScrollView,
	StyleSheet,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '@gcr26/shared';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';

// Shown before the system prompts, so the permission dialogs arrive with a
// reason attached rather than ambushing a player on first launch.
export default function PermissionsIntro({
	visible,
	onContinue,
}: {
	visible: boolean;
	onContinue: () => void;
}) {
	const theme = useTheme();
	const styles = makeStyles(theme);
	const { colors } = theme;
	const insets = useSafeAreaInsets();
	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onContinue}>
			{/* Scrolls on small screens, and stays clear of the camera cutout
			    and the navigation bar, which Android draws over the app */}
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={[
					styles.wrap,
					{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
				]}
			>
				<Text style={styles.title}>Before you start</Text>

				<View style={styles.item}>
					<View style={styles.itemTitleRow}>
						<Icon name="map-marker-outline" size={20} color={colors.onSurface} />
						<Text style={styles.itemTitle}>Location</Text>
					</View>
					{/* The app stores require this disclosure before the prompt, and
					    Google Play requires its wording: what is collected, for which
					    features, and that it happens when the app is closed or not in use */}
					<Text style={styles.itemText}>
						Grand City Race collects location data to unlock quests, measure how
						far your team has walked, and show the hosts of your race where your
						team is, even when the app is closed or not in use.
					</Text>
					<Text style={styles.itemText}>
						This only happens while you are in a game, and your location is shared
						with the hosts of that game and nobody else. Choosing{' '}
						{Platform.OS === 'ios' ? '“Always”' : '“Allow all the time”'} keeps the
						race going while your phone is in your pocket.
					</Text>
				</View>

				<View style={styles.item}>
					<View style={styles.itemTitleRow}>
						<Icon name="bell-outline" size={20} color={colors.onSurface} />
						<Text style={styles.itemTitle}>Notifications</Text>
					</View>
					<Text style={styles.itemText}>
						Used for announcements from your hosts and replies to your messages.
						Nothing else.
					</Text>
				</View>

				<Text style={styles.footnote}>
					Your location is only collected during a game, and is deleted with your
					account.
				</Text>

				<TouchableOpacity style={styles.button} onPress={onContinue}>
					<Text style={styles.buttonText}>Got it</Text>
				</TouchableOpacity>
				<Text style={styles.footnote}>
					You'll be asked for each permission next, and you can say no to either.
				</Text>
			</ScrollView>
		</Modal>
	);
}

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		scroll: {
			flex: 1,
			backgroundColor: c.background,
		},
		wrap: {
			flexGrow: 1,
			paddingHorizontal: 28,
			justifyContent: 'center',
		},
		title: {
			...ui.heading(t, 30),
			marginBottom: 28,
		},
		item: {
			...ui.panel(t),
			padding: 16,
			marginBottom: 16,
		},
		itemTitleRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 6,
		},
		itemTitle: {
			fontFamily: t.fonts.display,
			fontSize: 17,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onSurface,
		},
		itemText: {
			fontSize: 15,
			color: c.onSurface,
			lineHeight: 22,
			marginBottom: 6,
		},
		footnote: {
			fontSize: 13,
			color: c.muted,
			lineHeight: 19,
			marginTop: 8,
			marginBottom: 16,
		},
		button: {
			...ui.button(t),
			paddingVertical: 16,
		},
		buttonText: ui.buttonText(t),
	});
}
