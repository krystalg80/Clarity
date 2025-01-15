import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useLocation } from 'react-router-dom';
import WelcomePage from './components/Welcome/WelcomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Navigation from './components/Navigation/Navigation';
import * as sessionActions from './store/session';
import Profile from './components/Profile/Profile';

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
          <WelcomePage />
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
        element: <Navigate to="/dashboard" replace />,
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
        element: <div>Workouts Page</div>, // Placeholder for Workouts component
      },
      {
        path: '/meditations',
        element: <div>Meditations Page</div>, // Placeholder for Meditations component
      },
      {
        path: '/waterintake',
        element: <div>Water Intake Page</div>, // Placeholder for Water Intake component
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