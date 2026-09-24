import {
	View,
	Text,
	Modal,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import { SHOP_ITEMS_BY_TYPE, type ShopConfig } from '@gcr26/shared';

function formatLeft(ms: number): string {
	const total = Math.ceil(ms / 1000);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ShopSheet({
	visible,
	onClose,
	shop,
	coins,
	compassMsLeft,
	compassUseful,
	onBuyCompass,
	buying,
}: {
	visible: boolean;
	onClose: () => void;
	shop: ShopConfig;
	coins: number;
	compassMsLeft: number;
	compassUseful: boolean;
	onBuyCompass: () => void;
	buying: boolean;
}) {
	const { compass } = shop;
	const affordable = coins >= compass.price;
	const running = compassMsLeft > 0;

	let note: string | null = null;
	if (running) note = `Running — ${formatLeft(compassMsLeft)} left`;
	else if (!compassUseful) note = 'Nothing to point at on this quest';
	else if (!affordable) note = `You need ${compass.price - coins} more coins`;

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.wrap}>
				<View style={styles.header}>
					<Text style={styles.title}>Shop</Text>
					<TouchableOpacity
						onPress={onClose}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<Text style={styles.close}>✕</Text>
					</TouchableOpacity>
				</View>

				<ScrollView contentContainerStyle={styles.body}>
					<Text style={styles.balance}>🪙 {coins}</Text>

					{!compass.enabled ? (
						<Text style={styles.empty}>The shop is closed for this game.</Text>
					) : (
						<View style={styles.card}>
							<Text style={styles.itemName}>
								{SHOP_ITEMS_BY_TYPE.compass.icon} {SHOP_ITEMS_BY_TYPE.compass.name}
							</Text>
							<Text style={styles.itemText}>
								{SHOP_ITEMS_BY_TYPE.compass.description} Lasts{' '}
								{compass.durationMinutes} minutes.
							</Text>
							<View style={styles.itemFooter}>
								<Text style={styles.price}>{compass.price} 🪙</Text>
								<TouchableOpacity
									style={[
										styles.buyButton,
										(!affordable || running || buying || !compassUseful) &&
											styles.buyButtonDisabled,
									]}
									onPress={onBuyCompass}
									disabled={!affordable || running || buying || !compassUseful}
								>
									<Text style={styles.buyButtonText}>
										{running ? 'Active' : buying ? 'Buying…' : 'Buy'}
									</Text>
								</TouchableOpacity>
							</View>
							{note && <Text style={styles.note}>{note}</Text>}
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	wrap: {
		flex: 1,
		backgroundColor: '#fff',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingTop: 60,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111',
	},
	close: {
		fontSize: 18,
		color: '#aaa',
	},
	body: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 32,
	},
	balance: {
		fontSize: 28,
		fontWeight: '700',
		color: '#111',
		textAlign: 'center',
		marginBottom: 20,
	},
	empty: {
		fontSize: 15,
		color: '#888',
		textAlign: 'center',
		marginTop: 24,
	},
	card: {
		borderWidth: 1,
		borderColor: '#eee',
		borderRadius: 14,
		padding: 16,
	},
	itemName: {
		fontSize: 17,
		fontWeight: '700',
		color: '#111',
		marginBottom: 6,
	},
	itemText: {
		fontSize: 14,
		color: '#666',
		lineHeight: 20,
	},
	itemFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 14,
	},
	price: {
		fontSize: 16,
		fontWeight: '700',
		color: '#111',
	},
	buyButton: {
		paddingHorizontal: 22,
		paddingVertical: 10,
		borderRadius: 12,
		backgroundColor: '#111',
	},
	buyButtonDisabled: {
		opacity: 0.35,
	},
	buyButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	note: {
		fontSize: 12,
		color: '#9ca3af',
		marginTop: 8,
	},
});
