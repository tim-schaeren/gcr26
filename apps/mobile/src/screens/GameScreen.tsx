import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  gameId: string;
  name: string;
  currentQuestId: string | null;
  completedQuestIds: string[];
  finishedAt: number | null;
}

interface Game {
  id: string;
  name: string;
  startDateTime: number;
  questOrder: string[];
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

function FinishedView({ game }: { game: Game }) {
  return (
    <View style={styles.container}>
      <Text style={styles.finishedEmoji}>🏁</Text>
      <Text style={styles.finishedHeading}>You finished!</Text>
      <Text style={styles.finishedSub}>{game.name}</Text>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function GameScreen({ teamId }: { teamId: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

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

  // Location
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 5 },
        loc => setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
    })();
    return () => {
      sub?.remove();
    };
  }, []);

  async function submitAnswer() {
    if (!quest || !team || !game || submitting || !answer.trim()) return;
    const normalized = answer.trim().toLowerCase();
    const correct = quest.answers.some(a => a.trim().toLowerCase() === normalized);
    if (!correct) {
      setWrong(true);
      setTimeout(() => setWrong(false), 2000);
      return;
    }

    setSubmitting(true);
    try {
      const nextQuestId = game.questOrder[game.questOrder.indexOf(quest.id) + 1] ?? null;
      const update: Record<string, unknown> = {
        completedQuestIds: arrayUnion(quest.id),
        currentQuestId: nextQuestId,
      };
      if (!nextQuestId) update.finishedAt = Date.now();
      await updateDoc(doc(db, 'teams', team.id), update);
      setAnswer('');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (locationDenied) return <LocationDeniedView />;
  if (!team || !game) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (now < game.startDateTime) return <WaitingView game={game} now={now} />;
  if (team.finishedAt) return <FinishedView game={game} />;
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
    marginBottom: 8,
  },
  finishedSub: {
    fontSize: 16,
    color: '#aaa',
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
