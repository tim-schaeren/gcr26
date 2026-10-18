import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { authErrorMessage, emailLooksValid, MIN_PASSWORD_LENGTH } from '@gcr26/shared';
import { auth, db } from '../firebase';

// Hosting starts here: anyone can make an account and create their own game.
// Players can sign up here too, though they'd normally do it in the app.
export default function LoginPage() {
  const [mode, setMode] = useState('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signingUp = mode === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!emailLooksValid(email)) return setError('That email address doesn’t look right.');
    if (signingUp) {
      if (!name.trim()) return setError('Enter your name.');
      if (password.length < MIN_PASSWORD_LENGTH) {
        return setError(`Pick a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (!accepted) return setError('Please accept the terms to continue.');
    }

    setLoading(true);
    try {
      if (signingUp) {
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
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 tracking-widest">GCR</h1>
        <p className="text-center text-sm text-gray-500 mb-8">
          {signingUp ? 'Create an account to host a game.' : 'Sign in to run your games.'}
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4"
        >
          {signingUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              autoFocus={!signingUp}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {signingUp && (
            <label className="flex items-start gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-gray-900"
              />
              <span>
                I agree to the <Link to="/terms" className="underline">terms</Link>,{' '}
                <Link to="/privacy" className="underline">privacy policy</Link> and{' '}
                <Link to="/guidelines" className="underline">community guidelines</Link>.
              </span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working…' : signingUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          {signingUp ? 'Already have an account?' : 'Want to host your own game?'}{' '}
          <button
            onClick={() => {
              setMode(signingUp ? 'signin' : 'signup');
              setError('');
            }}
            className="text-gray-900 font-medium hover:underline"
          >
            {signingUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  );
}
