import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { waterService } from "../../services/waterService";
import './Water.css';

function Water() {
    const { user: firebaseUser } = useAuth();
    const [waters, setWaters] = useState([]);
    const [formData, setFormData] = useState({
        date: '',
        amount: '', // Changed from waterConsumedOz to amount for consistency
        type: 'water', // New field for drink type
        notes: '' // New field for notes
    });
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [todayTotal, setTodayTotal] = useState(0);
    const [userGoal, setUserGoal] = useState(64);

    const today = new Date().toISOString().split('T')[0];

    // Fetch water intake and user goal on component mount
    useEffect(() => {
        const fetchData = async () => {
            if (!firebaseUser?.uid) return;
            
            try {
                setIsLoading(true);
                
                // Fetch water intake history
                const response = await waterService.fetchWaterIntakeByUser(firebaseUser.uid);
                setWaters(response.waterIntakes || []);
                
                // Fetch today's total
                const todayResponse = await waterService.getTodayWaterIntake(firebaseUser.uid);
                setTodayTotal(todayResponse.totalOz || 0);
                
                // Get user goal from profile (you might want to fetch this from authService)
                // For now, we'll use a default of 64oz
                setUserGoal(64);
                
            } catch (error) {
                console.error('Error fetching water data:', error);
                setError('Failed to load water intake data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
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
                // Update existing water intake
                await waterService.updateWaterIntake(firebaseUser.uid, editId, {
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                
                // Update local state
                setWaters(prev => prev.map(water => 
                    water.id === editId 
                        ? { ...water, ...formData, amount: parseFloat(formData.amount) }
                        : water
                ));
                
                setEditMode(false);
                setEditId(null);
            } else {
                // Create new water intake
                const response = await waterService.logWaterIntake(firebaseUser.uid, {
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                
                // Add to local state
                setWaters(prev => [response.waterIntake, ...prev]);
            }
            
            // Recalculate today's total
            const updatedTodayResponse = await waterService.getTodayWaterIntake(firebaseUser.uid);
            setTodayTotal(updatedTodayResponse.totalOz || 0);
            
            // Reset form
            setFormData({
                date: '',
                amount: '',
                type: 'water',
                notes: ''
            });
            
        } catch (error) {
            console.error('Error saving water intake:', error);
            setError(editMode ? 'Failed to update water intake' : 'Failed to log water intake');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (water) => {
        setEditMode(true);
        setEditId(water.id);
        
        // Convert date to proper format for input
        const waterDate = water.date instanceof Date 
            ? water.date.toISOString().split('T')[0]
            : new Date(water.date).toISOString().split('T')[0];
            
        setFormData({
            date: waterDate,
            amount: water.amount?.toString() || '',
            type: water.type || 'water',
            notes: water.notes || ''
        });
    };

    const handleDelete = async (id) => {
        if (!firebaseUser?.uid) return;
        
        if (window.confirm('Are you sure you want to delete this water intake?')) {
            try {
                await waterService.deleteWaterIntake(firebaseUser.uid, id);
                setWaters(prev => prev.filter(water => water.id !== id));
                
                // Recalculate today's total
                const updatedTodayResponse = await waterService.getTodayWaterIntake(firebaseUser.uid);
                setTodayTotal(updatedTodayResponse.totalOz || 0);
                
            } catch (error) {
                console.error('Error deleting water intake:', error);
                setError('Failed to delete water intake');
            }
        }
    };

    const cancelEdit = () => {
        setEditMode(false);
        setEditId(null);
        setFormData({
            date: '',
            amount: '',
            type: 'water',
            notes: ''
        });
    };

    // Quick add buttons for common amounts
    const quickAdd = async (amount) => {
        if (!firebaseUser?.uid) return;
        
        try {
            setIsSubmitting(true);
            await waterService.logWaterIntake(firebaseUser.uid, {
                date: today,
                amount: amount,
                type: 'water',
                notes: ''
            });
            
            // Refresh data
            const response = await waterService.fetchWaterIntakeByUser(firebaseUser.uid);
            setWaters(response.waterIntakes || []);
            
            const todayResponse = await waterService.getTodayWaterIntake(firebaseUser.uid);
            setTodayTotal(todayResponse.totalOz || 0);
            
        } catch (error) {
            console.error('Error quick adding water:', error);
            setError('Failed to log water intake');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter today's water intake
    const todayWaters = waters.filter(water => {
        const waterDate = water.date instanceof Date 
            ? water.date.toISOString().split('T')[0]
            : new Date(water.date).toISOString().split('T')[0];
        return waterDate === today;
    });

    // Calculate progress percentage
    const progressPercentage = Math.min((todayTotal / userGoal) * 100, 100);

    if (isLoading) {
        return <div className="water-loading">Loading water data...</div>;
    }

    return (
        <div className="water-page">
            {/* Progress Summary */}
            <div className="water-progress">
                <h2>Daily Hydration Progress</h2>
                <div className="progress-info">
                    {/* <span className="progress-text">
                        {todayTotal} / {userGoal} oz ({Math.round(progressPercentage)}%)
                    </span> */}
                    <div className="water-progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                </div>
                {todayTotal >= userGoal && (
                    <div className="goal-achieved">🎉 Daily goal achieved! Great job! 🎉</div>
                )}
            </div>

            {/* Quick Add Buttons */}
            <div className="quick-add-section">
                <h3>Quick Add</h3>
                <div className="quick-add-buttons">
                    <button 
                        onClick={() => quickAdd(8)} 
                        className="quick-add-btn"
                        disabled={isSubmitting}
                    >
                        8 oz<br/><small>Glass</small>
                    </button>
                    <button 
                        onClick={() => quickAdd(16)} 
                        className="quick-add-btn"
                        disabled={isSubmitting}
                    >
                        16 oz<br/><small>Bottle</small>
                    </button>
                    <button 
                        onClick={() => quickAdd(20)} 
                        className="quick-add-btn"
                        disabled={isSubmitting}
                    >
                        20 oz<br/><small>Large Bottle</small>
                    </button>
                    <button 
                        onClick={() => quickAdd(32)} 
                        className="quick-add-btn"
                        disabled={isSubmitting}
                    >
                        32 oz<br/><small>Large Cup</small>
                    </button>
                </div>
            </div>

            <div className="water-card">
                <h1 className="water-title">
                    {editMode ? 'Edit Water Intake' : 'Log Water Intake'}
                </h1>
                
                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit} className="water-form">
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
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                Amount (oz)
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    className="form-input"
                                    min="0.1"
                                    step="0.1"
                                    required
                                />
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">
                                Drink Type
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="water">Water</option>
                                    <option value="tea">Tea</option>
                                    <option value="coffee">Coffee</option>
                                    <option value="juice">Juice</option>
                                    <option value="sports_drink">Sports Drink</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">
                            Notes (Optional)
                            <input
                                type="text"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="e.g., with lemon, iced, etc."
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
                                : (editMode ? 'Update Intake' : 'Log Water')
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
            
            <div className="water-log">
                <h2 className="log-title">Today's Water Intake ({todayWaters.length} entries)</h2>
                
                {todayWaters.length === 0 ? (
                    <p className="no-intake">No water logged for today. Stay hydrated! 💧</p>
                ) : (
                    <ul className="log-list">
                        {todayWaters.map((water) => (
                            <li key={water.id} className="log-item">
                                <div className="water-info">
                                    <span className="water-amount">{water.amount} oz</span>
                                    <span className="water-type">{water.type}</span>
                                    {water.notes && (
                                        <span className="water-notes">{water.notes}</span>
                                    )}
                                </div>
                                <div className="water-actions">
                                    <button 
                                        onClick={() => handleEdit(water)} 
                                        className="edit-button"
                                        disabled={isSubmitting}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(water.id)} 
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

export default Water;