import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  console.log('🔐 ProtectedRoute - loading:', loading, 'user:', !!user);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    console.log('🚫 Not authenticated, redirecting to welcome');
    return <Navigate to="/welcome" replace />;
  }

  console.log('✅ Authenticated, rendering protected content');
  return children;
}

export default ProtectedRoute;