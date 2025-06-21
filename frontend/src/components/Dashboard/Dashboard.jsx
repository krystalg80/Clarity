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

function getRandomAffirmation() {
  const randomIndex = Math.floor(Math.random() * affirmations.length);
  return affirmations[randomIndex];
}

function Dashboard() {
  const navigate = useNavigate();
  const { user: firebaseUser, loading: authLoading } = useAuth();
  
  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [workoutSummary, setWorkoutSummary] = useState(0);
  const [meditationSummary, setMeditationSummary] = useState(0);
  const [waterIntakeSummary, setWaterIntakeSummary] = useState(0);
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

  // Data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      if (!firebaseUser?.uid) return;

      try {
        setIsLoading(true);
        
        // Fetch user profile first
        const profileResponse = await authService.getUserProfile(firebaseUser.uid);
        setUserProfile(profileResponse.user);
        
        // Set goals from profile
        setExerciseGoalMinutes(profileResponse.user.exerciseGoalMinutes || 30);
        setMeditationGoalMinutes(profileResponse.user.meditationGoalMinutes || 10);
        setWaterGoalOz(profileResponse.user.waterGoalOz || 64);
        
        // Fetch today's summaries
        const today = new Date();
        
        const [workoutData, meditationData, waterData] = await Promise.all([
          workoutService.getWorkoutSummary(firebaseUser.uid, 1), // Today only
          meditationService.getMeditationSummary(firebaseUser.uid, 1), // Today only
          waterService.getTodayWaterIntake(firebaseUser.uid)
        ]);
        
        setWorkoutSummary(workoutData.totalMinutes || 0);
        setMeditationSummary(meditationData.totalMinutes || 0);
        setWaterIntakeSummary(waterData.totalOz || 0);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // You might want to show an error message to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [firebaseUser]);

  // Affirmation effect
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

  // Loading states
  if (authLoading || isLoading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!firebaseUser) {
    return <div className="dashboard-loading">Redirecting...</div>;
  }

  if (!userProfile) {
    return <div className="dashboard-loading">Loading user data...</div>;
  }

  // Calculate progress percentages
  const workoutProgress = Math.min((workoutSummary / exerciseGoalMinutes) * 100, 100) || 0;
  const meditationProgress = Math.min((meditationSummary / meditationGoalMinutes) * 100, 100) || 0;
  const waterIntakeProgress = Math.min((waterIntakeSummary / waterGoalOz) * 100, 100) || 0;
  const remainingWorkoutMinutes = Math.max(exerciseGoalMinutes - workoutSummary, 0);

  return (
    <div className="dashboard-page">
      <div className="welcome-section">
        <h1>Welcome back, {userProfile.firstName}!</h1>
        <p>Here's your wellness progress for today</p>
      </div>

      <div className="progress-bars">
        <div className="progress-bar">
          <h2>Workout</h2>
          <p className="goal-text">Goal: {exerciseGoalMinutes} minutes</p>
          <p className="current-text">{workoutSummary} / {exerciseGoalMinutes} min</p>
          <CircularProgressbar
            value={workoutProgress}
            text={`${Math.round(workoutProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${workoutProgress / 100})`,
              textColor: '#3e98c7',
            })}
          />
          <button 
            className="track-button"
            onClick={() => navigate('/workout')}
          >
            Log Workout
          </button>
        </div>

        <div className="progress-bar">
          <h2>Meditation</h2>
          <p className="goal-text">Goal: {meditationGoalMinutes} minutes</p>
          <p className="current-text">{meditationSummary} / {meditationGoalMinutes} min</p>
          <CircularProgressbar
            value={meditationProgress}
            text={`${Math.round(meditationProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(138, 43, 226, ${meditationProgress / 100})`,
              textColor: '#8a2be2',
            })}
          />
          <button 
            className="track-button"
            onClick={() => navigate('/meditation')}
          >
            Log Meditation
          </button>
        </div>

        <div className="progress-bar">
          <h2>Water Intake</h2>
          <p className="goal-text">Goal: {waterGoalOz} oz</p>
          <p className="current-text">{waterIntakeSummary} / {waterGoalOz} oz</p>
          <CircularProgressbar
            value={waterIntakeProgress}
            text={`${Math.round(waterIntakeProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(30, 144, 255, ${waterIntakeProgress / 100})`,
              textColor: '#1e90ff',
            })}
          />
          <button 
            className="track-button"
            onClick={() => navigate('/water')}
          >
            Log Water
          </button>
        </div>
      </div>

      {remainingWorkoutMinutes > 0 && (
        <div className="notification-bar">
          <p>🔥 You are {remainingWorkoutMinutes} minutes away from your workout goal!</p>
        </div>
      )}

      {workoutProgress >= 100 && meditationProgress >= 100 && waterIntakeProgress >= 100 && (
        <div className="celebration-bar">
          <p>🎉 Congratulations! You've achieved all your wellness goals today! 🎉</p>
        </div>
      )}

      <div className="affirmation-bar">
        <p>🌸 Daily Affirmation 🌸</p>
        <h2>{affirmation}</h2>
      </div>

      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-number">{workoutSummary}</span>
          <span className="stat-label">Minutes Exercised</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{waterIntakeSummary}</span>
          <span className="stat-label">Ounces of Water</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{meditationSummary}</span>
          <span className="stat-label">Minutes Meditated</span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;