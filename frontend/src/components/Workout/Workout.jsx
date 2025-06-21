import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { workoutService } from "../../services/workoutService";
import './Workout.css';

function Workout() {
    const { user: firebaseUser } = useAuth();
    const [workouts, setWorkouts] = useState([]);
    const [formData, setFormData] = useState({
        date: '',
        durationMinutes: '',
        title: '',
        type: 'General', // New field for workout type
        notes: '', // New field for notes
        caloriesBurned: '' // New field for calories
    });
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const today = new Date().toISOString().split('T')[0];

    // Fetch workouts on component mount
    useEffect(() => {
        const fetchWorkouts = async () => {
            if (!firebaseUser?.uid) return;
            
            try {
                setIsLoading(true);
                const response = await workoutService.fetchWorkoutsByUser(firebaseUser.uid);
                setWorkouts(response.workouts || []);
            } catch (error) {
                console.error('Error fetching workouts:', error);
                setError('Failed to load workouts');
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkouts();
    }, [firebaseUser]);

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

        try {
            if (editMode) {
                // Update existing workout
                await workoutService.updateWorkout(firebaseUser.uid, editId, {
                    ...formData,
                    durationMinutes: parseInt(formData.durationMinutes),
                    caloriesBurned: parseInt(formData.caloriesBurned) || 0
                });
                
                // Update local state
                setWorkouts(prev => prev.map(workout => 
                    workout.id === editId 
                        ? { ...workout, ...formData, durationMinutes: parseInt(formData.durationMinutes) }
                        : workout
                ));
                
                setEditMode(false);
                setEditId(null);
            } else {
                // Create new workout
                const response = await workoutService.logWorkout(firebaseUser.uid, {
                    ...formData,
                    durationMinutes: parseInt(formData.durationMinutes),
                    caloriesBurned: parseInt(formData.caloriesBurned) || 0
                });
                
                // Add to local state
                setWorkouts(prev => [response.workout, ...prev]);
            }
            
            // Reset form
            setFormData({
                date: '',
                durationMinutes: '',
                title: '',
                type: 'General',
                notes: '',
                caloriesBurned: ''
            });
            
        } catch (error) {
            console.error('Error saving workout:', error);
            setError(editMode ? 'Failed to update workout' : 'Failed to log workout');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (workout) => {
        setEditMode(true);
        setEditId(workout.id);
        
        // Convert date to proper format for input
        const workoutDate = workout.date instanceof Date 
            ? workout.date.toISOString().split('T')[0]
            : new Date(workout.date).toISOString().split('T')[0];
            
        setFormData({
            date: workoutDate,
            durationMinutes: workout.durationMinutes?.toString() || '',
            title: workout.title || '',
            type: workout.type || 'General',
            notes: workout.notes || '',
            caloriesBurned: workout.caloriesBurned?.toString() || ''
        });
    };

    const handleDelete = async (id) => {
        if (!firebaseUser?.uid) return;
        
        if (window.confirm('Are you sure you want to delete this workout?')) {
            try {
                await workoutService.deleteWorkout(firebaseUser.uid, id);
                setWorkouts(prev => prev.filter(workout => workout.id !== id));
            } catch (error) {
                console.error('Error deleting workout:', error);
                setError('Failed to delete workout');
            }
        }
    };

    const cancelEdit = () => {
        setEditMode(false);
        setEditId(null);
        setFormData({
            date: '',
            durationMinutes: '',
            title: '',
            type: 'General',
            notes: '',
            caloriesBurned: ''
        });
    };

    // Filter today's workouts
    const todayWorkouts = workouts.filter(workout => {
        const workoutDate = workout.date instanceof Date 
            ? workout.date.toISOString().split('T')[0]
            : new Date(workout.date).toISOString().split('T')[0];
        return workoutDate === today;
    });

    if (isLoading) {
        return <div className="workout-loading">Loading workouts...</div>;
    }

    return (
        <div className="workout-page">
            <div className="workout-card">
                <h1 className="workout-title">
                    {editMode ? 'Edit Workout Session' : 'Log Workout Session'}
                </h1>
                
                {error && <div className="error-message">{error}</div>}
                
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
                                required
                            />
                        </label>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">
                            Workout Title
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., Morning Run, Gym Session"
                                required
                            />
                        </label>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">
                            Workout Type
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                className="form-input"
                            >
                                <option value="General">General</option>
                                <option value="Cardio">Cardio</option>
                                <option value="Strength">Strength Training</option>
                                <option value="Yoga">Yoga</option>
                                <option value="Running">Running</option>
                                <option value="Cycling">Cycling</option>
                                <option value="Swimming">Swimming</option>
                                <option value="Walking">Walking</option>
                                <option value="HIIT">HIIT</option>
                                <option value="Other">Other</option>
                            </select>
                        </label>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                Duration / Length (Minutes)
                                <input
                                    type="number"
                                    name="durationMinutes"
                                    value={formData.durationMinutes}
                                    onChange={handleChange}
                                    className="form-input"
                                    min="1"
                                    required
                                />
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">
                                Calories Burned (Optional)
                                <input
                                    type="number"
                                    name="caloriesBurned"
                                    value={formData.caloriesBurned}
                                    onChange={handleChange}
                                    className="form-input"
                                    min="0"
                                    placeholder="0"
                                />
                            </label>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">
                            Notes (Optional)
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="form-input form-textarea"
                                placeholder="How did it feel? Any achievements?"
                                rows="3"
                            />
                        </label>
                    </div>
                    
                    <div className="form-buttons">
                        <button 
                            type="submit" 
                            className="log-button"
                            disabled={isSubmitting}
                        >
                            {isSubmitting 
                                ? (editMode ? 'Updating...' : 'Logging...') 
                                : (editMode ? 'Update Workout' : 'Log Workout')
                            }
                        </button>
                        
                        {editMode && (
                            <button 
                                type="button" 
                                className="cancel-button"
                                onClick={cancelEdit}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
            
            <div className="workout-log">
                <h2 className="log-title">Today's Workouts ({todayWorkouts.length})</h2>
                
                {todayWorkouts.length === 0 ? (
                    <p className="no-workouts">No workouts logged for today. Start your fitness journey!</p>
                ) : (
                    <ul className="log-list">
                        {todayWorkouts.map((workout) => (
                            <li key={workout.id} className="log-item">
                                <div className="workout-info">
                                    <span className="workout-title-display">{workout.title}</span>
                                    <span className="workout-type">{workout.type}</span>
                                    <span className="workout-duration">{workout.durationMinutes} min</span>
                                    {workout.caloriesBurned > 0 && (
                                        <span className="workout-calories">{workout.caloriesBurned} cal</span>
                                    )}
                                    {workout.notes && (
                                        <span className="workout-notes">{workout.notes}</span>
                                    )}
                                </div>
                                <div className="workout-actions">
                                    <button 
                                        onClick={() => handleEdit(workout)} 
                                        className="edit-button"
                                        disabled={isSubmitting}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(workout.id)} 
                                        className="delete-button"
                                        disabled={isSubmitting}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Workout;