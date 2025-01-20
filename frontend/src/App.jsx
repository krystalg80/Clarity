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

function ProtectedRoute({ children }) {
  const user = useSelector(state => state.session.user);
  if (!user) return <Navigate to="/welcome" replace />;
  return children;
}

function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  const user = useSelector(state => state.session.user);

  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
  }, [dispatch]);

  if (!isLoaded) return null;

  return (
    <div className="app-container">
      {location.pathname !== '/welcome' && user && <Navigation />}
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
        element: <Navigate to="/welcome" />,
      },
      {
        path: '/welcome',
        element: <WelcomePage />,
      },
      {
        path: '/dashboard',
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: '/workouts',
        element: <ProtectedRoute><Workout /></ProtectedRoute>,
      },
      {
        path: '/meditations',
        element: <ProtectedRoute><Meditation /></ProtectedRoute>,
      },
      {
        path: '/waterintake',
        element: <ProtectedRoute><Water /></ProtectedRoute>,
      },
      {
        path: '/profile',
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;