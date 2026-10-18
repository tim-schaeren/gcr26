import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
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
	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onContinue}>
			<View style={styles.wrap}>
				<Text style={styles.title}>Before you start</Text>

				<View style={styles.item}>
					<View style={styles.itemTitleRow}>
						<Icon name="map-marker-outline" size={20} color={colors.onSurface} />
						<Text style={styles.itemTitle}>Location</Text>
					</View>
					<Text style={styles.itemText}>
						Quests unlock when your team reaches a place, or has walked far
						enough. Your position is shown to the people hosting your race so
						they can help if you get stuck or lost.
					</Text>
					<Text style={styles.itemText}>
						Choosing “Always” keeps that working while your phone is in your
						pocket. Without it, your team's progress stops whenever the screen
						goes dark.
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
			</View>
		</Modal>
	);
}

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		wrap: {
			flex: 1,
			backgroundColor: c.background,
			padding: 32,
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
