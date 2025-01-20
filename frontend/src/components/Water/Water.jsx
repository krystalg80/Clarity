import { useState, useEffect} from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchWaterIntakeByUser, logWaterIntake, updateWaterIntake, deleteWaterIntake } from "../../store/water";
import './Water.css';

function Water() {
    const dispatch = useDispatch();
    const userId = useSelector((state) => state.session.user.id)
    const waters = useSelector((state) => state.water.sessions);
    const [formData, setFormData] = useState({
        date: '',
        waterConsumedOz: '',
    });

    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        if(userId)
            dispatch(fetchWaterIntakeByUser(userId));
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
                await dispatch(updateWaterIntake({ id: editId, ...formData }));
                setEditMode(false);
                setEditId(null);
            } else {
                await dispatch(logWaterIntake({ userId, ...formData }));
            }
            setFormData({
                date: '',
                waterConsumedOz: '',
            });
        };
    
    const handleEdit = (water) => {
        setEditMode(true);
        setEditId(water.id);
        setFormData({
            date: water.date.split('T')[0],
            waterConsumedOz: water.waterConsumedOz,
        });
    };

    const handleDelete = (id) => {
        dispatch(deleteWaterIntake(id));
    }

    return (
        <div className="water-page">
          <div className="water-card">
            <h1 className="water-title">Log Water Session</h1>
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
                  />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">
                    Water Consumed (oz)
                  <input
                    type="number"
                    name="waterConsumedOz"
                    value={formData.waterConsumedOz}
                    onChange={handleChange}
                    className="form-input"
                  />
                </label>
              </div>
              <button type="submit" className="log-button">Log Water Consumed</button>
            </form>
          </div>
          <div className="water-log">
            <h2 className="log-title">Water Log from Today</h2>
            <ul className="log-list">
              {waters.filter(water => water.date.split('T')[0] === today).map((water) => (
                <li key={water.id} className="log-item">
                  <span className="log-date">{water.date.split('T')[0]}</span>
                  <span className="log-ozconsumed">{water.waterConsumedOz} Oz</span>
                  <button onClick={() => handleEdit(water)} className="edit-button">Edit</button>
                  <button onClick={() => handleDelete(water.id)} className="delete-button">Delete</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

export default Water;