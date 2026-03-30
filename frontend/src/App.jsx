import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation/Navigation';
import Welcome from './components/Welcome/WelcomePage'
import Dashboard from './components/Dashboard/Dashboard';
import Workout from './components/Workout/Workout';
import Meditation from './components/Meditation/Meditation';
import Water from './components/Water/Water';
import Goals from './components/Goals/Goals';
import Profile from './components/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PWARegistration from './components/PWA/PWARegistration';
import InstallPrompt from './components/PWA/InstallPrompt';
import FloatingInstallButton from './components/PWA/FloatingInstallButton';
import './App.css'; // Import global styles
import Games from './components/Games/Games';
import { useState, useEffect } from 'react';
import WelcomeModal from './components/Welcome/WelcomeModal';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, loading } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const welcomeKey = `clarity_welcome_shown_${user.uid}`;
      if (!localStorage.getItem(welcomeKey)) {
        setShowWelcomeModal(true);
        localStorage.setItem(welcomeKey, 'true');
      }
    }
  }, [user, loading]);

  return (
    <AuthProvider>
      <Router>
        {showWelcomeModal && <WelcomeModal onClose={() => setShowWelcomeModal(false)} />}
        <Routes>
          {/* Public Routes */}
          <Route path="/welcome" element={<Welcome />} />
          
          {/* Protected Routes with Navigation */}
          <Route path="/" element={<ProtectedRoute><Navigation /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workout" element={<Workout />} />
            <Route path="meditation" element={<Meditation />} />
            <Route path="water" element={<Water />} />
            <Route path="goals" element={<Goals />} />
            <Route path="profile" element={<Profile />} />
            <Route path="games" element={<Games />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
        <PWARegistration />
        <InstallPrompt />
        <FloatingInstallButton />
      </Router>
    </AuthProvider>
  );
}

export default App;