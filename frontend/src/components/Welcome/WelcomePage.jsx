import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import logo from '../../assets/logo.png';
import flowers from '../../assets/flowers.png';
import './WelcomePage.css';

function WelcomePage() {
  const { user, loading } = useAuth(); // Replace Redux selector
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exerciseGoalMinutes, setExerciseGoalMinutes] = useState('30');
  const [waterGoalOz, setWaterGoalOz] = useState('64');
  const [meditationGoalMinutes, setMeditationGoalMinutes] = useState('10');
  const [errors, setErrors] = useState({});
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !loading) return <Navigate to="/dashboard" replace={true} />;

  if (loading) return <div>Loading...</div>;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.login(credential, password);
      // AuthContext will handle the redirect
    } catch (error) {
      setErrors({ credential: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Confirm Password field must be the same as the Password field' });
      return;
    }
    
    setErrors({});
    setIsSubmitting(true);

    try {
      await authService.register({ 
        email, 
        password, 
        username, 
        firstName, 
        lastName, 
        exerciseGoalMinutes: parseInt(exerciseGoalMinutes), 
        waterGoalOz: parseInt(waterGoalOz), 
        meditationGoalMinutes: parseInt(meditationGoalMinutes) 
      });
      // AuthContext will handle the redirect
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create a demo user or use existing demo credentials
      await authService.login('demo@clarity.com', 'demopassword');
    } catch (error) {
      // If demo user doesn't exist, you might want to create it
      setErrors({ demo: 'Demo login unavailable. Please sign up or use existing credentials.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="welcome-container">
        <img src={flowers} className="flowers" alt="Flowers" />
        {/* <div className="flowers">🌸</div> Temporary emoji replacement */}
      <div className="welcome-card">
        <div className="welcome-header">
          <img src={logo} alt="Clarity logo" />
          {/* <h1>Clarity</h1> Temporary text replacement */}
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
            {errors.general && (
              <p className="error-message">{errors.general}</p>
            )}
            <button 
              type="submit" 
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
            </button>
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
            {errors.demo && (
              <p className="error-message">{errors.demo}</p>
            )}
            <button 
              type="submit" 
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging In...' : 'Log In'}
            </button>
          </form>
          <button 
            onClick={handleDemoLogin}
            className="demo-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Loading...' : 'Demo Login'}
          </button>
        </>
        )}  
        <button 
          className="secondary-button"
          onClick={() => setIsSignup(!isSignup)}
          disabled={isSubmitting}
        >
          {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default WelcomePage;