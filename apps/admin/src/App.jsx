import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import QuestsPage from './pages/QuestsPage';
import TeamsPage from './pages/TeamsPage';
import PlayersPage from './pages/PlayersPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LiveMapPage from './pages/LiveMapPage';
import GamePage from './pages/GamePage';

function ProtectedRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Your account doesn't have admin access.
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
          <Route path="games/:gameId/leaderboard" element={<LeaderboardPage />} />
          <Route path="games/:gameId/live-map" element={<LiveMapPage />} />
          <Route path="games/:gameId/game" element={<GamePage />} />
          <Route path="players" element={<PlayersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
