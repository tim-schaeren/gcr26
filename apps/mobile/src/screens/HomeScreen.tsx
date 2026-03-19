import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useUser } from '../hooks/useUser';

export default function HomeScreen() {
  const { profile, loading } = useUser();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // User has no team yet
  if (!profile?.teamId) {
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

  // Has a team — game screen placeholder
  return (
    <View style={styles.container}>
      <Text style={styles.title}>GCR</Text>
      <Text style={styles.heading}>Welcome, {profile?.name}</Text>
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
