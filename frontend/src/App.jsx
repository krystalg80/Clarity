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

// Protected Route Component
function ProtectedRoute() {
  const sessionUser = useSelector(state => state.session.user);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Short timeout to ensure store is hydrated
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!sessionUser?.id) {
    return <Navigate to="/welcome" replace />;

  }

  return <Outlet />;
}

// Layout Component
function Layout() {
  const dispatch = useDispatch();
  const [isLoaded, setIsLoaded] = useState(false);
  const location = useLocation();
  // const sessionUser = useSelector(state => state.session?.user);
  
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
        // Protected routes group
        element: <ProtectedRoute />,
        children: [
          {
            path: '/dashboard',
            element: <Dashboard />,
            errorElement: <Navigate to="/welcome" />
          },
          {
            path: '/workouts',
            element: <Workout />,
            errorElement: <Navigate to="/welcome" />
          },
          {
            path: '/meditations',
            element: <Meditation />,
            errorElement: <Navigate to="/welcome" />
          },
          {
            path: '/waterintake',
            element: <Water />,
            errorElement: <Navigate to="/welcome" />
          },
          {
            path: '/profile',
            element: <Profile />,
            errorElement: <Navigate to="/welcome" />
          }
        ]
      }
    ],
  },
]);

// Main App Component
function App() {
  return <RouterProvider router={router} />;
}

export default App;