import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { auth, db } from '../firebase';
import { useUser } from '../hooks/useUser';
import { useAuth } from '../hooks/useAuth';
import GameScreen from './GameScreen';

export default function HomeScreen() {
  const { profile, loading } = useUser();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await updateDoc(doc(db, 'users', user.uid), { pushToken: token });
    })();
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (profile?.teamId) {
    return <GameScreen teamId={profile.teamId} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GCR</Text>
      <Text style={styles.heading}>You're all set!</Text>
      <Text style={styles.message}>
        Your admins will assign you to a team soon.
      </Text>
      <TouchableOpacity style={styles.signOutButton} onPress={() => signOut(auth)}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
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
  signOutButton: {
    padding: 12,
  },
  signOutText: {
    color: '#aaa',
    fontSize: 14,
  },
});
