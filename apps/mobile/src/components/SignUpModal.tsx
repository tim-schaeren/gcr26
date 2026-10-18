import { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput as TextInputType,
  Linking,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  authErrorMessage,
  emailLooksValid,
  MIN_PASSWORD_LENGTH,
} from '@gcr26/shared';
import { auth, db } from '../firebase';
import Icon from '../theme/Icon';
import { LEGAL } from '../config';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SignUpModal({ visible, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!emailLooksValid(email)) {
      setError('That email address doesn\u2019t look right.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Pick a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!accepted) {
      setError('Please accept the terms to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        email: email.trim(),
        isAdmin: false,
        teamId: null,
        gameId: null,
        pushToken: null,
        createdAt: Date.now(),
        acceptedTermsAt: Date.now(),
      });
      // auth state change will automatically navigate to HomeScreen
    } catch (e) {
      setError(authErrorMessage(e));
      setLoading(false);
    }
  }

  function handleClose() {
    setName('');
    setEmail('');
    setPassword('');
    setAccepted(false);
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={16}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          textContentType="name"
          autoComplete="name"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextInput
          ref={emailRef}
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          textContentType="emailAddress"
          autoComplete="email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          textContentType="newPassword"
          autoComplete="new-password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignUp}
        />

        <TouchableOpacity
          style={styles.acceptRow}
          onPress={() => setAccepted(a => !a)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
            {accepted && <Icon name="check" size={15} color="#fff" />}
          </View>
          <Text style={styles.acceptText}>
            I agree to the{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.terms)}>
              terms
            </Text>
            ,{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(LEGAL.privacy)}>
              privacy policy
            </Text>{' '}
            and{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(LEGAL.guidelines)}
            >
              community guidelines
            </Text>
            .
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 24 }} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Create Account</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  cancel: {
    fontSize: 16,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  link: {
    color: '#111',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  error: {
    color: '#e33',
    fontSize: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
