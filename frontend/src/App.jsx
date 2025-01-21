import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  createBrowserRouter, 
  RouterProvider, 
  Navigate, 
  useLocation, 
  Outlet 
} from 'react-router-dom';

// Components
import WelcomePage from './components/Welcome/WelcomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Navigation from './components/Navigation/Navigation';
import Profile from './components/Profile/Profile';
import Meditation from './components/Meditation/Meditation';
import Workout from './components/Workout/Workout';
import Water from './components/Water/Water';

// Store
import * as sessionActions from './store/session';

// Layout Component
function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    dispatch(sessionActions.restoreUser()).then(() => setIsLoaded(true));
  }, [dispatch]);

  return (
    <>
      {isLoaded && (
        <div className="app-container">
          {location.pathname !== '/welcome' && <Navigation />}
          <Outlet />
        </div>
      )}
    </>
  );
}

// Helper Function for Protected Routes
function requireAuth(element) {
  const sessionUser = useSelector(state => state.session.user);
  
  if (!sessionUser?.id) {
    return <Navigate to="/welcome" replace />;
  }
  
  return element;
}

// Router Configuration
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/welcome" replace />,
      },
      {
        path: '/welcome',
        element: <WelcomePage />,
      },
      {
        path: '/dashboard',
        element: requireAuth(<Dashboard />),
      },
      {
        path: '/workouts',
        element: requireAuth(<Workout />),
      },
      {
        path: '/meditations',
        element: requireAuth(<Meditation />),
      },
      {
        path: '/waterintake',
        element: requireAuth(<Water />),
      },
      {
        path: '/profile',
        element: requireAuth(<Profile />),
      },
    ],
  },
]);

// Main App Component
function App() {
  return <RouterProvider router={router} />;
}

export default App;
