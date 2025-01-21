import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createBrowserRouter, RouterProvider, Navigate, useLocation, Outlet } from 'react-router-dom';
import WelcomePage from './components/Welcome/WelcomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Navigation from './components/Navigation/Navigation';
import * as sessionActions from './store/session';
import Profile from './components/Profile/Profile';
import Meditation from './components/Meditation/Meditation';
import Workout from './components/Workout/Workout';
import Water from './components/Water/Water';

// Protected Route wrapper component
function ProtectedRoute({ children }) {
  const user = useSelector(state => state.session.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return children;
}

// Layout component with authentication check
function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  const user = useSelector(state => state.session.user);

  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
  }, [dispatch]);

  if (!isLoaded) return null;

  // Show welcome page without navigation if user is not logged in or at welcome page
  if (!user || location.pathname === '/welcome') {
    return <Outlet />;
  }

  // Show navigation and content for authenticated routes
  return (
    <div className="app-container">
      <Navigation />
      <Outlet />
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/welcome" replace />
      },
      {
        path: '/welcome',
        element: <WelcomePage />
      },
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
      },
      {
        path: '/workouts',
        element: (
          <ProtectedRoute>
            <Workout />
          </ProtectedRoute>
        )
      },
      {
        path: '/meditations',
        element: (
          <ProtectedRoute>
            <Meditation />
          </ProtectedRoute>
        )
      },
      {
        path: '/waterintake',
        element: (
          <ProtectedRoute>
            <Water />
          </ProtectedRoute>
        )
      },
      {
        path: '/profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;