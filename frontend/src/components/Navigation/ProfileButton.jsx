import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CiUser } from 'react-icons/ci';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import './ProfileButton.css';

function ProfileButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const ulRef = useRef();

  // Fetch user profile for display
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoading(true);
        const response = await authService.getUserProfile(user.uid);
        setUserProfile(response.user);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.uid) {
      fetchUserProfile();
    }
  }, [user]);

  const toggleMenu = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  useEffect(() => {
    if (!showMenu) return;

    const closeMenu = (e) => {
      if (ulRef.current && !ulRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', closeMenu);

    return () => document.removeEventListener('click', closeMenu);
  }, [showMenu]);

  const handleLogout = async (e) => {
    e.preventDefault();
    setShowMenu(false);
    
    try {
      await logout(); // Use AuthContext logout method
      navigate('/welcome');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still navigate to welcome even if logout has issues
      navigate('/welcome');
    }
  };

  const handleProfileClick = () => {
    setShowMenu(false);
    navigate('/profile');
  };

  // Don't render if no user is logged in
  if (!user) {
    return null;
  }

  const ulClassName = "profile-dropdown" + (showMenu ? "" : " hidden");

  return (
    <div className="profile-button-container">
      <button onClick={toggleMenu} className="profile-button">
        <CiUser className="profile-icon" />
        {/* <span className="profile-greeting">
          {isLoading 
            ? 'Loading...' 
            : userProfile?.firstName 
              ? `Hi, ${userProfile.firstName}!` 
              : 'Hi there!'
          }
        </span> */}
      </button>
      
      <ul className={ulClassName} ref={ulRef}>
        <li className="profile-info">
          <div className="user-details">
            <span className="user-name">
              {userProfile?.firstName && userProfile?.lastName 
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : userProfile?.username || 'User'
              }
            </span>
            <span className="user-email">{userProfile?.email || user.email}</span>
          </div>
        </li>
        
        <li className="menu-divider"></li>
        
        <li>
          <button 
            onClick={handleProfileClick}
            className="dropdown-button"
          >
            👤 Edit Profile
          </button>
        </li>
        
        <li>
          <button 
            onClick={() => {
              setShowMenu(false);
              navigate('/dashboard');
            }}
            className="dropdown-button"
          >
            📊 Dashboard
          </button>
        </li>
        
        <li className="menu-divider"></li>
        
        <li>
          <button 
            onClick={handleLogout}
            className="dropdown-button logout-button"
          >
            🚪 Sign Out
          </button>
        </li>
      </ul>
    </div>
  );
}

export default ProfileButton;