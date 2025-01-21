import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useNavigate } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import './Dashboard.css';
import { fetchUserProfile } from '../../store/profile';
import { fetchWorkoutSummary, fetchMeditationSummary, fetchWaterIntakeSummary, setUserGoals } from '../../store/summary';
import affirmations from '../../data/affirmations';
import { fetchMeditationsByUser } from '../../store/meditation';

function getRandomAffirmation() {
  const randomIndex = Math.floor(Math.random() * affirmations.length);
  return affirmations[randomIndex];
}

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sessionUser = useSelector(state => state.session?.user);
  const user = useSelector((state) => state.profile.user);
  const userId = sessionUser?.id;
  const workoutSummary = useSelector((state) => state.summary.workout ?? 0);
  const meditationSummary = useSelector((state) => state.summary.meditation ?? 0);
  const waterIntakeSummary = useSelector((state) => state.summary.waterIntake ?? 0);
  const exerciseGoalMinutes = useSelector((state) => state.summary.exerciseGoalMinutes ?? 0);
  const meditationGoalMinutes = useSelector((state) => state.summary.meditationGoalMinutes ?? 0);
  const waterGoalOz = useSelector((state) => state.summary.waterGoalOz ?? 0);
  
  const [affirmation, setAffirmation] = useState(getRandomAffirmation());
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if no user is logged in
  useEffect(() => {
    if (userId === null) {
      navigate('/welcome');
    }
  }, [userId, navigate]);
  // Redirect if no user is logged in
  useEffect(() => {
    if (!sessionUser) {
      navigate('/welcome');
    }
  }, [sessionUser, navigate]);

  // Only proceed with data fetching if we have a session user
  useEffect(() => {
    if (sessionUser?.id) {
      setIsLoading(true);
      dispatch(fetchUserProfile(sessionUser.id))
        .finally(() => setIsLoading(false));
    }
  }, [dispatch, sessionUser]);

  useEffect(() => {
    if (user && sessionUser?.id) {
      const today = new Date().toISOString().split('T')[0];

      dispatch(setUserGoals({
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        meditationGoalMinutes: user.meditationGoalMinutes,
        waterGoalOz: user.waterGoalOz
      }));

      const fetchData = async () => {
        try {
          await Promise.all([
            dispatch(fetchMeditationsByUser(sessionUser.id)),
            dispatch(fetchMeditationSummary({ userId: sessionUser.id, date: today })),
            dispatch(fetchWorkoutSummary({ userId: sessionUser.id, date: today })),
            dispatch(fetchWaterIntakeSummary({ userId: sessionUser.id, date: today }))
          ]);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };

      fetchData();
    }
  }, [dispatch, user, sessionUser]);

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

  if (isLoading || !sessionUser) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  const workoutProgress = (workoutSummary / exerciseGoalMinutes) * 100 || 0;
  const meditationProgress = (meditationSummary / meditationGoalMinutes) * 100 || 0;
  const waterIntakeProgress = (waterIntakeSummary / waterGoalOz) * 100 || 0;
  const remainingWorkoutMinutes = exerciseGoalMinutes - workoutSummary;

  return (
    <div className="dashboard-page">
      <div className="progress-bars">
        <div className="progress-bar">
          <h2>Workout</h2>
          <p className="goal-text">Goal: {exerciseGoalMinutes} minutes</p>
          <CircularProgressbar
            value={workoutProgress}
            text={`${Math.round(workoutProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${workoutProgress / 100})`,
              textColor: '#3e98c7',
            })}
          />
        </div>
        <div className="progress-bar">
          <h2>Meditation</h2>
          <p className="goal-text">Goal: {meditationGoalMinutes} minutes</p>
          <CircularProgressbar
            value={meditationProgress}
            text={`${Math.round(meditationProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${meditationProgress / 100})`,
              textColor: '#3e98c7',
            })}
          />
        </div>
        <div className="progress-bar">
          <h2>Water Intake</h2>
          <p className="goal-text">Goal: {waterGoalOz} Ozs</p>
          <CircularProgressbar
            value={waterIntakeProgress}
            text={`${Math.round(waterIntakeProgress)}%`}
            styles={buildStyles({
              pathColor: `rgba(62, 152, 199, ${waterIntakeProgress / 100})`,
              textColor: '#3e98c7',
            })}
          />
        </div>
      </div>
      {remainingWorkoutMinutes > 0 && (
        <div className="notification-bar">
          <p> 🔥 You are {remainingWorkoutMinutes} minutes away from your workout goal!</p>
        </div>
      )}
      <div className="affirmation-bar">
        <p>🌸 Daily Affirmation 🌸</p>
        <h2>{affirmation}</h2>
      </div>
    </div>
  );
}

export default Dashboard;