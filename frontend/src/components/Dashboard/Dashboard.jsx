import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './Dashboard.css';
import { fetchUserProfile } from '../../store/profile';
import { fetchWorkoutSummary, fetchMeditationSummary, fetchWaterIntakeSummary, setUserGoals } from '../../store/summary';
import affirmations from '../../data/affirmations';
import { fetchMeditationsByUser } from '../../store/meditation';


//lets make a generate random affirmation function
function getRandomAffirmation() {
  const randomIndex = Math.floor(Math.random() * affirmations.length);
  return affirmations[randomIndex];
}


function Dashboard() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.profile.user);
  const userId = useSelector((state) => state.session.user.id);
  const workoutSummary = useSelector((state) => state.summary.workout);
  const meditationSummary = useSelector((state) => state.summary.meditation);
  const waterIntakeSummary = useSelector((state) => state.summary.waterIntake);
  const exerciseGoalMinutes = useSelector((state) => state.summary.exerciseGoalMinutes);
  const meditationGoalMinutes = useSelector((state) => state.summary.meditationGoalMinutes);
  const waterGoalOz = useSelector((state) => state.summary.waterGoalOz);

  const [affirmation, setAffirmation] = useState(getRandomAffirmation());


  console.log('waterIntakeSummary:', waterIntakeSummary, 'Type:', typeof waterIntakeSummary);
  console.log('waterGoalOz:', waterGoalOz, 'Type:', typeof waterGoalOz);

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (user) {
      const today = new Date().toISOString().split('T')[0];

      dispatch(setUserGoals({
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        meditationGoalMinutes: user.meditationGoalMinutes,
        waterGoalOz: user.waterGoalOz
      }));

      const fetchData = async () => {
        try {
          console.log('Fetching meditation data...');
          await dispatch(fetchMeditationsByUser(userId));
          
          console.log('Meditations fetched, now fetching summary...');
          const summaryResult = await dispatch(fetchMeditationSummary({ userId, date: today }));
          console.log('Meditation summary response:', summaryResult.payload);
          
          if (summaryResult.payload === null) {
            console.error('Meditation summary is null. Current Redux state:', {
              userId,
              date: today,
              meditationSummary: summaryResult.payload
            });
          }
        } catch (error) {
          console.error('Error fetching meditation data:', error);
        }
      };

      fetchData();
      dispatch(fetchWorkoutSummary({ userId, date: today }));
      dispatch(fetchWaterIntakeSummary({ userId, date: today }));
    }
  }, [dispatch, user, userId]);


  //add affirmation generator
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

  const workoutProgress = (workoutSummary / exerciseGoalMinutes) * 100;
  const meditationProgress = (meditationSummary / meditationGoalMinutes) * 100;
  const waterIntakeProgress = (waterIntakeSummary / waterGoalOz) * 100;

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
          <p className="goal-text">Goal: {waterGoalOz} Oz's</p>
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