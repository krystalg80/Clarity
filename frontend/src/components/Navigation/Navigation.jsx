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
          <span className="logo-text">Your Mind + Wellness Tracker</span>
        </div>
        <ProfileButton />
      </div>
      <div className="main-content">
        <nav className="side-bar">
          <NavLink to="/dashboard" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink to="/workouts" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            Workouts
          </NavLink>
          <NavLink to="/meditations" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            Meditations
          </NavLink>
          <NavLink to="/waterintake" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            Water Intake
          </NavLink>
          <NavLink to="/profile" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
            Profile
          </NavLink>
        </nav>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Navigation;