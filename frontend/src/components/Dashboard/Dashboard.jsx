import { useEffect, useState } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useNavigate } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import './Dashboard.css';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { workoutService } from '../../services/workoutService';
import { waterService } from '../../services/waterService';
import { meditationService } from '../../services/meditationService';
import affirmations from '../../data/affirmations';
import PremiumGate from '../Premium/PremiumGate';

function getRandomAffirmation() {
  const randomIndex = Math.floor(Math.random() * affirmations.length);
  return affirmations[randomIndex];
}

function Dashboard() {
  const navigate = useNavigate();
  const { user: firebaseUser, loading: authLoading, isPremium } = useAuth();
  
  // State management - Updated for daily data
  const [userProfile, setUserProfile] = useState(null);
  const [dailyData, setDailyData] = useState({
    workout: { totalMinutes: 0, sessions: 0, hasWorkoutsToday: false },
    meditation: { totalMinutes: 0, sessions: 0, hasSessionsToday: false, deepStateAchieved: 0 },
    water: { totalOz: 0, entries: 0, hasWaterToday: false }
  });
  const [exerciseGoalMinutes, setExerciseGoalMinutes] = useState(30);
  const [meditationGoalMinutes, setMeditationGoalMinutes] = useState(10);
  const [waterGoalOz, setWaterGoalOz] = useState(64);
  const [affirmation, setAffirmation] = useState(getRandomAffirmation());
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      navigate('/welcome', { replace: true });
      return;
    }
  }, [firebaseUser, authLoading, navigate]);

  // Updated data fetching effect for DAILY data
  useEffect(() => {
    const fetchDailyData = async () => {
      if (!firebaseUser?.uid) return;

      try {
        setIsLoading(true);
        
        console.log('🔍 Fetching daily data for user:', firebaseUser.uid);
        console.log('📅 Today date:', new Date());
        
        // Fetch user profile first
        const profileResponse = await authService.getUserProfile(firebaseUser.uid);
        setUserProfile(profileResponse.user);
        
        // Set goals from profile
        setExerciseGoalMinutes(profileResponse.user.exerciseGoalMinutes || 30);
        setMeditationGoalMinutes(profileResponse.user.meditationGoalMinutes || 10);
        setWaterGoalOz(profileResponse.user.waterGoalOz || 64);
        
        // Fetch TODAY'S data using daily functions
        const today = new Date();
        console.log('📊 Fetching workout data for date:', today);
        
        const [workoutData, meditationData, waterData] = await Promise.all([
          workoutService.getDailyWorkoutSummary(firebaseUser.uid, today),
          meditationService.getDailyMeditationSummary(firebaseUser.uid, today),
          waterService.getWaterSummary ? 
            waterService.getWaterSummary(firebaseUser.uid, 1) : 
            waterService.getWeeklyWaterIntake?.(firebaseUser.uid)
        ]);
        
        console.log('📊 Raw workout data from Dashboard:', workoutData);
        console.log('🧘 Raw meditation data:', meditationData);
        console.log('💧 Raw water data:', waterData);
        
        // Set daily data with proper field mapping
        setDailyData({
          workout: {
            totalMinutes: workoutData.totalMinutes || 0,
            sessions: workoutData.totalWorkouts || 0, // Use totalWorkouts field
            hasWorkoutsToday: workoutData.hasWorkoutsToday || (workoutData.totalMinutes > 0),
            calories: workoutData.caloriesBurned || 0,
            lastWorkoutType: workoutData.mostCommonType
          },
          meditation: {
            totalMinutes: meditationData.totalMinutes || 0,
            sessions: meditationData.totalSessions || 0,
            hasSessionsToday: meditationData.hasSessionsToday || false,
            deepStateAchieved: meditationData.deepStateAchieved || 0,
            moodImprovement: meditationData.moodImprovement || 0,
            lastSessionType: meditationData.mostRecentType
          },
          water: {
            totalOz: waterData.totalOz || 0,
            entries: waterData.totalEntries || waterData.entries || 0,
            hasWaterToday: (waterData.totalOz || 0) > 0,
            averagePerEntry: waterData.averagePerEntry || 0,
            isOnTrack: (waterData.totalOz || 0) >= (waterGoalOz * 0.75)
          }
        });
        
      } catch (error) {
        console.error('Error fetching daily data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDailyData();
  }, [firebaseUser]);

  // Affirmation effect (unchanged)
  useEffect(() => {
    const storedAffirmation = localStorage.getItem('affirmation');
    const storedDate = localStorage.getItem('affirmationDate');
    const today = new Date().toISOString().split('T')[0];

    if (storedAffirmation && storedDate === today) {
      setAffirmation(storedAffirmation);
    } else {
      const newAffirmation = getRandomAffirmation();
      setAffirmation(newAffirmation);
      localStorage.setItem('affirmation', newAffirmation);
      localStorage.setItem('affirmationDate', today);
    }
  }, []);

  // Loading states (unchanged)
  if (authLoading || isLoading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!firebaseUser) {
    return <div className="dashboard-loading">Redirecting...</div>;
  }

  if (!userProfile) {
    return <div className="dashboard-loading">Loading user data...</div>;
  }

  // Calculate progress percentages using daily data
  const workoutProgress = Math.min((dailyData.workout.totalMinutes / exerciseGoalMinutes) * 100, 100) || 0;
  const meditationProgress = Math.min((dailyData.meditation.totalMinutes / meditationGoalMinutes) * 100, 100) || 0;
  const waterIntakeProgress = Math.min((dailyData.water.totalOz / waterGoalOz) * 100, 100) || 0;
  const remainingWorkoutMinutes = Math.max(exerciseGoalMinutes - dailyData.workout.totalMinutes, 0);

  return (
    <div className="dashboard-page">
      {/* Updated welcome section with today's focus */}
      <div className="welcome-section">
        <h1>Welcome back, {userProfile.firstName}!</h1>
        <p>Here's your wellness progress for today</p>
        <div className="today-date">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Updated progress bars with enhanced daily info */}
      <div className="progress-bars">
        <div className="progress-bar">
          <h2>💪 Today's Workout</h2>
          <p className="goal-text">Daily Goal: {exerciseGoalMinutes} minutes</p>
          <p className="current-text">{dailyData.workout.totalMinutes} / {exerciseGoalMinutes} min</p>
          <CircularProgressbar
            value={workoutProgress}
            text={`${Math.round(workoutProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${workoutProgress / 100})`,
              textColor: '#3e98c7',
            })}
          />
          <div className="daily-stats">
            {dailyData.workout.hasWorkoutsToday ? (
              <span>✅ {dailyData.workout.sessions} workouts logged</span>
            ) : (
              <span>No workouts logged today</span>
            )}
          </div>
          <button 
            className="track-button"
            onClick={() => navigate('/workout')}
          >
            Log Workout
          </button>
        </div>

        <div className="progress-bar">
          <h2>🧘‍♀️ Today's Meditation</h2>
          <p className="goal-text">Daily Goal: {meditationGoalMinutes} minutes</p>
          <p className="current-text">{dailyData.meditation.totalMinutes} / {meditationGoalMinutes} min</p>
          <CircularProgressbar
            value={meditationProgress}
            text={`${Math.round(meditationProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(138, 43, 226, ${meditationProgress / 100})`,
              textColor: '#8a2be2',
            })}
          />
          <div className="daily-stats">
            {dailyData.meditation.hasSessionsToday ? (
              <span>✅ {dailyData.meditation.sessions} sessions completed</span>
            ) : (
              <span>No meditation logged today</span>
            )}
            {dailyData.meditation.deepStateAchieved > 0 && (
              <span className="deep-state">🌟 {dailyData.meditation.deepStateAchieved} deep states</span>
            )}
          </div>
          <button 
            className="track-button"
            onClick={() => navigate('/meditation')}
          >
            Start Meditation
          </button>
        </div>

        <div className="progress-bar">
          <h2>💧 Today's Hydration</h2>
          <p className="goal-text">Daily Goal: {waterGoalOz} oz</p>
          <p className="current-text">{dailyData.water.totalOz} / {waterGoalOz} oz</p>
          <CircularProgressbar
            value={waterIntakeProgress}
            text={`${Math.round(waterIntakeProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(30, 144, 255, ${waterIntakeProgress / 100})`,
              textColor: '#1e90ff',
            })}
          />
          <div className="daily-stats">
            {dailyData.water.hasWaterToday ? (
              <span>✅ {dailyData.water.entries} water entries</span>
            ) : (
              <span>No water logged today</span>
            )}
            {dailyData.water.isOnTrack && (
              <span className="on-track">🎯 On track for hydration!</span>
            )}
          </div>
          <button 
            className="track-button"
            onClick={() => navigate('/water')}
          >
            Log Water
          </button>
        </div>
      </div>

      {/* Updated notification bars */}
      {remainingWorkoutMinutes > 0 && (
        <div className="notification-bar">
          <p>🔥 You are {remainingWorkoutMinutes} minutes away from your daily workout goal!</p>
        </div>
      )}

      {workoutProgress >= 100 && meditationProgress >= 100 && waterIntakeProgress >= 100 && (
        <div className="celebration-bar">
          <p>🎉 Congratulations! You've achieved all your daily wellness goals! 🎉</p>
        </div>
      )}

      {/* Daily affirmation (unchanged) */}
      <div className="affirmation-bar">
        <p>🌸 Daily Affirmation 🌸</p>
        <h2>{affirmation}</h2>
      </div>

      {/* Updated quick stats for today */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-number">{dailyData.workout.totalMinutes}</span>
          <span className="stat-label">Minutes Exercised Today</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{dailyData.water.totalOz}</span>
          <span className="stat-label">Ounces of Water Today</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{dailyData.meditation.totalMinutes}</span>
          <span className="stat-label">Minutes Meditated Today</span>
        </div>
      </div>

      {/* Enhanced premium analytics section */}
      {isPremium ? (
        <div className="premium-analytics">
          <h2>
            Advanced Analytics
            <span className="analytics-premium-badge">Premium</span>
          </h2>
          
          <div className="analytics-preview">
            <div className="chart-preview">
              <h3>📊 Daily Trends</h3>
              <div className="mock-chart">
                <div className="chart-bars">
                  <div className="bar" style={{height: '60%'}} data-value="18 min"></div>
                  <div className="bar" style={{height: '80%'}} data-value="24 min"></div>
                  <div className="bar" style={{height: '95%'}} data-value="29 min"></div>
                  <div className="bar" style={{height: '70%'}} data-value="21 min"></div>
                  <div className="bar" style={{height: '90%'}} data-value="27 min"></div>
                  <div className="bar" style={{height: '100%'}} data-value="30 min"></div>
                  <div className="bar" style={{height: '85%'}} data-value="26 min"></div>
                </div>
              </div>
            </div>
            
            <div className="insights-preview">
              <h3>🧠 AI Insights</h3>
              <div className="insight-card">
                <p>"Your best workout days are Mondays and Wednesdays. Consider scheduling important sessions then."</p>
              </div>
              <div className="insight-card">
                <p>"You're 23% more likely to complete meditation after morning workouts."</p>
              </div>
              <div className="insight-card">
                <p>"Your hydration peaks correlate with 15% better focus during meditation sessions."</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="premium-analytics">
          <h2>Advanced Analytics</h2>
          
          <PremiumGate 
            feature="detailed insights and trends"
            className="feature-tease"
          >
            <div className="analytics-preview">
              <div className="chart-preview">
                <h3>📊 Daily Trends</h3>
                <div className="mock-chart">
                  <div className="chart-bars">
                    <div className="bar" style={{height: '60%'}}></div>
                    <div className="bar" style={{height: '80%'}}></div>
                    <div className="bar" style={{height: '95%'}}></div>
                    <div className="bar" style={{height: '70%'}}></div>
                    <div className="bar" style={{height: '90%'}}></div>
                    <div className="bar" style={{height: '100%'}}></div>
                    <div className="bar" style={{height: '85%'}}></div>
                  </div>
                </div>
              </div>
              
              <div className="insights-preview">
                <h3>🧠 AI Insights</h3>
                <div className="insight-card">
                  <p>"Your best workout days are Mondays and Wednesdays. Consider scheduling important sessions then."</p>
                </div>
                <div className="insight-card">
                  <p>"You're 23% more likely to complete meditation after morning workouts."</p>
                </div>
              </div>
            </div>
          </PremiumGate>
        </div>
      )}
    </div>
  );
}

export default Dashboard;