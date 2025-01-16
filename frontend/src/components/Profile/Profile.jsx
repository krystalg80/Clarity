import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, updateUserProfile } from '../../store/profile';
import './Profile.css';

function Profile() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.profile.user);
  const userId = useSelector((state) => state.session.user.id);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    exerciseGoalMinutes: '',
    waterGoalOz: '',
    meditationGoalMinutes: ''
  });

  useEffect(() => {
    if (userId) {
      dispatch(fetchUserProfile(userId));
    }
  }, [dispatch, userId]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        exerciseGoalMinutes: user.exerciseGoalMinutes,
        waterGoalOz: user.waterGoalOz,
        meditationGoalMinutes: user.meditationGoalMinutes
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

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(updateUserProfile({ userId, profileData: formData }));
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h1 className="profile-title">Personal Information</h1>
        {user && (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label className="form-label">
                Username
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
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
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                First Name
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
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
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                Exercise Goal (Minutes)
                <input
                  type="number"
                  name="exerciseGoalMinutes"
                  value={formData.exerciseGoalMinutes}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                Water Goal (Oz)
                <input
                  type="number"
                  name="waterGoalOz"
                  value={formData.waterGoalOz}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                Meditation Goal (Minutes)
                <input
                  type="number"
                  name="meditationGoalMinutes"
                  value={formData.meditationGoalMinutes}
                  onChange={handleChange}
                  className="form-input"
                />
              </label>
            </div>

            <button type="submit" className="save-button">Save Profile</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Profile;