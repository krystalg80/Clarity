import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { meditationService } from '../../services/meditationService';
import { soundscapes, meditationTypes } from '../../data/soundscapes';
import './Meditation.css';

function Meditation() {
  const { user: firebaseUser } = useAuth();
  const [meditations, setMeditations] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    durationMinutes: '',
    type: 'mindfulness',
    soundscape: 'silence',
    moodBefore: '',
    moodAfter: '',
    notes: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [targetTime, setTargetTime] = useState(5);
  const [isPaused, setIsPaused] = useState(false);
  const [deepStateAchieved, setDeepStateAchieved] = useState(false);
  const [currentSoundscape, setCurrentSoundscape] = useState('silence');
  const [sessionMoodBefore, setSessionMoodBefore] = useState('');
  
  // Audio State
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  
  const intervalRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // Fetch meditations on mount
  useEffect(() => {
    const fetchMeditations = async () => {
      if (!firebaseUser?.uid) return;
      
      try {
        setIsLoading(true);
        const response = await meditationService.fetchMeditationsByUser(firebaseUser.uid);
        setMeditations(response.meditations || []);
      } catch (error) {
        console.error('Error fetching meditations:', error);
        setError('Failed to load meditation sessions');
      } finally {
        setIsLoading(false);
      }
    };

    if (firebaseUser?.uid) {
      fetchMeditations();
    }
  }, [firebaseUser]);

  // Audio setup for soundscapes
  useEffect(() => {
    if (isSessionActive && currentSoundscape !== 'silence') {
      setupAudio();
    }
    
    return () => {
      if (oscillator) {
        oscillator.stop();
      }
    };
  }, [isSessionActive, currentSoundscape]);

  // Session timer
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSessionTime(prev => {
          const newTime = prev + 1;
          
          // Check for deep state achievement (after 3 minutes of continuous meditation)
          if (newTime >= 180 && !deepStateAchieved) {
            setDeepStateAchieved(true);
            // Visual/audio cue for deep state
            showDeepStateNotification();
          }
          
          // Auto-stop when target reached
          if (newTime >= targetTime * 60) {
            stopSession();
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isSessionActive, isPaused, targetTime, deepStateAchieved]);

  const setupAudio = () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(context);
      
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.value = 0.1; // Low volume
      setGainNode(gain);
      
      if (soundscapes[currentSoundscape]?.frequency) {
        const osc = context.createOscillator();
        
        switch (soundscapes[currentSoundscape].frequency) {
          case 'alpha':
            osc.frequency.setValueAtTime(10, context.currentTime); // 10 Hz alpha waves
            break;
          case 'theta':
            osc.frequency.setValueAtTime(7, context.currentTime); // 7 Hz theta waves
            break;
          case 'gamma':
            osc.frequency.setValueAtTime(40, context.currentTime); // 40 Hz gamma waves
            break;
          case 'pink_noise':
            // Simple pink noise approximation
            osc.frequency.setValueAtTime(200, context.currentTime);
            osc.type = 'sawtooth';
            break;
          default:
            osc.frequency.setValueAtTime(10, context.currentTime);
        }
        
        osc.connect(gain);
        osc.start();
        setOscillator(osc);
      }
    } catch (error) {
      console.error('Audio setup failed:', error);
    }
  };

  const showDeepStateNotification = () => {
    // Visual feedback for achieving deep state
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Deep State Achieved! 🧘‍♀️', {
        body: 'You\'ve entered a deep meditative state. Well done!',
        icon: '/meditation-icon.png'
      });
    }
  };

  const startSession = (duration, type, soundscape) => {
    setTargetTime(duration);
    setCurrentSoundscape(soundscape);
    setSessionTime(0);
    setIsSessionActive(true);
    setIsPaused(false);
    setDeepStateAchieved(false);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseSession = () => {
    setIsPaused(!isPaused);
    if (oscillator && audioContext) {
      if (isPaused) {
        // Resume audio
        audioContext.resume();
      } else {
        // Pause audio
        audioContext.suspend();
      }
    }
  };

  const stopSession = async () => {
    setIsSessionActive(false);
    setIsPaused(false);
    
    if (oscillator) {
      oscillator.stop();
      setOscillator(null);
    }
    
    // Auto-log session if it was substantial (>1 minute)
    if (sessionTime >= 60) {
      await autoLogSession();
    }
  };

  const autoLogSession = async () => {
    if (!firebaseUser?.uid) return;
    
    try {
      const sessionData = {
        date: new Date(),
        durationMinutes: Math.floor(sessionTime / 60),
        type: 'mindfulness',
        soundscape: currentSoundscape,
        completed: sessionTime >= targetTime * 60,
        deepStateAchieved,
        moodBefore: sessionMoodBefore,
        targetDuration: targetTime
      };
      
      const response = await meditationService.logMeditation(firebaseUser.uid, sessionData);
      setMeditations(prev => [response.meditation, ...prev]);
      
    } catch (error) {
      console.error('Error auto-logging session:', error);
    }
  };

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
        await meditationService.updateMeditation(firebaseUser.uid, editId, {
          ...formData,
          durationMinutes: parseInt(formData.durationMinutes)
        });
        
        setMeditations(prev => prev.map(meditation => 
          meditation.id === editId 
            ? { ...meditation, ...formData, durationMinutes: parseInt(formData.durationMinutes) }
            : meditation
        ));
        
        setEditMode(false);
        setEditId(null);
      } else {
        const response = await meditationService.logMeditation(firebaseUser.uid, {
          ...formData,
          durationMinutes: parseInt(formData.durationMinutes)
        });
        
        setMeditations(prev => [response.meditation, ...prev]);
      }
      
      setFormData({
        date: '',
        durationMinutes: '',
        type: 'mindfulness',
        soundscape: 'silence',
        moodBefore: '',
        moodAfter: '',
        notes: ''
      });
      
    } catch (error) {
      console.error('Error saving meditation:', error);
      setError(editMode ? 'Failed to update meditation' : 'Failed to log meditation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (meditation) => {
    setFormData({
      date: meditation.date instanceof Date 
        ? meditation.date.toISOString().split('T')[0]
        : new Date(meditation.date).toISOString().split('T')[0],
      durationMinutes: meditation.durationMinutes?.toString() || '',
      type: meditation.type || 'mindfulness',
      soundscape: meditation.soundscape || 'silence',
      moodBefore: meditation.moodBefore || '',
      moodAfter: meditation.moodAfter || '',
      notes: meditation.notes || ''
    });
    setEditMode(true);
    setEditId(meditation.id);
  };

  const handleDelete = async (id) => {
    if (!firebaseUser?.uid) return;
    
    if (window.confirm('Are you sure you want to delete this meditation session?')) {
      try {
        await meditationService.deleteMeditation(firebaseUser.uid, id);
        setMeditations(prev => prev.filter(meditation => meditation.id !== id));
      } catch (error) {
        console.error('Error deleting meditation:', error);
        setError('Failed to delete meditation');
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const todayMeditations = meditations.filter(meditation => {
    const meditationDate = meditation.date instanceof Date 
      ? meditation.date.toISOString().split('T')[0]
      : new Date(meditation.date).toISOString().split('T')[0];
    return meditationDate === today;
  });

  if (isLoading) {
    return <div className="meditation-loading">Loading meditations...</div>;
  }

  return (
    <div className="meditation-page">
      {/* Live Session Interface */}
      {isSessionActive && (
        <div className="session-interface">
          <div className="session-header">
            <h2>🧘‍♀️ Meditation Session</h2>
            <div className="session-soundscape">
              {soundscapes[currentSoundscape].icon} {soundscapes[currentSoundscape].name}
            </div>
          </div>
          
          <div className="session-timer">
            <div className="time-display">
              <span className="current-time">{formatTime(sessionTime)}</span>
              <span className="target-time">/ {formatTime(targetTime * 60)}</span>
            </div>
            
            <div className="progress-ring">
              <div 
                className="progress-fill" 
                style={{ 
                  background: `conic-gradient(#4CAF50 ${(sessionTime / (targetTime * 60)) * 360}deg, #eee 0deg)`
                }}
              ></div>
            </div>
          </div>
          
          <div className="session-status">
            {deepStateAchieved && (
              <div className="deep-state-indicator">
                ✨ Deep State Achieved ✨
              </div>
            )}
            
            <div className="neurological-info">
              <p>{soundscapes[currentSoundscape].neurological}</p>
            </div>
          </div>
          
          <div className="session-controls">
            <button onClick={pauseSession} className="pause-btn">
              {isPaused ? '▶️' : '⏸️'} {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={stopSession} className="stop-btn">
              ⏹️ End Session
            </button>
          </div>
        </div>
      )}

      {/* Quick Start Section */}
      {!isSessionActive && (
        <div className="quick-start">
          <h1 className="meditation-title">🧘‍♀️ Meditation Studio</h1>
          <p className="subtitle">Neurologically optimized for deep meditation states</p>
          
          <div className="quick-start-grid">
            {Object.entries(meditationTypes).map(([key, type]) => (
              <div key={key} className={`meditation-type ${type.premium ? 'premium' : ''}`}>
                <div className="type-header">
                  <span className="type-icon">{type.icon}</span>
                  <h3>{type.name}</h3>
                  {type.premium && <span className="premium-badge">PRO</span>}
                </div>
                <p className="type-description">{type.description}</p>
                
                <div className="duration-options">
                  {type.duration.map(duration => (
                    <button 
                      key={duration}
                      onClick={() => {
                        if (!sessionMoodBefore) {
                          setSessionMoodBefore(prompt('How are you feeling right now? (😊😔😴😤😌🤔🎉😰)') || '😐');
                        }
                        startSession(duration, key, 'silence');
                      }}
                      className="duration-btn"
                      disabled={type.premium && !firebaseUser} // Disable premium for non-users
                    >
                      {duration}min
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Soundscape Selection */}
          <div className="soundscape-section">
            <h3>🎵 Choose Your Soundscape</h3>
            <div className="soundscape-grid">
              {Object.entries(soundscapes).map(([key, soundscape]) => (
                <div 
                  key={key} 
                  className={`soundscape-option ${soundscape.premium ? 'premium' : ''}`}
                  onClick={() => setCurrentSoundscape(key)}
                >
                  <span className="soundscape-icon">{soundscape.icon}</span>
                  <h4>{soundscape.name}</h4>
                  <p className="soundscape-description">{soundscape.description}</p>
                  <small className="neurological-note">{soundscape.neurological}</small>
                  {soundscape.premium && <span className="premium-badge">PRO</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Log Form */}
      {!isSessionActive && (
        <div className="meditation-card">
          <h2 className="form-title">
            {editMode ? 'Edit Meditation Session' : 'Manually Log Session'}
          </h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="meditation-form">
            <div className="form-row">
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
                  Duration (Minutes)
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
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Meditation Type
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-input"
                  >
                    {Object.entries(meditationTypes).map(([key, type]) => (
                      <option key={key} value={key}>{type.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Soundscape Used
                  <select
                    name="soundscape"
                    value={formData.soundscape}
                    onChange={handleChange}
                    className="form-input"
                  >
                    {Object.entries(soundscapes).map(([key, soundscape]) => (
                      <option key={key} value={key}>{soundscape.name}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Mood Before
                  <select
                    name="moodBefore"
                    value={formData.moodBefore}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Select mood...</option>
                    <option value="😊">😊 Happy</option>
                    <option value="😔">😔 Sad</option>
                    <option value="😴">😴 Tired</option>
                    <option value="😤">😤 Frustrated</option>
                    <option value="😌">😌 Peaceful</option>
                    <option value="🤔">🤔 Thoughtful</option>
                    <option value="🎉">🎉 Excited</option>
                    <option value="😰">😰 Anxious</option>
                  </select>
                </label>
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  Mood After
                  <select
                    name="moodAfter"
                    value={formData.moodAfter}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Select mood...</option>
                    <option value="😊">😊 Happy</option>
                    <option value="😔">😔 Sad</option>
                    <option value="😴">😴 Tired</option>
                    <option value="😤">😤 Frustrated</option>
                    <option value="😌">😌 Peaceful</option>
                    <option value="🤔">🤔 Thoughtful</option>
                    <option value="🎉">🎉 Excited</option>
                    <option value="😰">😰 Anxious</option>
                  </select>
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
                  placeholder="How did the session feel? Any insights?"
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
                  : (editMode ? 'Update Session' : 'Log Session')
                }
              </button>
              
              {editMode && (
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setFormData({
                      date: '',
                      durationMinutes: '',
                      type: 'mindfulness',
                      soundscape: 'silence',
                      moodBefore: '',
                      moodAfter: '',
                      notes: ''
                    });
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Today's Sessions */}
      {!isSessionActive && (
        <div className="meditation-log">
          <h2 className="log-title">Today's Sessions ({todayMeditations.length})</h2>
          
          {todayMeditations.length === 0 ? (
            <p className="no-sessions">No meditation sessions today. Start your mindfulness journey!</p>
          ) : (
            <ul className="log-list">
              {todayMeditations.map((meditation) => (
                <li key={meditation.id} className="log-item">
                  <div className="meditation-info">
                    <span className="meditation-type">
                      {meditationTypes[meditation.type]?.icon} {meditationTypes[meditation.type]?.name || meditation.type}
                    </span>
                    <span className="meditation-duration">{meditation.durationMinutes} min</span>
                    <span className="meditation-soundscape">
                      {soundscapes[meditation.soundscape]?.icon} {soundscapes[meditation.soundscape]?.name}
                    </span>
                    {meditation.deepStateAchieved && (
                      <span className="deep-state-badge">✨ Deep State</span>
                    )}
                    {meditation.moodBefore && meditation.moodAfter && (
                      <span className="mood-change">
                        {meditation.moodBefore} → {meditation.moodAfter}
                      </span>
                    )}
                    {meditation.notes && (
                      <span className="meditation-notes">{meditation.notes}</span>
                    )}
                  </div>
                  <div className="meditation-actions">
                    <button 
                      onClick={() => handleEdit(meditation)} 
                      className="edit-button"
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(meditation.id)} 
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
      )}

      {/* Recommended Videos (kept from original) */}
      {!isSessionActive && (
        <div className="recommended-videos">
          <h2 className="recommended-title">🎥 Guided Meditation Videos</h2>
          <div className="video-tiles">
            <a href="https://www.youtube.com/watch?v=VpHz8Mb13_Y" target="_blank" rel="noopener noreferrer" className="video-tile">
              <div className="video-thumbnail">🌸</div>
              <p className="video-title">Relaxation and Positivity</p>
            </a>
            <a href="https://www.youtube.com/watch?v=CqnWMPuyT0g" target="_blank" rel="noopener noreferrer" className="video-tile">
              <div className="video-thumbnail">💖</div>
              <p className="video-title">Self Love</p>
            </a>
            <a href="https://www.youtube.com/watch?v=056qll-07ak" target="_blank" rel="noopener noreferrer" className="video-tile">
              <div className="video-thumbnail">🧠</div>
              <p className="video-title">Stop Thinking</p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default Meditation;