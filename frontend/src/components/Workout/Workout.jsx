import React, { useState, useEffect} from "react";
import { useDispatch, useSelector } from "react-redux";
import { logWorkout, fetchWorkoutsByUser, updateWorkout, deleteWorkout } from "../../store/workout";
//import Workout.css from './Workout.css';

function Workout () {
    const dispatch = useDispatch();
    const userId = useSelector((state) => state.session.user.id);
    const workouts = useSelector((state) => state.workout.sessions);
    const [formData , setFormData] = useState({
        date: '',
        durationMinutes: '',
        title: '',
    });

    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if (userId)
        dispatch(fetchWorkoutsByUser(userId));
    }, [dispatch, userId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
          ...prevData,
          [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editMode) {
            await dispatch(updateWorkout({ id: editId, ...formData }));
            setEditMode(false);
            setEditId(null);
        } else {
            await dispatch(logWorkout({ userId, ...formData }));
        }
        setFormData({
            date: '',
            durationMinutes: '',
            title: '',
        });
    };

    const handleEdit = (workout) => {
        setEditMode(true);
        setEditId(workout.id);
        setFormData({
            date: workout.date.split('T')[0],
            durationMinutes: workout.durationMinutes,
            title: workout.title,
        });
    };

    const handleDelete = (id) => {
        dispatch(deleteWorkout(id));
    }

    return (
        <div className="workout-page">
          <div className="workout-card">
            <h1 className="workout-title">Log Workout Session</h1>
            <form onSubmit={handleSubmit} className="workout-form">
              <div className="form-group">
                <label className="form-label">
                  Date
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="form-input"
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Duration (Minutes)
                  <input
                    type="number"
                    name="durationMinutes"
                    value={formData.durationMinutes}
                    onChange={handleChange}
                    className="form-input"
                  />
                </label>
              </div>
                <div className="form-group">
                    <label className="form-label">
                        Title
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </label>
                </div>
              <button type="submit" className="log-button">Log Workout</button>
            </form>
          </div>
          <div className="workout-log">
            <h2 className="log-title">Meditation Log from Today</h2>
            <ul className="log-list">
              {workouts.filter(workout => workout.date.split('T')[0] === today).map((workout) => (
                <li key={workout.id} className="log-item">
                  <span className="log-date">{workout.date.split('T')[0]}</span>
                  <span className="log-duration">{workout.durationMinutes} minutes</span>
                  <span className="log-title">{workout.title}</span>
                  <button onClick={() => handleEdit(workout)} className="edit-button">Edit</button>
                  <button onClick={() => handleDelete(workout.id)} className="delete-button">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    

export default Workout;