import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { workoutService } from '../../services/workoutService';
import { waterService } from '../../services/waterService';
import { meditationService } from '../../services/meditationService';
import { authService } from '../../services/authService';
import PremiumGate from '../Premium/PremiumGate';
import timezoneUtils from '../../utils/timezone';
import './Goals.css';

function Goals() {
  const { user: firebaseUser, isPremium } = useAuth();
  
  
  const [weeklyData, setWeeklyData] = useState({
    workout: { current: 0, goal: 210 },
    water: { current: 0, goal: 448 },
    meditation: { current: 0, goal: 105 }
  });
  const [achievements, setAchievements] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [customWorkoutGoal, setCustomWorkoutGoal] = useState(30);
  const [customWaterGoal, setCustomWaterGoal] = useState(64);
  const [customMeditationGoal, setCustomMeditationGoal] = useState(15);

  // Helper function to get days remaining in the current week
  const getDaysRemainingInWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    return daysUntilSunday;
  };

  useEffect(() => {
    const fetchWeeklyData = async () => {
      if (firebaseUser?.uid) {
        try {
          setIsLoading(true);
          
          console.log('🌍 Goals timezone:', timezoneUtils.getUserTimezone());
          
          // Get current week's data (7 days)
          const [workoutData, waterData, meditationData] = await Promise.all([
            workoutService.getWorkoutSummary(firebaseUser.uid, 7),
            waterService.getWaterSummary(firebaseUser.uid, 7), // Use existing method
            meditationService.getMeditationSummary(firebaseUser.uid, 7)
          ]);

          console.log('📊 Weekly data fetched:', { workoutData, waterData, meditationData });

          setWeeklyData({
            workout: { 
              current: workoutData.totalMinutes || 0, 
              goal: 210
            },
            water: { 
              current: waterData.totalOz || 0, 
              goal: 448 
            },
            meditation: { 
              current: meditationData.totalMinutes || 0, 
              goal: 105 
            }
          });

          // Calculate achievements after setting the data
          setTimeout(() => calculateAchievements(), 100);
          
        } catch (error) {
          console.error('Error fetching weekly data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchWeeklyData();
  }, [firebaseUser]);

  const calculateAchievements = () => {
    const newAchievements = [];
    
    Object.entries(weeklyData).forEach(([key, data]) => {
      const percentage = (data.current / data.goal) * 100;
      
      if (percentage >= 125) {
        newAchievements.push({ type: key, level: 'diamond', percentage });
      } else if (percentage >= 100) {
        newAchievements.push({ type: key, level: 'gold', percentage });
      } else if (percentage >= 75) {
        newAchievements.push({ type: key, level: 'silver', percentage });
      } else if (percentage >= 50) {
        newAchievements.push({ type: key, level: 'bronze', percentage });
      }
    });
    
    setAchievements(newAchievements);
  };

  const getBadgeEmoji = (level) => {
    switch (level) {
      case 'diamond': return '💎';
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '⭐';
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'var(--sage-500)';
    if (percentage >= 75) return 'var(--mint)';
    if (percentage >= 50) return '#FFD700';
    return 'var(--sage-300)';
  };

  const isGoalCompleted = (percentage) => {
    return percentage >= 100;
  };

  const handleSaveGoals = async () => {
    if (!firebaseUser?.uid) return;
    
    try {
      setIsLoading(true);
      
      // Calculate weekly goals
      const weeklyWorkoutGoal = customWorkoutGoal * 7;
      const weeklyWaterGoal = customWaterGoal * 7;
      const weeklyMeditationGoal = customMeditationGoal * 7;
      
      // Update goals in the backend
      const updatedProfile = await authService.updateUserProfile(firebaseUser.uid, {
        exerciseGoalMinutes: customWorkoutGoal,
        meditationGoalMinutes: customMeditationGoal,
        waterGoalOz: customWaterGoal
      });
      
      // Update the weekly goals display
      setWeeklyData(prev => ({
        ...prev,
        workout: { ...prev.workout, goal: weeklyWorkoutGoal },
        water: { ...prev.water, goal: weeklyWaterGoal },
        meditation: { ...prev.meditation, goal: weeklyMeditationGoal }
      }));
      
      // Recalculate achievements with new goals
      setTimeout(() => calculateAchievements(), 100);
      
      console.log('✅ Goals updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="goals-loading">Loading weekly goals...</div>;
  }

  const daysRemaining = getDaysRemainingInWeek();

  return (
    <div className="goals-page">
      {/* Weekly Progress Header */}
      <div className="weekly-header">
        <h1 className="goals-title">Weekly Goals</h1>
        <p className="goals-subtitle">Track your progress and earn rewards</p>
        <div className="week-info">
          <span className="week-label">Current Week</span>
          <span className="days-remaining">
            {daysRemaining === 0 ? 'Last day!' : `${daysRemaining} days remaining`}
          </span>
        </div>
      </div>

      {/* Weekly Progress Rings */}
      <div className="weekly-progress">
        {Object.entries(weeklyData).map(([key, data]) => {
          const percentage = Math.min((data.current / data.goal) * 100, 100);
          const isCompleted = isGoalCompleted(percentage);
          const circumference = 2 * Math.PI * 45;
          const strokeDasharray = circumference;
          const strokeDashoffset = circumference - (percentage / 100) * circumference;
          
          return (
            <div key={key} className={`weekly-ring ${isCompleted ? 'completed' : ''}`}>
              <div className="ring-container">
                <svg className="progress-ring" width="120" height="120">
                  <circle
                    className="ring-background"
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke="var(--sage-100)"
                    strokeWidth="8"
                  />
                  <circle
                    className="ring-progress"
                    cx="60"
                    cy="60"
                    r="45"
                    fill="transparent"
                    stroke={getProgressColor(percentage)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="ring-content">
                  <span className="ring-value">{data.current}</span>
                  <span className="ring-goal">/ {data.goal}</span>
                  <span className="ring-label">{key}</span>
                </div>
              </div>
              <div className="ring-percentage">{Math.round(percentage)}%</div>
            </div>
          );
        })}
      </div>

      {/* Achievement Gallery */}
      <div className="achievement-gallery">
        <h2 className="section-title">This Week's Achievements</h2>
        
        {achievements.length === 0 ? (
          <div className="no-achievements">
            <span className="no-achievement-icon">🎯</span>
            <p>Keep going! Your first achievement is waiting.</p>
          </div>
        ) : (
          <div className="achievements-grid">
            {achievements.map((achievement, index) => (
              <div key={index} className={`achievement-card ${achievement.level}`}>
                <div className="achievement-icon">
                  {getBadgeEmoji(achievement.level)}
                </div>
                <div className="achievement-info">
                  <h4>{achievement.level.toUpperCase()}</h4>
                  <p>{achievement.type.toUpperCase()}</p>
                  <span className="achievement-percentage">
                    {Math.round(achievement.percentage)}%
                  </span>
                </div>
                {!isPremium && achievement.level === 'diamond' && (
                  <div className="premium-overlay">
                    <span className="premium-badge">PRO</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Streak Tracker */}
      <div className="streak-section">
        <h2 className="section-title">Weekly Streak</h2>
        <div className="streak-card">
          <div className="streak-icon">🔥</div>
          <div className="streak-info">
            <span className="streak-number">{currentStreak}</span>
            <span className="streak-label">Week Streak</span>
          </div>
          <div className="streak-next">
            <span>Next reward at 4 weeks</span>
            {!isPremium && <span className="premium-hint">PRO</span>}
          </div>
        </div>
      </div>

      {/* Reward Marketplace */}
      <div className="reward-marketplace">
        <h2 className="section-title">Reward Marketplace</h2>
        
        {!isPremium ? (
          <div className="premium-cta-card">
            <div className="cta-header">
              <h3>Unlock Premium Rewards</h3>
              <span className="cta-price">$4.99/month</span>
            </div>
            <div className="premium-features">
              <div className="feature-item">
                <span className="feature-icon">💎</span>
                <span>Exclusive Diamond badges</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span>Custom goal setting</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Advanced analytics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🏆</span>
                <span>Challenge competitions</span>
              </div>
            </div>
            <button className="upgrade-button">
              Upgrade to Premium
            </button>
          </div>
        ) : (
          <div className="rewards-grid">
            <div className="reward-item">
              <div className="reward-icon">🎵</div>
              <div className="reward-info">
                <h4>Premium Soundscape</h4>
                <p>Unlock for 1 week</p>
                <span className="reward-cost">50 points</span>
              </div>
            </div>
            <div className="reward-item">
              <div className="reward-icon">📱</div>
              <div className="reward-info">
                <h4>Custom Badge</h4>
                <p>Design your own</p>
                <span className="reward-cost">100 points</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Challenges */}
      <div className="weekly-challenges">
        <h2 className="section-title">Weekly Challenges</h2>
        <div className="challenge-card">
          <div className="challenge-header">
            <h3>Mindful Monday</h3>
            <span className="challenge-reward">+50 points</span>
          </div>
          <p className="challenge-description">
            Complete 3 meditation sessions this week
          </p>
          <div className="challenge-progress">
            <div className="challenge-bar">
              <div className="challenge-fill" style={{ width: '33%' }}></div>
            </div>
            <span className="challenge-status">1/3 completed</span>
          </div>
          {!isPremium && (
            <div className="challenge-premium">
              <span>Join Premium for exclusive challenges</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Goal Setting - Now available to all users */}
      <div className="custom-goals-section">
        <h2 className="section-title">Goal Customization</h2>
        
        <div className="custom-goals-form">
          <div className="goal-slider">
            <label>Daily Workout Goal: {customWorkoutGoal} minutes</label>
            <input 
              type="range"
              min="15"
              max="120"
              value={customWorkoutGoal}
              onChange={(e) => setCustomWorkoutGoal(parseInt(e.target.value))}
              className="goal-range"
            />
            <span>Weekly Goal: {customWorkoutGoal * 7} minutes</span>
          </div>
          
          <div className="goal-slider">
            <label>Daily Water Goal: {customWaterGoal} oz</label>
            <input 
              type="range"
              min="32"
              max="128"
              value={customWaterGoal}
              onChange={(e) => setCustomWaterGoal(parseInt(e.target.value))}
              className="goal-range"
            />
            <span>Weekly Goal: {customWaterGoal * 7} oz</span>
          </div>
          
          <div className="goal-slider">
            <label>Daily Meditation Goal: {customMeditationGoal} minutes</label>
            <input 
              type="range"
              min="5"
              max="60"
              value={customMeditationGoal}
              onChange={(e) => setCustomMeditationGoal(parseInt(e.target.value))}
              className="goal-range"
            />
            <span>Weekly Goal: {customMeditationGoal * 7} minutes</span>
          </div>
          
          <button 
            className="save-goals-btn"
            onClick={handleSaveGoals}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Custom Goals'}
          </button>
        </div>
      </div>

      {/* Diamond Achievements - Premium Only
      <div className="diamond-achievements">
        <h2 className="section-title">Diamond Achievements</h2>
        
        <PremiumGate 
          feature="exclusive diamond badges"
          className="compact"
        >
          <div className="diamond-gallery">
            <div className="achievement-card diamond">
              <div className="achievement-icon">💎</div>
              <div className="achievement-info">
                <h4>DIAMOND</h4>
                <p>WORKOUT MASTER</p>
                <span className="achievement-percentage">125%</span>
              </div>
            </div>
            
            <div className="achievement-card diamond">
              <div className="achievement-icon">💎</div>
              <div className="achievement-info">
                <h4>DIAMOND</h4>
                <p>HYDRATION HERO</p>
                <span className="achievement-percentage">150%</span>
              </div>
            </div>
          </div>
        </PremiumGate>
      </div> */}

      {/* Premium Challenges */}
      <div className="premium-challenges">
        <h2 className="section-title">Exclusive Challenges</h2>
        
        <PremiumGate 
          feature="premium challenges"
          className="feature-tease"
        >
          <div className="challenge-preview">
            <div className="challenge-card premium">
              <div className="challenge-header">
                <h3>💎 Diamond Week Challenge</h3>
                <span className="challenge-reward">+200 points</span>
              </div>
              <p>Complete 125% of all goals for 7 consecutive days</p>
              <div className="challenge-participants">
                <span>🏆 1,247 participants this week</span>
              </div>
            </div>
            
            <div className="challenge-card premium">
              <div className="challenge-header">
                <h3>🎯 Perfect Balance</h3>
                <span className="challenge-reward">+150 points</span>
              </div>
              <p>Hit exactly 100% on all three goals in one day</p>
              <div className="challenge-participants">
                <span>🎉 892 members completed</span>
              </div>
            </div>
          </div>
        </PremiumGate>
      </div>
    </div>
  );
}

export default Goals;