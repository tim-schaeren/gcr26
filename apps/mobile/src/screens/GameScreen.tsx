import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useUser } from '../hooks/useUser';
import {
  doc, collection, onSnapshot, updateDoc, addDoc, arrayUnion,
  query, where, documentId,
} from 'firebase/firestore';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../firebase';
import { TASK_NAME as LOCATION_TASK } from '../tasks/locationTask';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  gameId: string;
  name: string;
  memberIds: string[];
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
}

interface Game {
  id: string;
  name: string;
  startDateTime: number;
  questOrder: string[];
  maxTeamSpreadMeters: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  endedAt: number | null;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  navigationHint: string;
  fenceRadius: number;
  location: { lat: number; lng: number };
  answers: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function WaitingView({ game, now }: { game: Game; now: number }) {
  const ms = game.startDateTime - now;
  return (
    <View style={styles.container}>
      <Text style={styles.label}>GET READY</Text>
      <Text style={styles.gameName}>{game.name}</Text>
      <Text style={styles.countdownLabel}>starts in</Text>
      <Text style={styles.countdown}>{formatCountdown(ms)}</Text>
    </View>
  );
}

function NavigationView({ quest, distance }: { quest: Quest; distance: number | null }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>FIND YOUR NEXT QUEST</Text>
      <Text style={styles.navigationHint}>{quest.navigationHint}</Text>
      {distance !== null && (
        <Text style={styles.distance}>{Math.round(distance)} m away</Text>
      )}
    </View>
  );
}

function QuestView({
  quest,
  questNumber,
  totalQuests,
  answer,
  setAnswer,
  wrong,
  submitting,
  onSubmit,
}: {
  quest: Quest;
  questNumber: number;
  totalQuests: number;
  answer: string;
  setAnswer: (v: string) => void;
  wrong: boolean;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.questNumber}>
        Quest {questNumber} of {totalQuests}
      </Text>
      <Text style={styles.questTitle}>{quest.title}</Text>
      <Text style={styles.questDescription}>{quest.description}</Text>

      <View style={styles.answerRow}>
        <TextInput
          style={[styles.answerInput, wrong && styles.answerInputWrong]}
          value={answer}
          onChangeText={setAnswer}
          placeholder="Your answer…"
          placeholderTextColor="#bbb"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>→</Text>
        </TouchableOpacity>
      </View>

      {wrong && <Text style={styles.wrongText}>That's not right — try again.</Text>}
    </KeyboardAvoidingView>
  );
}

function FinishedView({
  game,
  team,
  allTeams,
  onLeaderboard,
}: {
  game: Game;
  team: Team;
  allTeams: Team[];
  onLeaderboard: () => void;
}) {
  const rank = allTeams.filter(t => t.finishedAt && t.finishedAt <= (team.finishedAt ?? 0)).length;
  const duration = team.finishedAt
    ? team.finishedAt - game.startDateTime - (game.totalPausedMs ?? 0)
    : 0;
  return (
    <View style={styles.container}>
      <Text style={styles.finishedEmoji}>🏁</Text>
      <Text style={styles.finishedHeading}>You finished!</Text>
      <Text style={styles.finishedPlacement}>{ordinal(rank)} place</Text>
      <Text style={styles.finishedSub}>{formatDuration(duration)}</Text>
      <TouchableOpacity style={styles.leaderboardButton} onPress={onLeaderboard}>
        <Text style={styles.leaderboardButtonText}>See leaderboard →</Text>
      </TouchableOpacity>
    </View>
  );
}

function PausedView() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>GAME PAUSED</Text>
      <Text style={styles.message}>The admins have paused the game.{'\n'}Sit tight!</Text>
    </View>
  );
}

function EndedView({ game }: { game: Game }) {
  return (
    <View style={styles.container}>
      <Text style={styles.finishedEmoji}>🏁</Text>
      <Text style={styles.finishedHeading}>The admins have ended the game.</Text>
      <Text style={styles.finishedSub}>Thanks for playing!</Text>
    </View>
  );
}

