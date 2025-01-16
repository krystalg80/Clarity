import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './Dashboard.css';
import { fetchUserProfile } from '../../store/profile';
import { fetchWorkoutSummary, fetchMeditationSummary, fetchWaterIntakeSummary, setUserGoals } from '../../store/summary';

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

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (user) {
      dispatch(setUserGoals({
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        meditationGoalMinutes: user.meditationGoalMinutes,
        waterGoalOz: user.waterGoalOz
      }));

      const today = new Date().toISOString().split('T')[0];
      dispatch(fetchWorkoutSummary({ userId, date: today }));
      dispatch(fetchMeditationSummary({ userId, date: today }));
      dispatch(fetchWaterIntakeSummary({ userId, date: today }));
    }
  }, [dispatch, user, userId]);

  const workoutProgress = (workoutSummary / exerciseGoalMinutes) * 100;
  const meditationProgress = (meditationSummary / meditationGoalMinutes) * 100;
  const waterIntakeProgress = (waterIntakeSummary / waterGoalOz) * 100;

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      <div className="progress-bars">
        <div className="progress-bar">
          <h2>Workout</h2>
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
    </div>
  );
}

export default Dashboard;