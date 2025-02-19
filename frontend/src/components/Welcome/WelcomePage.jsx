import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import * as sessionActions from '../../store/session';
import './WelcomePage.css';
import logo from '../../../../images/logo.png';
import flowers from '../../../../images/flowers.png';

function WelcomePage() {
  const dispatch = useDispatch();
  const sessionUser = useSelector((state) => state.session.user);
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exerciseGoalMinutes, setExerciseGoalMinutes] = useState('');
  const [waterGoalOz, setWaterGoalOz] = useState('');
  const [meditationGoalMinutes, setMeditationGoalMinutes] = useState('');
  const [errors, setErrors] = useState({});
  const [isSignup, setIsSignup] = useState(false);

  if (sessionUser) return <Navigate to="/dashboard" replace={true} />;


  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    return dispatch(sessionActions.login({ credential, password })).catch(
      async (res) => {
        const data = await res.json();
        if (data?.errors) setErrors(data.errors);
      }
    );
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Confirm Password field must be the same as the Password field' });
      return;
    }
    setErrors({});
    return dispatch(sessionActions.signup({ 
      email, 
      password, 
      username, 
      firstName, 
      lastName, 
      exerciseGoalMinutes, 
      waterGoalOz, 
      meditationGoalMinutes 
    })).catch(
      async (res) => {
        const data = await res.json();
        if (data?.errors) setErrors(data.errors);
      }
    );
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    console.log('Demo login attempted');
    
    try {
      const response = await dispatch(sessionActions.login({ 
        credential: 'Demo-lition',
        password: 'password' 
      }));
      console.log('Demo login success:', response);
      // Force navigation if needed
      if (response?.user) {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Demo login error:', error);
    }
  };

  return (
    <div className="welcome-container">
        <img src={flowers} className="flowers" alt="Flowers" />
      <div className="welcome-card">
        <div className="welcome-header">
          <img src={logo} alt="Clarity logo" />
          <p>Begin your wellness today</p>
        </div>
        
        {isSignup ? (
          <form className="welcome-form" onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Choose a username"
              />
            </div>
            
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="Enter your first name"
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Enter your last name"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a password"
              />
            </div>
            
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
              />
            </div>
            
            <div className="form-group">
              <label>Exercise Goal (minutes)</label>
              <input
                type="number"
                value={exerciseGoalMinutes}
                onChange={(e) => setExerciseGoalMinutes(e.target.value)}
                required
                placeholder="Daily exercise goal in minutes"
              />
            </div>
            
            <div className="form-group">
              <label>Water Goal (oz)</label>
              <input
                type="number"
                value={waterGoalOz}
                onChange={(e) => setWaterGoalOz(e.target.value)}
                required
                placeholder="Daily water goal in ounces"
              />
            </div>
            
            <div className="form-group">
              <label>Meditation Goal (minutes)</label>
              <input
                type="number"
                value={meditationGoalMinutes}
                onChange={(e) => setMeditationGoalMinutes(e.target.value)}
                required
                placeholder="Daily meditation goal in minutes"
              />
            </div>
            
            {errors.confirmPassword && (
              <p className="error-message">{errors.confirmPassword}</p>
            )}
            <button type="submit" className="primary-button">Sign Up</button>
          </form>
        ) : (
          <>
          <form className="welcome-form" onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <input
                type="text"
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                required
                placeholder="Enter your username or email"
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            
            {errors.credential && (
              <p className="error-message">{errors.credential}</p>
            )}
            <button type="submit" className="primary-button">Log In</button>
          </form>
          <button 
          onClick={handleDemoLogin}
          className="demo-button"
        >
          Demo Login
        </button>
      </>
    )}  
        <button 
          className="secondary-button"
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default WelcomePage;