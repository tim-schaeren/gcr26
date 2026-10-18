import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

// Shown before the system prompts, so the permission dialogs arrive with a
// reason attached rather than ambushing a player on first launch.
export default function PermissionsIntro({
	visible,
	onContinue,
}: {
	visible: boolean;
	onContinue: () => void;
}) {
	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onContinue}>
			<View style={styles.wrap}>
				<Text style={styles.title}>Before you start</Text>

				<View style={styles.item}>
					<Text style={styles.itemTitle}>📍 Location</Text>
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
					<Text style={styles.itemTitle}>🔔 Notifications</Text>
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

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		backgroundColor: '#fff',
		padding: 32,
		justifyContent: 'center',
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#111',
		marginBottom: 28,
	},
	item: {
		marginBottom: 24,
	},
	itemTitle: {
		fontSize: 17,
		fontWeight: '700',
		color: '#111',
		marginBottom: 6,
	},
	itemText: {
		fontSize: 15,
		color: '#555',
		lineHeight: 22,
		marginBottom: 6,
	},
	footnote: {
		fontSize: 13,
		color: '#9ca3af',
		lineHeight: 19,
		marginBottom: 24,
	},
	button: {
		paddingVertical: 16,
		borderRadius: 12,
		backgroundColor: '#111',
		alignItems: 'center',
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
