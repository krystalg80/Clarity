import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

export default ProtectedRoute;