function LeaderboardModal({
  visible,
  onClose,
  game,
  allTeams,
  currentTeamId,
}: {
  visible: boolean;
  onClose: () => void;
  game: Game;
  allTeams: Team[];
  currentTeamId: string;
}) {
  const sorted = [...allTeams].sort((a, b) => {
    if (a.finishedAt && b.finishedAt) return a.finishedAt - b.finishedAt;
    if (a.finishedAt) return -1;
    if (b.finishedAt) return 1;
    return (b.completedQuestIds?.length ?? 0) - (a.completedQuestIds?.length ?? 0);
  });
  const totalQuests = game.questOrder.length;
  const totalPausedMs = game.totalPausedMs ?? 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.lbHeader}>
          <Text style={styles.lbTitle}>Leaderboard</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.lbClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
          {sorted.map((t, i) => {
            const isCurrent = t.id === currentTeamId;
            const completed = t.completedQuestIds?.length ?? 0;
            const duration = t.finishedAt
              ? t.finishedAt - game.startDateTime - totalPausedMs
              : null;
            const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
            return (
              <View key={t.id} style={[styles.lbRow, isCurrent && styles.lbRowCurrent]}>
                <Text style={styles.lbRank}>{medalEmoji ?? `#${i + 1}`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lbTeamName, isCurrent && styles.lbTeamNameCurrent]}>
                    {t.name}{isCurrent ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.lbDetail}>
                    {duration !== null
                      ? `Finished · ${formatDuration(duration)}`
                      : `${completed} / ${totalQuests} quests`}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SpreadOverlay() {
  return (
    <View style={styles.spreadOverlay}>
      <Text style={styles.spreadTitle}>Team too spread out</Text>
      <Text style={styles.spreadMessage}>
        Get back together before you can submit an answer.
      </Text>
    </View>
  );
}

function LocationDeniedView() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Location access needed</Text>
      <Text style={styles.message}>
        This game uses your location to unlock quests. Please enable location
        access in your device settings.
      </Text>
    </View>
  );
}

// ─── Celebration overlay ──────────────────────────────────────────────────────

function CelebrationOverlay({ visible, anim }: { visible: boolean; anim: Animated.Value }) {
  if (!visible) return null;
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return (
    <Animated.View style={[styles.celebrationOverlay, { opacity: anim }]}>
      <Animated.Text style={[styles.celebrationEmoji, { transform: [{ scale }] }]}>🎉</Animated.Text>
      <Text style={styles.celebrationText}>Well done!</Text>
    </Animated.View>
  );
}

// ─── Profile button + sheet ───────────────────────────────────────────────────

function ProfileButton({ name, onPress }: { name: string; onPress: () => void }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <TouchableOpacity style={styles.profileButton} onPress={onPress}>
      <Text style={styles.profileButtonText}>{initial}</Text>
    </TouchableOpacity>
  );
}

