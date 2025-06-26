import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { meditationService } from '../../services/meditationService';
import { soundscapes, meditationTypes } from '../../data/soundscapes';
import timezoneUtils from '../../utils/timezone'; // Add timezone utils
import './Meditation.css';
import PremiumGate from '../Premium/PremiumGate';

function Meditation() {
  const { user: firebaseUser, isPremium } = useAuth();
  const [meditations, setMeditations] = useState([]);
  const [formData, setFormData] = useState({
    date: timezoneUtils.formatLocalDate(new Date()), // Use local date by default
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
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Audio State
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  
  const intervalRef = useRef(null);
  
  // Get today in user's local timezone
  const today = timezoneUtils.formatLocalDate(new Date());

  // Fetch meditations on mount
  useEffect(() => {
    const fetchMeditations = async () => {
      if (!firebaseUser?.uid) return;
      
      try {
        setIsLoading(true);
        console.log('🌍 Fetching meditations for timezone:', timezoneUtils.getUserTimezone());
        
        const response = await meditationService.fetchMeditationsByUser(firebaseUser.uid);
        
        // Add timezone-aware formatting to each meditation
        const meditationsWithTimezone = (response.meditations || []).map(meditation => ({
          ...meditation,
          localDate: timezoneUtils.formatLocalDate(meditation.date),
          localDateTime: timezoneUtils.formatLocalDateTime(meditation.date),
          relativeTime: timezoneUtils.getRelativeTime(meditation.date),
          isToday: timezoneUtils.isToday(meditation.date)
        }));
        
        setMeditations(meditationsWithTimezone);
        console.log('🧘 Loaded meditations with timezone data:', meditationsWithTimezone.length);
        
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

  // Session timer with timezone awareness
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSessionTime(prev => {
          const newTime = prev + 1;
          
          // Check for deep state achievement (after 3 minutes of continuous meditation)
          if (newTime >= 180 && !deepStateAchieved) {
            setDeepStateAchieved(true);
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
    console.log('🌟 Deep state achieved at:', timezoneUtils.formatLocalDateTime(new Date()));
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Deep State Achieved! 🧘‍♀️', {
        body: `You've entered a deep meditative state at ${timezoneUtils.formatLocalTime(new Date())}. Well done!`,
        icon: '/meditation-icon.png'
      });
    }
  };

  const startSession = (duration, type, soundscape) => {
    const now = timezoneUtils.getCurrentLocalTime();
    
    console.log('🌍 Starting meditation session in timezone:', timezoneUtils.getUserTimezone());
    console.log('🧘 Session start time:', timezoneUtils.formatLocalDateTime(now));
    
    setTargetTime(duration);
    setCurrentSoundscape(soundscape);
    setSessionTime(0);
    setIsSessionActive(true);
    setIsPaused(false);
    setDeepStateAchieved(false);
    setSessionStartTime(now);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseSession = () => {
    const now = timezoneUtils.getCurrentLocalTime();
    console.log('⏸️ Session paused at:', timezoneUtils.formatLocalDateTime(now));
    
    setIsPaused(!isPaused);
    if (oscillator && audioContext) {
      if (isPaused) {
        audioContext.resume();
      } else {
        audioContext.suspend();
      }
    }
  };

  const stopSession = async () => {
    const now = timezoneUtils.getCurrentLocalTime();
    console.log('⏹️ Session ended at:', timezoneUtils.formatLocalDateTime(now));
    console.log('📊 Session duration:', Math.floor(sessionTime / 60), 'minutes');
    
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
    if (!firebaseUser?.uid || !sessionStartTime) return;
    
    try {
      console.log('📝 Auto-logging session with timezone data');
      
      const sessionData = {
        date: sessionStartTime, // Use the actual start time in local timezone
        durationMinutes: Math.floor(sessionTime / 60),
        type: 'mindfulness',
        soundscape: currentSoundscape,
        completed: sessionTime >= targetTime * 60,
        deepStateAchieved,
        moodBefore: sessionMoodBefore,
        targetDuration: targetTime,
        sessionStartTime: sessionStartTime,
        sessionEndTime: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone()
      };
      
      console.log('📊 Session data:', sessionData);
      
      const response = await meditationService.logMeditation(firebaseUser.uid, sessionData);
      
      // Add timezone formatting to the new meditation
      const newMeditation = {
        ...response.meditation,
        localDate: timezoneUtils.formatLocalDate(response.meditation.date),
        localDateTime: timezoneUtils.formatLocalDateTime(response.meditation.date),
        relativeTime: timezoneUtils.getRelativeTime(response.meditation.date),
        isToday: timezoneUtils.isToday(response.meditation.date)
      };
      
      setMeditations(prev => [newMeditation, ...prev]);
      
      console.log('✅ Session auto-logged successfully');
      
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
      console.log('🌍 Submitting meditation in timezone:', timezoneUtils.getUserTimezone());
      
      // Convert form date to proper timezone-aware date
      const meditationDate = formData.date ? 
        timezoneUtils.toLocalTimezone(formData.date) : 
        timezoneUtils.getCurrentLocalTime();
      
      const submitData = {
        ...formData,
        date: meditationDate,
        durationMinutes: parseInt(formData.durationMinutes),
        userTimezone: timezoneUtils.getUserTimezone()
      };
      
      console.log('📝 Meditation submit data:', submitData);
      console.log('📅 Local meditation time:', timezoneUtils.formatLocalDateTime(meditationDate));
      
      if (editMode) {
        await meditationService.updateMeditation(firebaseUser.uid, editId, submitData);
        
        // Update local state with timezone formatting
        setMeditations(prev => prev.map(meditation => 
          meditation.id === editId 
            ? { 
                ...meditation, 
                ...submitData,
                localDate: timezoneUtils.formatLocalDate(meditationDate),
                localDateTime: timezoneUtils.formatLocalDateTime(meditationDate),
                relativeTime: timezoneUtils.getRelativeTime(meditationDate),
                isToday: timezoneUtils.isToday(meditationDate)
              }
            : meditation
        ));
        
        setEditMode(false);
        setEditId(null);
        console.log('✅ Meditation updated successfully');
        
      } else {
        const response = await meditationService.logMeditation(firebaseUser.uid, submitData);
        
        // Add timezone formatting to new meditation
        const newMeditation = {
          ...response.meditation,
          localDate: timezoneUtils.formatLocalDate(response.meditation.date),
          localDateTime: timezoneUtils.formatLocalDateTime(response.meditation.date),
          relativeTime: timezoneUtils.getRelativeTime(response.meditation.date),
          isToday: timezoneUtils.isToday(response.meditation.date)
        };
        
        setMeditations(prev => [newMeditation, ...prev]);
        console.log('✅ Meditation logged successfully');
      }
      
      // Reset form with today's date
      setFormData({
        date: timezoneUtils.formatLocalDate(new Date()),
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
    console.log('✏️ Editing meditation from:', timezoneUtils.formatLocalDateTime(meditation.date));
    
    setFormData({
      date: timezoneUtils.formatLocalDate(meditation.date),
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
    
    const meditation = meditations.find(m => m.id === id);
    const confirmMessage = `Are you sure you want to delete the meditation session from ${meditation?.localDateTime || 'unknown time'}?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await meditationService.deleteMeditation(firebaseUser.uid, id);
        setMeditations(prev => prev.filter(meditation => meditation.id !== id));
        console.log('🗑️ Meditation deleted successfully');
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

  // Filter today's meditations using timezone-aware comparison
  const todayMeditations = meditations.filter(meditation => meditation.isToday);

  if (isLoading) {
    return (
      <div className="meditation-loading">
        <p>Loading meditations...</p>
        <small>Timezone: {timezoneUtils.getUserTimezone()}</small>
      </div>
    );
  }

  const playAudio = (soundscape) => {
    if (soundscape.audioFile) {
      const audio = new Audio(soundscape.audioFile);
      audio.loop = true;
      audio.volume = 0.6;
      
      audio.addEventListener('error', (e) => {
        console.error('Audio failed to load:', e);
        alert('Audio not available for this soundscape');
      });
      
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
        alert('Unable to play audio. Please check your internet connection.');
      });
    }
  };

  return (
    <div className="meditation-page">
      {/* Live Session Interface */}
      {isSessionActive && (
        <div className="session-interface">
          <div className="session-header">
            <h2>🧘‍♀️ Meditation Session</h2>
            <div className="session-info">
              <div className="session-soundscape">
                {soundscapes[currentSoundscape].icon} {soundscapes[currentSoundscape].name}
              </div>
              <div className="session-time-info">
                Started: {sessionStartTime ? timezoneUtils.formatLocalTime(sessionStartTime) : 'Now'}
                <br />
                <small>{timezoneUtils.getUserTimezone()}</small>
              </div>
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
                ✨ Deep State Achieved at {timezoneUtils.formatLocalTime(new Date())} ✨
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
          <p className="subtitle">
            Neurologically optimized for deep meditation states
            <br />
            {/* <small>Your timezone: {timezoneUtils.getUserTimezone()} | Local time: {timezoneUtils.formatLocalTime(new Date())}</small> */}
          </p>
          
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
                        startSession(duration, key, currentSoundscape);
                      }}
                      className="duration-btn"
                      disabled={type.premium && !isPremium}
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
                  className={`soundscape-option ${soundscape.premium ? 'premium' : ''} ${currentSoundscape === key ? 'selected' : ''}`}
                  onClick={() => {
                    if (!soundscape.premium || isPremium) {
                      setCurrentSoundscape(key);
                    }
                  }}
                >
                  <span className="soundscape-icon">{soundscape.icon}</span>
                  <h4>{soundscape.name}</h4>
                  <p className="soundscape-description">{soundscape.description}</p>
                  <small className="neurological-note">{soundscape.neurological}</small>
                  {soundscape.premium && !isPremium && <span className="premium-badge">PRO</span>}
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
                  Date ({timezoneUtils.getUserTimezone()})
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
                      date: timezoneUtils.formatLocalDate(new Date()),
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

      {/* Today's Sessions with Timezone Info */}
      {!isSessionActive && (
        <div className="meditation-log">
          <h2 className="log-title">
            Today's Sessions ({todayMeditations.length})
            <br />
            <small>
              {timezoneUtils.formatLocalDate(new Date())} - {timezoneUtils.getUserTimezone()}
            </small>
          </h2>
          
          {todayMeditations.length === 0 ? (
            <p className="no-sessions">
              No meditation sessions today. Start your mindfulness journey!
              <br />
              <small>Local time: {timezoneUtils.formatLocalDateTime(new Date())}</small>
            </p>
          ) : (
            <ul className="log-list">
              {todayMeditations.map((meditation) => (
                <li key={meditation.id} className="log-item">
                  <div className="meditation-info">
                    <div className="meditation-header">
                      <span className="meditation-type">
                        {meditationTypes[meditation.type]?.icon} {meditationTypes[meditation.type]?.name || meditation.type}
                      </span>
                      <span className="meditation-time">
                        {meditation.localDateTime}
                        <small> ({meditation.relativeTime})</small>
                      </span>
                    </div>
                    
                    <div className="meditation-details">
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
                    </div>
                    
                    {meditation.notes && (
                      <div className="meditation-notes">{meditation.notes}</div>
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

      {/* Recommended Videos */}
      {!isSessionActive && (
        <div className="recommended-videos">
          <h2 className="recommended-title">🎥 Guided Meditation Videos</h2>
          <p className="timezone-note">
            Perfect for any time of day in {timezoneUtils.getUserTimezone()}
          </p>
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

      {/* Premium Features */}
      <PremiumGate feature="exclusive meditation experiences">
        <div className="premium-meditation-features">
          <h3>🧘‍♀️ Premium Meditation Experience</h3>
          <p>Unlock advanced features designed by neuroscientists:</p>
          <ul>
            <li>🎵 Premium binaural soundscapes</li>
            <li>📊 Advanced session analytics</li>
            <li>🧠 Personalized meditation recommendations</li>
            <li>⏰ Smart session reminders based on your timezone</li>
            <li>📈 Mood tracking and insights</li>
          </ul>
        </div>
      </PremiumGate>
    </div>
  );
}

export default Meditation;