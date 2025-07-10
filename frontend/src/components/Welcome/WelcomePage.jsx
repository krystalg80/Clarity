import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import logo from '../../assets/Logo.png';
import './WelcomePage.css';

function WelcomePage() {
  const { user, loading } = useAuth();
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
  const [awakeningStage, setAwakeningStage] = useState('pulse'); // 'pulse', 'eye', 'form'

  useEffect(() => {
    // Pulse & hello for 2.5s, then eye open for 2s, then show form
    const timers = [
      setTimeout(() => setAwakeningStage('open'), 2500),
      setTimeout(() => setAwakeningStage('form'), 4500)
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

// Redirect if already logged in
if (loading) return <div>Loading...</div>;
if (user) return <Navigate to="/dashboard" replace={true} />;

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

  // Simplify your signup - no subscription selection needed!
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
        // No subscription choice - everyone gets trial!
      });
      // Will redirect to dashboard with full premium access
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="welcome-container">
      {/* Awakening Animation Overlay */}
      {awakeningStage !== 'form' && (
        <div className={`awakening-bg ${awakeningStage}`}>
          {/* <span className={`awakening-hello ${awakeningStage}`}>Welcome</span> */}
          <div className="awakening-eye"></div>
        </div>
      )}

      {/* Login/Signup Form */}
      <div className={`welcome-card ${awakeningStage === 'form' ? 'visible' : ''}`}>
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
            <button 
              type="submit" 
              className="primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging In...' : 'Log In'}
            </button>
          </form>
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