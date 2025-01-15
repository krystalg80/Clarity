import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './Navigation.css';
import logo from '../../../../images/logo.png';
import ProfileButton from './ProfileButton';

function Navigation() {
  return (
    <div className="navigation-container">
      <div className="top-bar">
        <div className="logo-container">
          <img src={logo} alt="Clarity logo" className="logo" />
          <span className="logo-text">Your Wellness Tracker</span>
        </div>
        <ProfileButton />
      </div>
      <div className="main-content">
        <div className="side-bar">
          <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
          <NavLink to="/workouts" className="nav-link">Workouts</NavLink>
          <NavLink to="/meditations" className="nav-link">Meditations</NavLink>
          <NavLink to="/waterintake" className="nav-link">Water Intake</NavLink>
          <NavLink to="/profile" className="nav-link">Profile</NavLink>
        </div>
        <div className="content">
            <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Navigation;