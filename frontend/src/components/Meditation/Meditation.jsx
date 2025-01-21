import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logMeditation, fetchMeditationsByUser, updateMeditation, deleteMeditation } from '../../store/meditation';
import './Meditation.css';

function Meditation() {
  const dispatch = useDispatch();
  const userId = useSelector((state) => state.session.user.id);
  const meditations = useSelector((state) => state.meditation.sessions);
  const [formData, setFormData] = useState({
    date: '',
    durationMinutes: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (userId) {
      dispatch(fetchMeditationsByUser(userId));
    }
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
      await dispatch(updateMeditation({ id: editId, ...formData }));

      dispatch(fetchMeditationsByUser)
      setEditMode(false);
      setEditId(null);
    } else {
      await dispatch(logMeditation({ userId, ...formData }));
    }
    setFormData({ date: '', durationMinutes: '' });
  };

  const handleEdit = (meditation) => {
    setFormData({ date: meditation.date.split('T')[0], durationMinutes: meditation.durationMinutes });
    setEditMode(true);
    setEditId(meditation.id);
  };

  const handleDelete = (id) => {
    dispatch(deleteMeditation(id));
  };

  const recommendedVideos = [
    {
      title: 'Relaxation and Positivity',
      url: 'https://www.youtube.com/watch?v=VpHz8Mb13_Y',
      thumbnail: 'data:image/jpeg;base64,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'
    },
    {
      title: 'Self Love',
      url: 'https://www.youtube.com/watch?v=CqnWMPuyT0g',
      thumbnail: 'https://i.ytimg.com/vi/CqnWMPuyT0g/sddefault.jpg'
    },
    {
      title: 'Stop Thinking',
      url: 'https://www.youtube.com/watch?v=056qll-07ak',
      thumbnail: 'https://i.ytimg.com/vi/056qll-07ak/sddefault.jpg'
    }
  ];

  return (
    <div className="meditation-page">
      <div className="meditation-card">
        <h1 className="meditation-title">Log Meditation Session</h1>
        <form onSubmit={handleSubmit} className="meditation-form">
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
          <button type="submit" className="log-button">Log Meditation</button>
        </form>
      </div>
      <div className="recommended-videos">
        <h2 className="recommended-title">Recommended Videos</h2>
        <div className="video-tiles">
          {recommendedVideos.map((video, index) => (
            <a key={index} href={video.url} target="_blank" rel="noopener noreferrer" className="video-tile">
              <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
              <p className="video-title">{video.title}</p>
            </a>
          ))}
        </div>
      </div>
      <div className="meditation-log">
        <h2 className="log-title">Meditation Log from Today</h2>
        <ul className="log-list">
          {meditations.filter(meditation => meditation.date.split('T')[0] === today).map((meditation) => (
            <li key={meditation.id} className="log-item">
              <span className="log-date">{meditation.date.split('T')[0]}</span>
              <span className="log-duration">{meditation.durationMinutes} minutes</span>
              <button onClick={() => handleEdit(meditation)} className="edit-button">Edit</button>
              <button onClick={() => handleDelete(meditation.id)} className="delete-button">Delete</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Meditation;