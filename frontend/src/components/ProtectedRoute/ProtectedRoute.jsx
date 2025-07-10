import { useAuth } from '../../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }) {
  const { user, loading, authKey } = useAuth();
  const location = useLocation();
  const [shouldRender, setShouldRender] = useState(false);

  console.log('🔐 ProtectedRoute - loading:', loading, 'user:', !!user, 'authKey:', authKey);

  // Force re-render when auth state changes
  useEffect(() => {
    if (!loading) {
      setShouldRender(true);
    }
  }, [loading, authKey]);

  if (loading || !shouldRender) {
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