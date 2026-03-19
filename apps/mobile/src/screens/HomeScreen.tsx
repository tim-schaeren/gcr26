import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../firebase';

export default function HomeScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GCR 2026</Text>
      <Text style={styles.subtitle}>Welcome, {user?.email}</Text>
      <Text style={styles.placeholder}>The race hasn't started yet.</Text>

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
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 48,
  },
  placeholder: {
    fontSize: 18,
    color: '#aaa',
    fontStyle: 'italic',
    marginBottom: 64,
  },
  signOutButton: {
    padding: 12,
  },
  signOutText: {
    color: '#888',
    fontSize: 14,
  },
});
