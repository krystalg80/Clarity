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
import timezoneUtils from '../../utils/timezone';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";

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
  const [showTrialModal, setShowTrialModal] = useState(false);

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
        
        // Get today in user's local timezone
        const today = timezoneUtils.getCurrentLocalTime();
        console.log('🌍 Dashboard timezone:', timezoneUtils.getUserTimezone());
        console.log('📅 Local today:', timezoneUtils.formatLocalDateTime(today));
        
        // Fetch user profile first
        const profileResponse = await authService.getUserProfile(firebaseUser.uid);
        setUserProfile(profileResponse.user);
        
        // Set goals from profile
        setExerciseGoalMinutes(profileResponse.user.exerciseGoalMinutes || 30);
        setMeditationGoalMinutes(profileResponse.user.meditationGoalMinutes || 10);
        setWaterGoalOz(profileResponse.user.waterGoalOz || 64);
        
        // Fetch TODAY'S data using daily functions
        console.log('📊 Fetching workout data for date:', today);
        
        const [workoutData, meditationData, waterData] = await Promise.all([
          workoutService.getDailyWorkoutSummary(firebaseUser.uid, today),
          meditationService.getDailyMeditationSummary(firebaseUser.uid, today),
          waterService.getDailyWaterIntake(firebaseUser.uid, today)
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

  // Trial modal logic
  useEffect(() => {
    console.log("Trial modal effect running", userProfile);
    if (
      userProfile &&
      userProfile.subscriptionStatus === "trial_expired" &&
      userProfile.subscription === "free"
    ) {
      const dontRemind = localStorage.getItem("dontRemindTrial");
      const lastReminded = localStorage.getItem("lastTrialReminded");
      console.log("dontRemindTrial:", dontRemind);
      console.log("lastTrialReminded:", lastReminded);
      const oneWeek = 1000 * 60 * 60 * 24 * 7;
      const now = Date.now();

      if (!dontRemind) {
        if (!lastReminded || now - Number(lastReminded) > oneWeek) {
          setShowTrialModal(true);
          localStorage.setItem("lastTrialReminded", now);
          console.log("Showing trial modal!");
        }
      }
    }
  }, [userProfile]);

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
  const showTrialEndedBanner =
    userProfile.subscriptionStatus === "trial_expired" &&
    userProfile.subscription === "free";

  return (
    <div className="dashboard-page">
      {/* Updated welcome section with today's focus */}
      <div className="welcome-section">
        <h1>Welcome back, {userProfile.firstName}!</h1>
        <p>Here's your wellness progress for today</p>
        {/* <div className="today-date">
          {timezoneUtils.formatLocalDateTime(new Date())}
          <br />
          <small>({timezoneUtils.getUserTimezone()})</small>
        </div> */}
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
              pathColor: `rgba(62, 152, 199, ${Math.max(workoutProgress / 100, 0.3)})`,
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

      {/* AI Analytics Coming Soon Section */}
      <div className="ai-analytics-coming-soon">
        <h2>
          🤖 AI Analytics
          <span className="coming-soon-badge">Coming Soon</span>
        </h2>
        
        <div className="coming-soon-preview">
          <div className="preview-content">
            <div className="ai-features-grid">
              <div className="ai-feature-card">
                <div className="feature-icon">🧠</div>
                <h3>Smart Insights</h3>
                <p>AI-powered analysis of your wellness patterns and personalized recommendations</p>
              </div>
              
              <div className="ai-feature-card">
                <div className="feature-icon">📈</div>
                <h3>Predictive Analytics</h3>
                <p>Forecast your progress and identify optimal times for workouts and meditation</p>
              </div>
              
              <div className="ai-feature-card">
                <div className="feature-icon">🎯</div>
                <h3>Goal Optimization</h3>
                <p>AI-suggested goal adjustments based on your lifestyle and progress patterns</p>
              </div>
              
              <div className="ai-feature-card">
                <div className="feature-icon">💡</div>
                <h3>Habit Coaching</h3>
                <p>Intelligent recommendations to build sustainable wellness habits</p>
              </div>
            </div>
            
            <div className="coming-soon-mockup">
              <div className="mockup-header">
                <span className="mockup-title">AI Wellness Coach</span>
                <div className="mockup-status">
                  <span className="status-dot"></span>
                  Analyzing your data...
                </div>
              </div>
              
              <div className="mockup-content">
                <div className="ai-message">
                  <div className="ai-avatar">🤖</div>
                  <div className="message-bubble">
                    "Based on your patterns, I recommend meditating at 7 AM on weekdays for optimal results. You're 40% more consistent during morning sessions."
                  </div>
                </div>
                
                <div className="insight-preview">
                  <div className="insight-item">
                    <span className="insight-icon">⚡</span>
                    <span>Peak energy time: 9:30 AM</span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">🧘</span>
                    <span>Best meditation window: 7-8 AM</span>
                  </div>
                  <div className="insight-item">
                    <span className="insight-icon">💧</span>
                    <span>Hydration reminder: Every 2 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="coming-soon-cta">
            <h3>Be the first to know!</h3>
            <p>AI Analytics will be powered by advanced machine learning to provide personalized wellness insights.</p>
            <div className="tech-stack">
              <span className="tech-badge">AWS SageMaker</span>
              <span className="tech-badge">Machine Learning</span>
              <span className="tech-badge">Predictive Analytics</span>
            </div>
            <button className="notify-button" disabled>
              <span className="button-icon">🔔</span>
              Notify Me When Available
            </button>
          </div>
        </div>
      </div> {/* End of .ai-analytics-coming-soon */}

      {showTrialModal && (
        <div className="trial-modal-overlay">
          <div className="trial-modal">
            <h2>Your free trial has ended</h2>
            <p>Upgrade to keep enjoying premium features!</p>
            <button
              className="primary-button"
              onClick={async () => {
                const functions = getFunctions();
                const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
                const user = getAuth().currentUser;
                const result = await createSession({ uid: user.uid });
                window.location.href = result.data.url;
              }}
            >
              Upgrade with Stripe
            </button>
            <div className="trial-modal-actions">
              <button
                className="secondary-button"
                onClick={() => setShowTrialModal(false)}
              >
                Remind me later
              </button>
              <button
                className="link-button"
                onClick={() => {
                  localStorage.setItem("dontRemindTrial", "true");
                  setShowTrialModal(false);
                }}
              >
                Don't remind me again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;