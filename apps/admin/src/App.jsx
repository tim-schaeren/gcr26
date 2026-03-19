import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import GamesPage from './pages/GamesPage';
import QuestsPage from './pages/QuestsPage';

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
          <Route index element={<Navigate to="/games" replace />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="games/:gameId/quests" element={<QuestsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