function ProfileSheet({ visible, name, onClose }: { visible: boolean; name: string; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetName}>{name}</Text>
          <TouchableOpacity style={styles.sheetRow} onPress={() => signOut(auth)}>
            <Text style={styles.sheetRowDestructive}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameScreen({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [memberLocations, setMemberLocations] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const lastWrittenRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const lastTrailRef = useRef<{ lat: number; lng: number; t: number } | null>(null);

  const [celebrating, setCelebrating] = useState(false);
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const { profile } = useUser();
  const [profileOpen, setProfileOpen] = useState(false);

  // Tick for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Team
  useEffect(() => {
    return onSnapshot(doc(db, 'teams', teamId), snap => {
      setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null);
    });
  }, [teamId]);

  // Game
  useEffect(() => {
    if (!team?.gameId) return;
    return onSnapshot(doc(db, 'games', team.gameId), snap => {
      setGame(snap.exists() ? ({ id: snap.id, ...snap.data() } as Game) : null);
    });
  }, [team?.gameId]);

  // All teams for leaderboard + placement
  useEffect(() => {
    if (!game?.id) return;
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', game.id)),
      snap => setAllTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team))),
    );
  }, [game?.id]);

  // Current quest
  const currentQuestId = team?.currentQuestId ?? game?.questOrder?.[0] ?? null;
  useEffect(() => {
    if (!game?.id || !currentQuestId) {
      setQuest(null);
      return;
    }
    return onSnapshot(doc(db, 'games', game.id, 'quests', currentQuestId), snap => {
      setQuest(snap.exists() ? ({ id: snap.id, ...snap.data() } as Quest) : null);
    });
  }, [game?.id, currentQuestId]);

  // Location — watch position, write lastLocation + trail to Firestore (throttled)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }

      // Persist IDs for background task
      const uid = auth.currentUser?.uid ?? '';
      if (team && game) {
        await AsyncStorage.multiSet([
          ['uid', uid],
          ['teamId', team.id],
          ['gameId', game.id],
        ]);
      }

      // Request "always" background permission and start background task
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        const running = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
        if (!running) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50,
            timeInterval: 60000,
            showsBackgroundLocationIndicator: true,
          });
        }
      }

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        loc => {
          const { latitude: lat, longitude: lng } = loc.coords;
          setCoords({ lat, lng });

          const currentUid = auth.currentUser?.uid;
          if (!currentUid || !team || !game) return;

          const t = Date.now();
          const last = lastWrittenRef.current;
          const dist = last ? distanceMeters(last.lat, last.lng, lat, lng) : Infinity;
          const elapsed = last ? t - last.t : Infinity;

          // Write lastLocation every 10 m or 30 s
          if (dist > 10 || elapsed > 30000) {
            lastWrittenRef.current = { lat, lng, t };
            updateDoc(doc(db, 'users', currentUid), { lastLocation: { lat, lng, updatedAt: t } }).catch(() => {});

            // Write trail point every 50 m or 2 min
            const lastTrail = lastTrailRef.current;
            const trailDist = lastTrail ? distanceMeters(lastTrail.lat, lastTrail.lng, lat, lng) : Infinity;
            const trailElapsed = lastTrail ? t - lastTrail.t : Infinity;
            if (trailDist > 50 || trailElapsed > 120000) {
              lastTrailRef.current = { lat, lng, t };
              addDoc(collection(db, 'trail'), {
                userId: currentUid,
                teamId: team.id,
                gameId: game.id,
                lat,
                lng,
                t,
              }).catch(() => {});
            }
          }
        },
      );
    })();
    return () => {
      sub?.remove();
    };
  }, [team?.id, game?.id]);

  // Team member locations — for spread check
  useEffect(() => {
    if (!team?.memberIds?.length || team.memberIds.length < 2) {
      setMemberLocations({});
      return;
    }
    return onSnapshot(
      query(collection(db, 'users'), where(documentId(), 'in', team.memberIds)),
      snap => {
        const locs: Record<string, { lat: number; lng: number } | null> = {};
        snap.docs.forEach(d => {
          const loc = d.data().lastLocation;
          locs[d.id] = loc ?? null;
        });
        setMemberLocations(locs);
      },
    );
  }, [JSON.stringify(team?.memberIds)]);

  const spreadTooLarge = useMemo(() => {
    if (!game?.maxTeamSpreadMeters) return false;
    const positions = Object.values(memberLocations).filter(
      (p): p is { lat: number; lng: number } => p !== null,
    );
    if (positions.length < 2) return false;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (
          distanceMeters(positions[i].lat, positions[i].lng, positions[j].lat, positions[j].lng) >
          game.maxTeamSpreadMeters
        ) {
          return true;
        }
      }
    }
    return false;
  }, [memberLocations, game?.maxTeamSpreadMeters]);

  async function submitAnswer() {
    if (!quest || !team || !game || submitting || !answer.trim() || spreadTooLarge) return;
    const normalized = answer.trim().toLowerCase();
    const correct = quest.answers.some(a => a.trim().toLowerCase() === normalized);
    if (!correct) {
      setWrong(true);
      setTimeout(() => setWrong(false), 2000);
      return;
    }

    setSubmitting(true);
    setAnswer('');

    // Show celebration, then advance quest
    setCelebrating(true);
    Animated.spring(celebrateAnim, { toValue: 1, useNativeDriver: true }).start();
    setTimeout(async () => {
      setCelebrating(false);
      celebrateAnim.setValue(0);
      try {
        const nextQuestId = game.questOrder[game.questOrder.indexOf(quest.id) + 1] ?? null;
        const update: Record<string, unknown> = {
          completedQuestIds: arrayUnion(quest.id),
          currentQuestId: nextQuestId,
        };
        if (!nextQuestId) update.finishedAt = Date.now();
        await updateDoc(doc(db, 'teams', team.id), update);
      } finally {
        setSubmitting(false);
      }
    }, 2000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const userName = profile?.name ?? '';

  function renderContent() {
    if (locationDenied) return <LocationDeniedView />;
    if (!team || !game) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    if (game.endedAt) return <EndedView game={game} />;
    if (game.pausedAt) return <PausedView />;
    if (now < game.startDateTime) return <WaitingView game={game} now={now} />;
    if (team.finishedAt) return (
      <FinishedView
        game={game}
        team={team}
        allTeams={allTeams}
        onLeaderboard={() => setLeaderboardOpen(true)}
      />
    );
    if (!quest) {
      return (
        <View style={styles.container}>
          <Text style={styles.message}>No quests available yet.</Text>
        </View>
      );
    }

    const distance =
      coords != null
        ? distanceMeters(coords.lat, coords.lng, quest.location.lat, quest.location.lng)
        : null;
    const insideFence = distance !== null && distance <= (quest.fenceRadius ?? 50);
    const questNumber = game.questOrder.indexOf(quest.id) + 1;

    if (!insideFence) return <NavigationView quest={quest} distance={distance} />;

    return (
      <View style={{ flex: 1 }}>
        <QuestView
          quest={quest}
          questNumber={questNumber}
          totalQuests={game.questOrder.length}
          answer={answer}
          setAnswer={setAnswer}
          wrong={wrong}
          submitting={submitting}
          onSubmit={submitAnswer}
        />
        {spreadTooLarge && <SpreadOverlay />}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {renderContent()}
      <CelebrationOverlay visible={celebrating} anim={celebrateAnim} />
      <TouchableOpacity style={styles.lbIconButton} onPress={() => setLeaderboardOpen(true)}>
        <Text style={styles.lbIconText}>≡</Text>
      </TouchableOpacity>
      <ProfileButton name={userName} onPress={() => setProfileOpen(true)} />
      <ProfileSheet visible={profileOpen} name={userName} onClose={() => setProfileOpen(false)} />
      {game && (
        <LeaderboardModal
          visible={leaderboardOpen}
          onClose={() => setLeaderboardOpen(false)}
          game={game}
          allTeams={allTeams}
          currentTeamId={teamId}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },

  // Waiting
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#aaa',
    marginBottom: 16,
  },
  gameName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
  },
  countdownLabel: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 32,
    marginBottom: 8,
  },
  countdown: {
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#111',
    letterSpacing: 2,
  },

  // Navigation
  navigationHint: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 24,
  },
  distance: {
    fontSize: 14,
    color: '#aaa',
  },

  // Quest
  questNumber: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: '#aaa',
    marginBottom: 16,
  },
  questTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  questDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  answerRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  answerInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  answerInputWrong: {
    borderColor: '#f87171',
    backgroundColor: '#fff5f5',
  },
  submitButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  wrongText: {
    marginTop: 12,
    fontSize: 13,
    color: '#ef4444',
  },

  // Finished
  finishedEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  finishedHeading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  finishedPlacement: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  finishedSub: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 32,
  },
  leaderboardButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#111',
  },
  leaderboardButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },

  // Spread overlay
  spreadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  spreadTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  spreadMessage: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Celebration overlay
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  celebrationText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
  },

  // Leaderboard icon button (left of profile)
  lbIconButton: {
    position: 'absolute',
    top: 52,
    right: 60,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lbIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  // Leaderboard modal
  lbHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lbTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  lbClose: {
    fontSize: 18,
    color: '#aaa',
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  lbRowCurrent: {
    backgroundColor: '#f8f8ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  lbRank: {
    fontSize: 18,
    width: 36,
    textAlign: 'center',
  },
  lbTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  lbTeamNameCurrent: {
    color: '#4f46e5',
  },
  lbDetail: {
    fontSize: 12,
    color: '#888',
  },

  // Profile button
  profileButton: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Profile sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginBottom: 24,
  },
  sheetRow: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sheetRowDestructive: {
    fontSize: 16,
    color: '#ef4444',
  },

  // Generic
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});
