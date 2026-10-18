import { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ActivityIndicator,
	ScrollView,
	StyleSheet,
} from 'react-native';
import {
	collection,
	deleteDoc,
	doc,
	onSnapshot,
	query,
	where,
	arrayUnion,
	updateDoc,
	writeBatch,
} from 'firebase/firestore';
import {
	gameEconomy,
	availableTeamColors,
	MAX_TEAMS_PER_GAME,
	TEAM_COLORS,
} from '@gcr26/shared';
import { auth, db } from '../firebase';
import DeleteAccountModal from '../components/DeleteAccountModal';

interface PickerTeam {
	id: string;
	name: string;
	color?: string;
	memberIds?: string[];
}

export default function TeamPickerScreen({
	gameId,
	name,
}: {
	gameId: string;
	name: string;
}) {
	const [game, setGame] = useState<Record<string, any> | null>(null);
	const [teams, setTeams] = useState<PickerTeam[]>([]);
	const [loading, setLoading] = useState(true);
	const [newName, setNewName] = useState('');
	const [newColor, setNewColor] = useState<string | null>(null);
	const [openTeamId, setOpenTeamId] = useState<string | null>(null);
	const [players, setPlayers] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [deletingAccount, setDeletingAccount] = useState(false);

	useEffect(() => {
		return onSnapshot(doc(db, 'games', gameId), (snap) =>
			setGame(snap.exists() ? snap.data() : null),
		);
	}, [gameId]);

	useEffect(() => {
		return onSnapshot(
			query(collection(db, 'teams'), where('gameId', '==', gameId)),
			(snap) => {
				setTeams(
					snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PickerTeam),
				);
				setLoading(false);
			},
			() => setLoading(false),
		);
	}, [gameId]);

	// Who is in this game, so a team's members can be named before you join it
	useEffect(() => {
		return onSnapshot(
			collection(db, 'games', gameId, 'players'),
			(snap) => {
				const names: Record<string, string> = {};
				snap.docs.forEach((d) => {
					names[d.id] =
						(d.data() as { name?: string }).name ?? 'A nameless player';
				});
				setPlayers(names);
			},
			() => setPlayers({}),
		);
	}, [gameId]);

	const maxTeamSize = game?.maxTeamSize ?? null;
	const gameFull = teams.length >= MAX_TEAMS_PER_GAME;
	const colorChoices = availableTeamColors(teams.map((t) => t.color ?? ''));
	const chosenColor = newColor ?? colorChoices[0] ?? TEAM_COLORS[0];
	const openTeam = teams.find((t) => t.id === openTeamId) ?? null;

	async function joinTeam(team: PickerTeam) {
		const uid = auth.currentUser?.uid;
		if (!uid || busy) return;
		setBusy(true);
		setError(null);
		try {
			const batch = writeBatch(db);
			batch.update(doc(db, 'teams', team.id), { memberIds: arrayUnion(uid) });
			batch.update(doc(db, 'users', uid), { teamId: team.id });
			await batch.commit();
		} catch {
			setError("Couldn't join that team. Someone may have just filled it.");
		} finally {
			setBusy(false);
		}
	}

	async function createTeam() {
		const uid = auth.currentUser?.uid;
		const teamName = newName.trim();
		if (!uid || !teamName || busy) return;
		setBusy(true);
		setError(null);
		try {
			const economy = gameEconomy(game as any);
			const ref = doc(collection(db, 'teams'));
			const batch = writeBatch(db);
			batch.set(ref, {
				name: teamName,
				color: chosenColor,
				gameId,
				memberIds: [uid],
				score: 0,
				coins: economy.startingCoins,
				currentQuestId: null,
				completedQuestIds: [],
				finishedAt: null,
				questProgress: null,
			});
			batch.update(doc(db, 'users', uid), { teamId: ref.id });
			await batch.commit();
			setNewName('');
			setNewColor(null);
		} catch {
			setError("Couldn't create that team. Try again.");
		} finally {
			setBusy(false);
		}
	}

	async function leaveGame() {
		const uid = auth.currentUser?.uid;
		if (!uid || busy) return;
		setBusy(true);
		try {
			// Membership first: if the second write fails, the player is out of the
			// game's roster and the join screen will let them start over
			await deleteDoc(doc(db, 'games', gameId, 'players', uid));
			await updateDoc(doc(db, 'users', uid), { gameId: null, teamId: null });
		} catch {
			setError("Couldn't leave the game. Try again.");
		} finally {
			setBusy(false);
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text style={styles.label}>YOU'RE IN</Text>
			<Text style={styles.title}>{game?.name ?? 'The game'}</Text>
			<Text style={styles.message}>Pick a team, or start your own.</Text>

			{teams.map((team) => {
				const memberIds = team.memberIds ?? [];
				const full = maxTeamSize != null && memberIds.length >= maxTeamSize;
				const open = openTeamId === team.id;
				return (
					<View key={team.id}>
						<TouchableOpacity
							style={[
								styles.teamRow,
								full && styles.teamRowFull,
								open && styles.teamRowOpen,
							]}
							onPress={() => setOpenTeamId(open ? null : team.id)}
						>
							<View
								style={[styles.dot, { backgroundColor: team.color ?? '#111' }]}
							/>
							<Text style={styles.teamName}>{team.name}</Text>
							<Text style={styles.teamMeta}>
								{memberIds.length}
								{maxTeamSize ? ` / ${maxTeamSize}` : ''}
								{full ? ' · full' : ''}
							</Text>
						</TouchableOpacity>

						{open && (
							<View style={styles.teamDetail}>
								{memberIds.length === 0 ? (
									<Text style={styles.detailEmpty}>Nobody here yet.</Text>
								) : (
									memberIds.map((id) => (
										<Text key={id} style={styles.memberName}>
											{players[id] ?? 'A nameless player'}
										</Text>
									))
								)}
								{full ? (
									<Text style={styles.detailEmpty}>This team is full.</Text>
								) : (
									<TouchableOpacity
										style={[styles.joinButton, busy && styles.disabled]}
										onPress={() => joinTeam(team)}
										disabled={busy}
									>
										<Text style={styles.joinButtonText}>Join {team.name}</Text>
									</TouchableOpacity>
								)}
							</View>
						)}
					</View>
				);
			})}

			{teams.length === 0 && (
				<Text style={styles.empty}>
					No teams yet — be the first to start one.
				</Text>
			)}

			{gameFull ? (
				<Text style={styles.empty}>
					This game already has {MAX_TEAMS_PER_GAME} teams — join one of them.
				</Text>
			) : (
				<View style={styles.createBlock}>
					<Text style={styles.createLabel}>Start your own team</Text>
					<TextInput
						style={styles.input}
						value={newName}
						onChangeText={setNewName}
						placeholder="Team name"
						placeholderTextColor="#bbb"
						returnKeyType="done"
						onSubmitEditing={createTeam}
					/>

					<View style={styles.swatchRow}>
						{colorChoices.slice(0, 10).map((color) => (
							<TouchableOpacity
								key={color}
								onPress={() => setNewColor(color)}
								style={[
									styles.swatch,
									{ backgroundColor: color },
									chosenColor === color && styles.swatchChosen,
								]}
							/>
						))}
					</View>

					<TouchableOpacity
						style={[
							styles.createButton,
							(!newName.trim() || busy) && styles.disabled,
						]}
						onPress={createTeam}
						disabled={!newName.trim() || busy}
					>
						<Text style={styles.createButtonText}>Create team</Text>
					</TouchableOpacity>
				</View>
			)}

			{error && <Text style={styles.error}>{error}</Text>}

			<TouchableOpacity
				style={styles.leave}
				onPress={leaveGame}
				disabled={busy}
			>
				<Text style={styles.leaveText}>Leave this game</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={styles.leave}
				onPress={() => setDeletingAccount(true)}
			>
				<Text style={styles.leaveText}>Delete account</Text>
			</TouchableOpacity>

			<DeleteAccountModal
				visible={deletingAccount}
				onClose={() => setDeletingAccount(false)}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#fff',
	},
	container: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: 32,
		backgroundColor: '#fff',
	},
	label: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 3,
		color: '#aaa',
		textAlign: 'center',
	},
	title: {
		fontSize: 26,
		fontWeight: '700',
		color: '#111',
		textAlign: 'center',
		marginTop: 8,
	},
	message: {
		fontSize: 15,
		color: '#888',
		textAlign: 'center',
		marginTop: 8,
		marginBottom: 24,
	},
	teamRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderWidth: 1.5,
		borderColor: '#eee',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 14,
		marginBottom: 8,
	},
	teamRowFull: {
		opacity: 0.4,
	},
	dot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	teamName: {
		flex: 1,
		fontSize: 16,
		fontWeight: '600',
		color: '#111',
	},
	teamMeta: {
		fontSize: 13,
		color: '#aaa',
	},
	empty: {
		fontSize: 14,
		color: '#aaa',
		textAlign: 'center',
		marginBottom: 12,
	},
	teamRowOpen: {
		borderColor: '#111',
	},
	teamDetail: {
		borderLeftWidth: 2,
		borderLeftColor: '#eee',
		marginLeft: 8,
		paddingLeft: 14,
		paddingBottom: 14,
		marginTop: -4,
		marginBottom: 10,
	},
	memberName: {
		fontSize: 15,
		color: '#555',
		paddingVertical: 3,
	},
	detailEmpty: {
		fontSize: 14,
		color: '#aaa',
		paddingVertical: 3,
	},
	joinButton: {
		marginTop: 10,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: '#111',
		alignItems: 'center',
	},
	joinButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	createBlock: {
		marginTop: 20,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		paddingTop: 20,
	},
	createLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#111',
		marginBottom: 8,
	},
	swatchRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 12,
		marginBottom: 4,
	},
	swatch: {
		width: 30,
		height: 30,
		borderRadius: 15,
		borderWidth: 3,
		borderColor: 'transparent',
	},
	swatchChosen: {
		borderColor: '#111',
	},
	input: {
		borderWidth: 1.5,
		borderColor: '#ddd',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 15,
		color: '#111',
		backgroundColor: '#fafafa',
	},
	createButton: {
		marginTop: 12,
		paddingVertical: 14,
		alignItems: 'center',
		borderRadius: 12,
		backgroundColor: '#111',
	},
	createButtonText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '600',
	},
	disabled: {
		opacity: 0.35,
	},
	error: {
		fontSize: 13,
		color: '#ef4444',
		marginTop: 10,
		textAlign: 'center',
	},
	leave: {
		marginTop: 28,
		alignItems: 'center',
	},
	leaveText: {
		fontSize: 14,
		color: '#aaa',
	},
});
