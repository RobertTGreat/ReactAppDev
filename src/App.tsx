import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from './config/firebase';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ChatsPage from './pages/ChatsPage';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        // Reload user to get latest emailVerified status
        await currentUser.reload();
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1121] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/auth"
          element={user ? <Navigate to="/chats" /> : <AuthPage />}
        />
        <Route
          path="/verify-email"
          element={
            !user ? (
              <Navigate to="/auth" />
            ) : user.emailVerified ? (
              <Navigate to="/chats" />
            ) : (
              <VerifyEmail />
            )
          }
        />
        <Route
          path="/chats"
          element={
            !user ? (
              <Navigate to="/auth" />
            ) : !user.emailVerified ? (
              <Navigate to="/verify-email" />
            ) : (
              <ChatsPage />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;