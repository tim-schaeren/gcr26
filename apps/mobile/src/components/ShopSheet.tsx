import {
	View,
	Text,
	Modal,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
	SHOP_ITEMS_BY_TYPE,
	type ShopConfig,
	type Theme,
} from '@gcr26/shared';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';
import * as ui from '../theme/primitives';

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
	const insets = useSafeAreaInsets();
	const theme = useTheme();
	const styles = stylesFor(theme);
	const { colors } = theme;
	const { compass } = shop;
	const affordable = coins >= compass.price;
	const running = compassMsLeft > 0;

	let note: string | null = null;
	if (running) note = `Running · ${formatLeft(compassMsLeft)} left`;
	else if (!compassUseful) note = 'Nothing to point at on this quest';
	else if (!affordable) note = `You need ${compass.price - coins} more coins`;

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.wrap}>
				<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
					<Text style={styles.title}>Shop</Text>
					<TouchableOpacity
						onPress={onClose}
						hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					>
						<Icon name="close" size={26} color={colors.text} />
					</TouchableOpacity>
				</View>

				<ScrollView contentContainerStyle={styles.body}>
					<View style={styles.balanceRow}>
						<Icon name="circle-multiple-outline" size={28} color={colors.text} />
						<Text style={styles.balance}>{coins}</Text>
					</View>

					{!compass.enabled ? (
						<Text style={styles.empty}>The shop is closed for this game.</Text>
					) : (
						<View style={styles.card}>
							<View style={styles.itemNameRow}>
								<Icon
									name={SHOP_ITEMS_BY_TYPE.compass.icon}
									size={20}
									color={colors.onSurface}
								/>
								<Text style={styles.itemName}>
									{SHOP_ITEMS_BY_TYPE.compass.name}
								</Text>
							</View>
							<Text style={styles.itemText}>
								{SHOP_ITEMS_BY_TYPE.compass.description} Lasts{' '}
								{compass.durationMinutes} minutes.
							</Text>
							<View style={styles.itemFooter}>
								<Text style={styles.price}>{compass.price} coins</Text>
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

function makeStyles(t: Theme) {
	const c = t.colors;
	return StyleSheet.create({
		wrap: {
			flex: 1,
			backgroundColor: c.background,
		},
		header: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingTop: 60,
			paddingBottom: 16,
			borderBottomWidth: t.shape.shadowOffset ? t.shape.borderWidth : 1,
			borderBottomColor: c.border,
		},
		title: ui.heading(t, 22),
		body: {
			paddingHorizontal: 16,
			paddingTop: 20,
			paddingBottom: 32,
		},
		balanceRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			marginBottom: 20,
		},
		balance: {
			fontFamily: t.fonts.display,
			fontSize: 30,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.text,
		},
		empty: {
			fontSize: 15,
			color: c.muted,
			textAlign: 'center',
			marginTop: 24,
		},
		card: {
			...ui.panel(t),
			borderColor: t.shape.shadowOffset ? c.border : '#eeeeee',
			borderWidth: t.shape.shadowOffset ? t.shape.borderWidth : 1,
			backgroundColor: t.shape.shadowOffset ? c.surface : c.background,
			padding: 16,
		},
		itemNameRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 6,
		},
		itemName: {
			fontFamily: t.fonts.display,
			fontSize: 18,
			fontWeight: t.fonts.display ? 'normal' : '700',
			color: c.onSurface,
		},
		itemText: {
			fontSize: 14,
			color: c.mutedOnSurface,
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
			color: c.onSurface,
		},
		buyButton: {
			...ui.button(t),
			paddingHorizontal: 22,
			paddingVertical: 10,
		},
		buyButtonDisabled: {
			opacity: 0.35,
		},
		buyButtonText: {
			...ui.buttonText(t),
			fontSize: 15,
		},
		note: {
			fontSize: 12,
			color: c.mutedOnSurface,
			marginTop: 8,
		},
	});
}

const styleCache = new Map<string, ReturnType<typeof makeStyles>>();

function stylesFor(t: Theme) {
	let styles = styleCache.get(t.id);
	if (!styles) {
		styles = makeStyles(t);
		styleCache.set(t.id, styles);
	}
	return styles;
}
