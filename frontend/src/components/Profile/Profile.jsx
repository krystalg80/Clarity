import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import './Profile.css';

function Profile() {
  // Fixed: Get ALL needed values from useAuth in one destructure
  const { 
    user: firebaseUser, 
    loading: authLoading, 
    isPremium, 
    userSubscription, 
    trialDaysRemaining,    // ← Add this missing import
    upgradeToPremium, 
    cancelSubscription 
  } = useAuth();

  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    exerciseGoalMinutes: '',
    waterGoalOz: '',
    meditationGoalMinutes: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!firebaseUser?.uid) return;
      
      try {
        setIsLoading(true);
        const response = await authService.getUserProfile(firebaseUser.uid);
        setUser(response.user);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    if (firebaseUser?.uid) {
      fetchProfile();
    }
  }, [firebaseUser]);

  // Update form data when user profile is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        exerciseGoalMinutes: user.exerciseGoalMinutes || '',
        waterGoalOz: user.waterGoalOz || '',
        meditationGoalMinutes: user.meditationGoalMinutes || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firebaseUser?.uid) return;
    
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('Submitting profile update:', formData);
      
      // Convert string values to numbers for goals
      const profileData = {
        ...formData,
        exerciseGoalMinutes: parseInt(formData.exerciseGoalMinutes) || 30,
        waterGoalOz: parseInt(formData.waterGoalOz) || 64,
        meditationGoalMinutes: parseInt(formData.meditationGoalMinutes) || 10
      };

      await authService.updateUserProfile(firebaseUser.uid, profileData);
      
      // Update local state
      setUser({ ...user, ...profileData });
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        exerciseGoalMinutes: user.exerciseGoalMinutes || '',
        waterGoalOz: user.waterGoalOz || '',
        meditationGoalMinutes: user.meditationGoalMinutes || ''
      });
    }
    setError('');
    setSuccessMessage('');
  };

  if (authLoading || isLoading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  if (!firebaseUser) {
    return <div className="profile-error">Please log in to view your profile.</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <h1 className="profile-title">Personal Information</h1>
          <p className="profile-subtitle">Update your profile and wellness goals</p>
        </div>

        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        
        {error && (
          <div className="error-message">{error}</div>
        )}

        {user && (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-section">
              <h3 className="section-title">Account Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Username
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Email
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    First Name
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Last Name
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Daily Wellness Goals</h3>
              <p className="section-description">
                Set your daily targets to track your progress effectively
              </p>
              
              <div className="goals-grid">
                <div className="form-group goal-group">
                  <label className="form-label">
                    <span className="goal-icon">🏋️</span>
                    Exercise Goal (Minutes)
                    <input
                      type="number"
                      name="exerciseGoalMinutes"
                      value={formData.exerciseGoalMinutes}
                      onChange={handleChange}
                      className="form-input"
                      min="1"
                      max="300"
                      required
                    />
                    <small className="input-help">Recommended: 30-60 minutes</small>
                  </label>
                </div>

                <div className="form-group goal-group">
                  <label className="form-label">
                    <span className="goal-icon">💧</span>
                    Water Goal (Oz)
                    <input
                      type="number"
                      name="waterGoalOz"
                      value={formData.waterGoalOz}
                      onChange={handleChange}
                      className="form-input"
                      min="1"
                      max="200"
                      required
                    />
                    <small className="input-help">Recommended: 64-100 oz</small>
                  </label>
                </div>

                <div className="form-group goal-group">
                  <label className="form-label">
                    <span className="goal-icon">🧘</span>
                    Meditation Goal (Minutes)
                    <input
                      type="number"
                      name="meditationGoalMinutes"
                      value={formData.meditationGoalMinutes}
                      onChange={handleChange}
                      className="form-input"
                      min="1"
                      max="120"
                      required
                    />
                    <small className="input-help">Recommended: 5-20 minutes</small>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="reset-button"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                Reset Changes
              </button>
              <button 
                type="submit" 
                className="save-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        )}

        <div className="profile-stats">
          <h3 className="section-title">Account Summary</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Member Since</span>
              <span className="stat-value">
                {user?.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Profile Updated</span>
              <span className="stat-value">
                {user?.updatedAt ? new Date(user.updatedAt.seconds * 1000).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Goals Set</span>
              <span className="stat-value">
                {[formData.exerciseGoalMinutes, formData.waterGoalOz, formData.meditationGoalMinutes]
                  .filter(goal => goal && goal > 0).length} / 3
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Management Section */}
        <div className="subscription-section">
          <h2>Your Plan</h2>
          
          {userSubscription === 'trial' && (
            <div className="trial-status">
              <div className="status-card trial">
                <h3>Premium Trial</h3>
                <p>You're experiencing the full premium experience!</p>
                <div className="trial-countdown">
                  <span className="days-remaining">{trialDaysRemaining}</span>
                  <span className="days-label">days remaining</span>
                </div>
                <div className="trial-benefits">
                  <p>Currently enjoying:</p>
                  <ul>
                    <li>✓ Custom goal setting</li>
                    <li>✓ Diamond achievements</li>
                    <li>✓ Premium soundscapes</li>
                    <li>✓ Advanced analytics</li>
                  </ul>
                </div>
                <button 
                  onClick={upgradeToPremium}
                  className="keep-premium-btn"
                >
                  Keep Premium Access - $4.99/month
                </button>
              </div>
            </div>
          )}
          
          {userSubscription === 'premium' && (
            <div className="premium-status">
              <div className="status-card premium">
                <h3>💎 Premium Member</h3>
                <p>You have access to all premium features!</p>
                <div className="premium-benefits">
                  <h4>Your Premium Benefits:</h4>
                  <div className="benefits-list">
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Custom goal setting</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Exclusive Diamond badges</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Premium soundscapes</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Advanced analytics</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Challenge competitions</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">✓</span>
                      <span>Priority support</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={cancelSubscription}
                  className="cancel-btn"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}
          
          {userSubscription === 'free' && (
            <div className="free-status">
              <div className="status-card free">
                <h3>🆓 Free Plan</h3>
                <p>Upgrade to unlock premium features and enhance your wellness journey</p>
                <div className="premium-benefits">
                  <h4>Unlock with Premium:</h4>
                  <div className="benefits-list">
                    <div className="benefit-item">
                      <span className="benefit-icon">🎯</span>
                      <span>Custom goal setting</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">💎</span>
                      <span>Exclusive Diamond badges</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">🎵</span>
                      <span>Premium soundscapes</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">📊</span>
                      <span>Advanced analytics</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">🏆</span>
                      <span>Challenge competitions</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">⚡</span>
                      <span>Priority support</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={upgradeToPremium}
                  className="upgrade-btn"
                >
                  Upgrade to Premium - $4.99/month
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;