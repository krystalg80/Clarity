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

// Auth check component
function RequireAuth({ children }) {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const user = useSelector(state => state.session.user);

  useEffect(() => {
    dispatch(sessionActions.restoreUser())
      .then(() => setIsLoaded(true));
  }, [dispatch]);

  useEffect(() => {
    console.log('RequireAuth user:', user);
  }, [user]);


  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('No user, redirecting to /welcome');
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

// Layout component
function Layout() {
  const location = useLocation();
  const user = useSelector(state => state.session.user);

  useEffect(() => {
    console.log('Layout user:', user);
  }, [user]);

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
        element: <WelcomePage />
      },
      {
        path: '/welcome',
        element: <WelcomePage />
      },
      {
        path: '/dashboard',
        element: (
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        )
      },
      {
        path: '/workouts',
        element: (
          <RequireAuth>
            <Workout />
          </RequireAuth>
        )
      },
      {
        path: '/meditations',
        element: (
          <RequireAuth>
            <Meditation />
          </RequireAuth>
        )
      },
      {
        path: '/waterintake',
        element: (
          <RequireAuth>
            <Water />
          </RequireAuth>
        )
      },
      {
        path: '/profile',
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        )
      }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;