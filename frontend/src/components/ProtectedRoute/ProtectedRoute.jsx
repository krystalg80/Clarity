import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Show loading while auth is being determined
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // If no user, redirect to welcome
  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

export default ProtectedRoute;