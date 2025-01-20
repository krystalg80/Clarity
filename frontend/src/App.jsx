import  { useState, useEffect, Outlet } from 'react';
import { useDispatch } from 'react-redux';
import { createBrowserRouter, RouterProvider,  Navigate, useLocation, Outlet } from 'react-router-dom';
import WelcomePage from './components/Welcome/WelcomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Navigation from './components/Navigation/Navigation';
import * as sessionActions from './store/session';
import Profile from './components/Profile/Profile';
import Meditation from './components/Meditation/Meditation';
import Workout from './components/Workout/Workout';
import Water from './components/Water/Water';

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
        element: <Dashboard />,
      },
      {
        path: '/workouts',
        element: <Workout />, // Placeholder for Workouts component
      },
      {
        path: '/meditations',
        element: <Meditation />, // Placeholder for Meditations component
      },
      {
        path: '/waterintake',
        element: <Water />, // Placeholder for Water Intake component
      },
      {
        path: '/profile',
        element: <Profile />, // Placeholder for Profile component
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;