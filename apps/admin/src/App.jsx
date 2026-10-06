import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import QuestsPage from './pages/QuestsPage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ActivityPage from './pages/ActivityPage';
import ChatPage from './pages/ChatPage';
import ItemsPage from './pages/ItemsPage';
import LiveMapPage from './pages/LiveMapPage';
import GamePage from './pages/GamePage';

function ProtectedRoute({ children }) {
  const { user, isAdmin, isHost, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  // Platform admins run everything; hosts get in for the games they run.
  // Signing out has to be reachable here, or the screen is a dead end.
  if (!isAdmin && !isHost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-gray-500">Your account doesn't host any games.</p>
        <p className="text-xs text-gray-400">Signed in as {user.email}</p>
        <button
          onClick={() => signOut(auth)}
          className="mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/games" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/players" replace />} />
          <Route path="games" element={<Navigate to="/players" replace />} />
          <Route path="games/:gameId/quests" element={<QuestsPage />} />
          <Route path="games/:gameId/teams" element={<TeamsPage />} />
          <Route path="games/:gameId/items" element={<ItemsPage />} />
          <Route path="games/:gameId/leaderboard" element={<LeaderboardPage />} />
          <Route path="games/:gameId/activity" element={<ActivityPage />} />
          <Route path="games/:gameId/chat" element={<ChatPage />} />
          <Route path="games/:gameId/live-map" element={<LiveMapPage />} />
          <Route path="games/:gameId/game" element={<GamePage />} />
          <Route path="players" element={<PlayersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
