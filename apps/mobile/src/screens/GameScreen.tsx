import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
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
import { normalizeQuest, type Quest, type QuestProgress } from '@gcr26/shared';
import { db, auth } from '../firebase';
import { TASK_NAME as LOCATION_TASK } from '../tasks/locationTask';
import { startTracking, stopTracking, recordPosition } from '../tasks/distanceTracker';
import { distanceMeters } from '../utils/geo';
import ContentBlocks from '../components/ContentBlocks';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  gameId: string;
  name: string;
  memberIds: string[];
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
  questProgress?: QuestProgress | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Distance progress is pushed to the team doc at most once per this many meters
const DISTANCE_SYNC_STEP_METERS = 20;

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

function ScrollContainer({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function NavigationView({ quest, distance }: { quest: Quest; distance: number | null }) {
  return (
    <ScrollContainer>
      <Text style={styles.label}>FIND YOUR NEXT QUEST</Text>
      <ContentBlocks blocks={quest.navigationHint} textStyle={styles.navigationHint} />
      {distance !== null && (
        <Text style={styles.distance}>{Math.round(distance)} m away</Text>
      )}
    </ScrollContainer>
  );
}

function DistanceView({ quest, meters }: { quest: Quest; meters: number }) {
  const target = quest.distanceMeters ?? 0;
  const fraction = target > 0 ? Math.min(meters / target, 1) : 1;
  return (
    <ScrollContainer>
      <Text style={styles.label}>KEEP MOVING</Text>
      {quest.navigationHint.length > 0 && (
        <ContentBlocks blocks={quest.navigationHint} textStyle={styles.navigationHint} />
      )}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${fraction * 100}%` }]} />
      </View>
      <Text style={styles.distance}>
        {Math.round(Math.min(meters, target))} / {Math.round(target)} m
      </Text>
    </ScrollContainer>
  );
}

function QuestHeader({ quest, questNumber, totalQuests }: { quest: Quest; questNumber: number; totalQuests: number }) {
  return (
    <>
      <Text style={styles.questNumber}>
        Quest {questNumber} of {totalQuests}
      </Text>
      <Text style={styles.questTitle}>{quest.title}</Text>
      <ContentBlocks blocks={quest.description} textStyle={styles.questDescription} />
    </>
  );
}

function ContinueButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.continueButton, disabled && styles.submitButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.continueButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

function TimerView({
  quest,
  questNumber,
  totalQuests,
  remainingMs,
  submitting,
  onContinue,
}: {
  quest: Quest;
  questNumber: number;
  totalQuests: number;
  remainingMs: number;
  submitting: boolean;
  onContinue: () => void;
}) {
  const done = remainingMs <= 0;
  return (
    <ScrollContainer>
      <QuestHeader quest={quest} questNumber={questNumber} totalQuests={totalQuests} />
      <Text style={styles.countdownLabel}>{done ? 'time is up' : 'continue in'}</Text>
      <Text style={[styles.countdown, styles.timerCountdown]}>{formatCountdown(remainingMs)}</Text>
      <ContinueButton disabled={!done || submitting} label="Continue →" onPress={onContinue} />
    </ScrollContainer>
  );
}

function InfoView({
  quest,
  questNumber,
  totalQuests,
  submitting,
  onContinue,
}: {
  quest: Quest;
  questNumber: number;
  totalQuests: number;
  submitting: boolean;
  onContinue: () => void;
}) {
  return (
    <ScrollContainer>
      <QuestHeader quest={quest} questNumber={questNumber} totalQuests={totalQuests} />
      <ContinueButton disabled={submitting} label="Continue →" onPress={onContinue} />
    </ScrollContainer>
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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollContainer>
        <QuestHeader quest={quest} questNumber={questNumber} totalQuests={totalQuests} />

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
      </ScrollContainer>
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
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const [localMeters, setLocalMeters] = useState(0);
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
      setQuest(snap.exists() ? normalizeQuest(snap.id, snap.data()) : null);
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
          const { latitude: lat, longitude: lng, accuracy } = loc.coords;
          setCoords({ lat, lng, accuracy });

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

  // ── Quest trigger / progress ──────────────────────────────────────────────

  const progress = quest && team?.questProgress?.questId === quest.id ? team.questProgress : null;
  const gameRunning =
    !!game && !!team && !game.endedAt && !game.pausedAt && !team.finishedAt && now >= game.startDateTime;

  const distanceToQuest =
    coords != null && quest?.location
      ? distanceMeters(coords.lat, coords.lng, quest.location.lat, quest.location.lng)
      : null;
  const insideFence = distanceToQuest !== null && distanceToQuest <= (quest?.fenceRadius ?? 50);
  const teamMeters = progress?.distanceMeters ?? 0;
  const walkedMeters = Math.max(localMeters, teamMeters);

  let unlocked = false;
  if (quest?.trigger === 'none') unlocked = true;
  // Answer quests need the team at the location; timers and info stay open once reached
  if (quest?.trigger === 'location') unlocked = insideFence || (quest.task !== 'answer' && !!progress?.unlockedAt);
  if (quest?.trigger === 'distance') unlocked = !!progress?.unlockedAt || walkedMeters >= (quest.distanceMeters ?? 0);

  const trackingDistance = gameRunning && quest?.trigger === 'distance' && !progress?.unlockedAt;

  // Plain writes from the local snapshot (not transactions) so progress still queues while offline.
  // Concurrent writes from teammates only differ by seconds/meters, so last-write-wins is fine.
  function updateQuestProgress(questId: string, patch: { distanceMeters?: number; unlock?: boolean }) {
    if (!team || !game) return Promise.resolve();
    const existing = team.questProgress?.questId === questId ? team.questProgress : null;
    const next: QuestProgress = {
      questId,
      unlockedAt: existing?.unlockedAt ?? null,
      pausedMsAtUnlock: existing?.pausedMsAtUnlock ?? 0,
      distanceMeters: Math.max(existing?.distanceMeters ?? 0, Math.round(patch.distanceMeters ?? 0)),
    };
    if (patch.unlock && !next.unlockedAt) {
      next.unlockedAt = Date.now();
      next.pausedMsAtUnlock = game.totalPausedMs ?? 0;
    }
    return updateDoc(doc(db, 'teams', team.id), { questProgress: next });
  }

  // Record when timer/info quests unlock so the countdown is shared and survives leaving the fence
  const unlockPendingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!quest || !gameRunning || !unlocked || progress?.unlockedAt) return;
    if (quest.task === 'answer' || quest.trigger === 'distance') return;
    if (unlockPendingRef.current === quest.id) return;
    unlockPendingRef.current = quest.id;
    updateQuestProgress(quest.id, { unlock: true }).catch(() => { unlockPendingRef.current = null; });
  }, [quest?.id, gameRunning, unlocked, progress?.unlockedAt]);

  // Start/stop the persistent distance tracker (also fed by the background location task)
  useEffect(() => {
    if (!quest) return;
    if (trackingDistance) {
      startTracking(quest.id, teamMeters).then(s => setLocalMeters(s.meters)).catch(() => {});
    } else {
      stopTracking().catch(() => {});
      setLocalMeters(0);
    }
  }, [quest?.id, trackingDistance]);

  useEffect(() => {
    if (!coords || !trackingDistance || !quest) return;
    const questId = quest.id;
    recordPosition(coords.lat, coords.lng, coords.accuracy)
      .then(s => { if (s?.questId === questId) setLocalMeters(s.meters); })
      .catch(() => {});
  }, [coords, trackingDistance, quest?.id]);

  // Share distance progress with the team, and unlock once the target is reached.
  // The local snapshot reflects the write immediately, which stops this from re-firing.
  useEffect(() => {
    if (!trackingDistance || !quest) return;
    const reached = localMeters >= (quest.distanceMeters ?? 0);
    if (!reached && localMeters - teamMeters < DISTANCE_SYNC_STEP_METERS) return;
    updateQuestProgress(quest.id, { distanceMeters: localMeters, unlock: reached }).catch(() => {});
  }, [localMeters, teamMeters, trackingDistance, quest?.id]);

  function completeQuest(completed: Quest) {
    if (!team || !game) return Promise.resolve();
    const nextQuestId = game.questOrder[game.questOrder.indexOf(completed.id) + 1] ?? null;
    const update: Record<string, unknown> = {
      completedQuestIds: arrayUnion(completed.id),
      currentQuestId: nextQuestId,
      questProgress: null,
    };
    if (!nextQuestId) update.finishedAt = Date.now();
    return updateDoc(doc(db, 'teams', team.id), update);
  }

  function continueQuest() {
    if (!quest || submitting) return;
    setSubmitting(true);
    completeQuest(quest).catch(() => {});
    // Brief lockout so a double tap can't also complete the next quest. Not tied to the
    // write acknowledgement, which never arrives while offline.
    setTimeout(() => setSubmitting(false), 1000);
  }

  async function submitAnswer() {
    if (!quest || !team || !game || submitting || !answer.trim() || spreadTooLarge) return;
    const normalized = answer.trim().toLowerCase();
    const correct = (quest.answers ?? []).some(a => a.trim().toLowerCase() === normalized);
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
        await completeQuest(quest);
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

    const questNumber = game.questOrder.indexOf(quest.id) + 1;
    const totalQuests = game.questOrder.length;

    if (!unlocked) {
      if (quest.trigger === 'distance') return <DistanceView quest={quest} meters={walkedMeters} />;
      return <NavigationView quest={quest} distance={distanceToQuest} />;
    }

    if (quest.task === 'timer') {
      // Until the unlock write lands, show the full duration
      const elapsed = progress?.unlockedAt
        ? now - progress.unlockedAt - ((game.totalPausedMs ?? 0) - progress.pausedMsAtUnlock)
        : 0;
      return (
        <TimerView
          quest={quest}
          questNumber={questNumber}
          totalQuests={totalQuests}
          remainingMs={(quest.durationSeconds ?? 0) * 1000 - elapsed}
          submitting={submitting || !progress?.unlockedAt}
          onContinue={continueQuest}
        />
      );
    }

    if (quest.task === 'continue') {
      return (
        <InfoView
          quest={quest}
          questNumber={questNumber}
          totalQuests={totalQuests}
          submitting={submitting}
          onContinue={continueQuest}
        />
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <QuestView
          quest={quest}
          questNumber={questNumber}
          totalQuests={totalQuests}
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100, // clear the floating header buttons
    paddingBottom: 48,
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
    marginBottom: 16,
  },
  distance: {
    fontSize: 14,
    color: '#aaa',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#111',
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
    marginBottom: 16,
  },
  answerRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginTop: 24,
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
  timerCountdown: {
    marginBottom: 32,
  },
  continueButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
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
