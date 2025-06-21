import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navigation from './components/Navigation/Navigation';
import Welcome from './components/Welcome/WelcomePage'
import Dashboard from './components/Dashboard/Dashboard';
import Workout from './components/Workout/Workout';
import Meditation from './components/Meditation/Meditation';
import Water from './components/Water/Water';
import Notes from './components/Notes/Notes';
import Profile from './components/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import './App.css'; // Import global styles

function App() {
  return (
    <AuthProvider>
      <Router>
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
            <Route path="notes" element={<Notes />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;