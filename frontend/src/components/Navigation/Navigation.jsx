import { NavLink, Outlet } from 'react-router-dom';
import './Navigation.css';
import logo from '../../assets/logo.png'; // Update this path to where your logo actually is
import ProfileButton from './ProfileButton';
import TrialBanner from '../Trial/TrialBanner';

function Navigation() {
  return (
    <div className="navigation-container">
      {/* Top header with logo and profile */}
      <div className="top-header">
        <div className="logo-container">
          <img src={logo} alt="Clarity logo" className="logo" />
          <span className="logo-text">Your Mind + Wellness Tracker</span>
        </div>
        <ProfileButton />
      </div>

      {/* Trial Banner */}
      <TrialBanner />

      {/* Main content area - full screen */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom navigation - Oura style with 6 tabs now */}
      <nav className="bottom-navigation">
        <NavLink to="/dashboard" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Home</span>
        </NavLink>
        
        <NavLink to="/workout" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🏋️</span>
          <span className="nav-label">Workout</span>
        </NavLink>
        
        <NavLink to="/meditation" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🧘‍♀️</span>
          <span className="nav-label">Meditate</span>
        </NavLink>
        
        <NavLink to="/water" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💧</span>
          <span className="nav-label">Water</span>
        </NavLink>
        
        <NavLink to="/games" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🎮</span>
          <span className="nav-label">Games</span>
        </NavLink>
        
        <NavLink to="/goals" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Goals</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default Navigation;