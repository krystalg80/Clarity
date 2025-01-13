import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import * as sessionActions from '../../store/session';

function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  const handleLogout = () => {
    dispatch(sessionActions.logout());
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user.username}!</p>
      <button onClick={handleLogout}>Log Out</button>
      {/* Add more dashboard content here */}
    </div>
  );
}

export default Dashboard;