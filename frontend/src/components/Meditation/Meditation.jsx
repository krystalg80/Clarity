import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { meditationService } from '../../services/meditationService';
import { soundscapes, meditationTypes } from '../../data/soundscapes';
import timezoneUtils from '../../utils/timezone';
import './Meditation.css';
import PremiumGate from '../Premium/PremiumGate';
import { startStripeUpgrade } from '../../services/stripeUpgrade';
import { analyzeSentiment, extractKeywords } from '../../services/aiService';

function Meditation() {
  const { user: firebaseUser, isPremium } = useAuth();
  
  // ALL STATE DECLARATIONS FIRST
  const [meditations, setMeditations] = useState([]);
  const [formData, setFormData] = useState({
    date: timezoneUtils.formatLocalDate(new Date()),
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
  
  // Debug: Log whenever currentSoundscape changes
  useEffect(() => {
    console.log('🔍 currentSoundscape changed to:', currentSoundscape);
  }, [currentSoundscape]);
  const [sessionMoodBefore, setSessionMoodBefore] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Audio State
  const [audioContext, setAudioContext] = useState(null);
  const [oscillator, setOscillator] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  
  // Wake Lock State
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  
  const intervalRef = useRef(null);
  
  // Get today in user's local timezone
  const today = timezoneUtils.formatLocalDate(new Date());

  // ALL USEEFFECT HOOKS TOGETHER AT THE TOP
  
  // 0. Check wake lock support on mount
  useEffect(() => {
    const checkWakeLockSupport = () => {
      const supported = 'wakeLock' in navigator;
      setWakeLockSupported(supported);
      console.log('🔒 Wake Lock API supported:', supported);
    };
    
    checkWakeLockSupport();
  }, []);
  
  // 1. Fetch meditations on mount
  useEffect(() => {
    const fetchMeditations = async () => {
      if (!firebaseUser?.uid) return;
      
      try {
        setIsLoading(true);
        console.log('🌍 Fetching meditations for timezone:', timezoneUtils.getUserTimezone());
        
        const response = await meditationService.fetchMeditationsByUser(firebaseUser.uid);
        
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

  // 2. Audio setup for soundscapes
  useEffect(() => {
    console.log('🎵 Audio effect triggered - isSessionActive:', isSessionActive, 'currentSoundscape:', currentSoundscape);
    
    if (isSessionActive && currentSoundscape !== 'silence') {
      console.log('🔊 Setting up audio for soundscape:', currentSoundscape);
      setupAudio();
    }
    
    return () => {
      if (oscillator) {
        try {
          if (Array.isArray(oscillator)) {
            oscillator.forEach(osc => {
              if (osc.stop) osc.stop();
            });
          } else {
            if (oscillator.stop) oscillator.stop();
          }
        } catch (error) {
          console.log('Audio cleanup error:', error);
        }
      }
    };
  }, [isSessionActive, currentSoundscape]);

  // 3. Session timer with auto-stop functionality
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSessionTime(prev => {
          const newTime = prev + 1;
          
          // Deep state notification at 3 minutes
          if (newTime >= 180 && !deepStateAchieved) {
            setDeepStateAchieved(true);
            showDeepStateNotification();
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isSessionActive, isPaused, deepStateAchieved]);

  // 4. Separate effect to handle session completion
  useEffect(() => {
    if (isSessionActive && sessionTime >= targetTime * 60) {
      console.log('⏰ Timer completed! Auto-stopping session...');
      console.log('📊 Final session stats:');
      console.log('  - Duration:', Math.floor(sessionTime / 60), 'minutes');
      console.log('  - Target:', targetTime, 'minutes');
      console.log('  - Soundscape:', currentSoundscape);
      console.log('  - Deep state achieved:', deepStateAchieved);
      console.log('  - Start time:', timezoneUtils.formatLocalDateTime(sessionStartTime));
      
      showCompletionNotification();
      
      // Stop the session
      stopSession();
    }
  }, [isSessionActive, sessionTime, targetTime, currentSoundscape, deepStateAchieved, sessionStartTime]);

  // Filter today's meditations using timezone-aware comparison
  const todayMeditations = meditations.filter(meditation => {
    const isToday = meditation.isToday || timezoneUtils.isToday(meditation.date);
    return isToday;
  });

  console.log('📋 Today\'s meditations:', todayMeditations.length);

  // Cleanup effect for wake lock and timers
  useEffect(() => {
    return () => {
      // Release wake lock on component unmount
      releaseWakeLock();
      // Clear any remaining intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Wake Lock Functions
  const requestWakeLock = async () => {
    try {
      if (!wakeLockSupported) {
        console.log('🔒 Wake Lock API not supported, using fallback methods');
        return false;
      }
      
      const wakeLockInstance = await navigator.wakeLock.request('screen');
      setWakeLock(wakeLockInstance);
      setWakeLockActive(true);
      
      console.log('🔒 Wake lock activated');
      
      // Listen for wake lock release
      wakeLockInstance.addEventListener('release', () => {
        console.log('🔒 Wake lock was released');
        setWakeLockActive(false);
        setWakeLock(null);
      });
      
      return true;
    } catch (error) {
      console.error('🔒 Failed to request wake lock:', error);
      return false;
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
        setWakeLockActive(false);
        console.log('🔒 Wake lock released');
      }
    } catch (error) {
      console.error('🔒 Error releasing wake lock:', error);
    }
  };

  // Fallback methods to keep device awake
  const startFallbackKeepAwake = () => {
    if (!wakeLockSupported) {
      console.log('🔒 Using fallback keep-awake methods');
      
      // Method 1: Audio context keep-alive
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Method 2: Periodic vibration (if supported)
      if ('vibrate' in navigator) {
        const vibrationInterval = setInterval(() => {
          navigator.vibrate(1); // Very short vibration
        }, 30000); // Every 30 seconds
        return vibrationInterval;
      }
    }
    return null;
  };

  const setupAudio = () => {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(context);
      
      const gain = context.createGain();
      gain.connect(context.destination);
      gain.gain.value = 0.1; // Low volume
      setGainNode(gain);
      
      const soundscape = soundscapes[currentSoundscape];
      if (!soundscape?.frequency) {
        console.log('🔇 Silence selected');
        return;
      }
      
      // Create oscillators based on soundscape type
      switch (soundscape.frequency) {
        case 'gamma':
        case 'theta':
          // Binaural beats - two slightly different frequencies
          createBinauralBeats(context, gain, soundscape);
          break;
          
        case 'alpha':
          // Alpha waves binaural beats
          createAlphaBinaural(context, gain, soundscape);
          break;
          
        case 'ocean_waves':
          // Realistic ocean waves with alpha entrainment
          createOceanWaves(context, gain, soundscape);
          break;
          
        case 'earth_binaural':
          // Earth resonance with audible carrier
          createEarthBinaural(context, gain, soundscape);
          break;
          
        case 'harmonic':
          // Multiple harmonic frequencies
          createHarmonics(context, gain, soundscape.harmonics || [soundscape.baseFreq]);
          break;
          
        case 'pink_noise':
          // Pink noise generation
          createPinkNoise(context, gain);
          break;
          
        case 'white_noise':
          // White noise generation
          createWhiteNoise(context, gain);
          break;
          
        case 'single_tone':  
        case 'natural':
          // Natural Earth frequency
          createSingleTone(context, gain, soundscape.baseFreq, soundscape.waveType || 'sine');
          break;
          
        default:
          console.log('🔇 Unknown frequency type:', soundscape.frequency);
      }
      
    } catch (error) {
      console.error('Audio setup failed:', error);
    }
  };

  // Helper function for binaural beats
  const createBinauralBeats = (context, gain, soundscape) => {
    // Left ear oscillator
    const leftOsc = context.createOscillator();
    leftOsc.frequency.setValueAtTime(soundscape.leftEar, context.currentTime);
    leftOsc.type = soundscape.waveType || 'sine';
    
    // Right ear oscillator  
    const rightOsc = context.createOscillator();
    rightOsc.frequency.setValueAtTime(soundscape.rightEar, context.currentTime);
    rightOsc.type = soundscape.waveType || 'sine';
    
    // Create stereo panner for left/right separation
    const leftPanner = context.createStereoPanner();
    leftPanner.pan.value = -1; // Full left
    
    const rightPanner = context.createStereoPanner();
    rightPanner.pan.value = 1; // Full right
    
    // Connect audio graph
    leftOsc.connect(leftPanner);
    leftPanner.connect(gain);
    
    rightOsc.connect(rightPanner);
    rightPanner.connect(gain);
    
    // Start oscillators
    leftOsc.start();
    rightOsc.start();
    
    // Store for cleanup
    setOscillator([leftOsc, rightOsc]);
    
    console.log(`🎧 Binaural beats: ${soundscape.leftEar}Hz (L) / ${soundscape.rightEar}Hz (R) = ${soundscape.binauralBeat}Hz beat`);
  };

  // New function for alpha binaural beats
  const createAlphaBinaural = (context, gain, soundscape) => {
    const baseFreq = 200; // Carrier frequency
    const beatFreq = soundscape.baseFreq; // 10 Hz alpha beat
    
    // Left ear oscillator
    const leftOsc = context.createOscillator();
    leftOsc.frequency.setValueAtTime(baseFreq, context.currentTime);
    leftOsc.type = soundscape.waveType || 'sine';
    
    // Right ear oscillator  
    const rightOsc = context.createOscillator();
    rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, context.currentTime);
    rightOsc.type = soundscape.waveType || 'sine';
    
    // Create stereo panner for left/right separation
    const leftPanner = context.createStereoPanner();
    leftPanner.pan.value = -1; // Full left
    
    const rightPanner = context.createStereoPanner();
    rightPanner.pan.value = 1; // Full right
    
    // Connect audio graph
    leftOsc.connect(leftPanner);
    leftPanner.connect(gain);
    
    rightOsc.connect(rightPanner);
    rightPanner.connect(gain);
    
    // Start oscillators
    leftOsc.start();
    rightOsc.start();
    
    // Store for cleanup
    setOscillator([leftOsc, rightOsc]);
    
    console.log(`🌊 Alpha binaural: ${baseFreq}Hz (L) / ${baseFreq + beatFreq}Hz (R) = ${beatFreq}Hz beat`);
  };

  // Add this new function for Earth binaural
  const createEarthBinaural = (context, gain, soundscape) => {
    const carrierFreq = soundscape.carrierFreq || 136.1; // Audible OM frequency
    const beatFreq = 7.83; // Schumann resonance
    
    // Left ear oscillator
    const leftOsc = context.createOscillator();
    leftOsc.frequency.setValueAtTime(carrierFreq, context.currentTime);
    leftOsc.type = soundscape.waveType || 'sine';
    
    // Right ear oscillator  
    const rightOsc = context.createOscillator();
    rightOsc.frequency.setValueAtTime(carrierFreq + beatFreq, context.currentTime);
    rightOsc.type = soundscape.waveType || 'sine';
    
    // Create stereo panner for left/right separation
    const leftPanner = context.createStereoPanner();
    leftPanner.pan.value = -1; // Full left
    
    const rightPanner = context.createStereoPanner();
    rightPanner.pan.value = 1; // Full right
    
    // Connect audio graph
    leftOsc.connect(leftPanner);
    leftPanner.connect(gain);
    
    rightOsc.connect(rightPanner);
    rightPanner.connect(gain);
    
    // Start oscillators
    leftOsc.start();
    rightOsc.start();
    
    // Store for cleanup
    setOscillator([leftOsc, rightOsc]);
    
    console.log(`🌲 Earth binaural: ${carrierFreq}Hz (L) / ${carrierFreq + beatFreq}Hz (R) = ${beatFreq}Hz Schumann beat`);
  };

  // Helper function for single tone
  const createSingleTone = (context, gain, frequency, waveType = 'sine') => {
    const osc = context.createOscillator();
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    osc.type = waveType;
    osc.connect(gain);
    osc.start();
    setOscillator(osc);
    
    console.log(`🎵 Single tone: ${frequency}Hz (${waveType})`);
  };

  // Helper function for harmonics
  const createHarmonics = (context, gain, frequencies) => {
    const oscillators = frequencies.map(freq => {
      const osc = context.createOscillator();
      osc.frequency.setValueAtTime(freq, context.currentTime);
      osc.type = 'triangle';
      
      // Reduce volume for each harmonic
      const harmonicGain = context.createGain();
      harmonicGain.gain.value = 0.3 / frequencies.length;
      
      osc.connect(harmonicGain);
      harmonicGain.connect(gain);
      osc.start();
      
      return osc;
    });
    
    setOscillator(oscillators);
    console.log(`🎼 Harmonics: ${frequencies.join(', ')}Hz`);
  };

  // Helper function for pink noise
  const createPinkNoise = (context, gain) => {
    const bufferSize = context.sampleRate * 2; // 2 seconds of audio
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate pink noise using multiple octaves
    for (let i = 0; i < bufferSize; i++) {
      let pink = 0;
      for (let octave = 0; octave < 5; octave++) {
        pink += (Math.random() * 2 - 1) / Math.pow(2, octave);
      }
      data[i] = pink * 0.1;
    }
    
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    
    setOscillator(source);
    console.log('🌧️ Pink noise generated');
  };

  // Helper function for white noise
  const createWhiteNoise = (context, gain) => {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }
    
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    
    setOscillator(source);
    console.log('📻 White noise generated');
  };

  // Create ocean waves with healing frequencies (528Hz, 396Hz, 432Hz)
  const createOceanWaves = (context, gain, soundscape) => {
    const oscillators = [];
    
    // 1. Deep ocean base with 396 Hz healing frequency (Root Chakra - Grounding)
    const deepBase = context.createOscillator();
    deepBase.frequency.setValueAtTime(20, context.currentTime); // Deep ocean rumble
    deepBase.type = 'sine';
    
    const deepGain = context.createGain();
    deepGain.gain.value = 0.4;
    
    // 396 Hz healing frequency (very subtle, mixed with ocean)
    const healing396 = context.createOscillator();
    healing396.frequency.setValueAtTime(396, context.currentTime); // Liberation frequency
    healing396.type = 'sine';
    
    const healing396Gain = context.createGain();
    healing396Gain.gain.value = 0.05; // Very subtle
    
    // Super slow wave rhythm (8-12 waves per minute like real ocean)
    const mainWaveLFO = context.createOscillator();
    mainWaveLFO.frequency.setValueAtTime(0.15, context.currentTime); // ~9 waves per minute
    mainWaveLFO.type = 'sine';
    
    const mainWaveGain = context.createGain();
    mainWaveGain.gain.value = 0.3;
    
    mainWaveLFO.connect(mainWaveGain);
    mainWaveGain.connect(deepGain.gain);
    
    deepBase.connect(deepGain);
    deepGain.connect(gain);
    
    healing396.connect(healing396Gain);
    healing396Gain.connect(gain);
    
    // 2. 432 Hz "Earth Frequency" with wave crashes
    const crashBuffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate);
    const crashData = crashBuffer.getChannelData(0);
    
    // Generate realistic wave crash using brown noise
    let brownNoise = 0;
    for (let i = 0; i < crashData.length; i++) {
      const whiteNoise = (Math.random() * 2 - 1);
      brownNoise = (brownNoise + whiteNoise * 0.02) * 0.99;
      
      // Add wave-like amplitude variation
      const waveShape = Math.sin(i * 0.001) * 0.3 + 0.7;
      crashData[i] = brownNoise * waveShape * 0.5;
    }
    
    const crashSource = context.createBufferSource();
    crashSource.buffer = crashBuffer;
    crashSource.loop = true;
    
    // 432 Hz "Earth Frequency" mixed with crashes
    const healing432 = context.createOscillator();
    healing432.frequency.setValueAtTime(432, context.currentTime); // Natural tuning frequency
    healing432.type = 'triangle';
    
    const healing432Gain = context.createGain();
    healing432Gain.gain.value = 0.08; // Subtle but present
    
    // Filter for natural crash sound
    const crashFilter = context.createBiquadFilter();
    crashFilter.type = 'bandpass';
    crashFilter.frequency.setValueAtTime(300, context.currentTime);
    crashFilter.Q.setValueAtTime(0.8, context.currentTime);
    
    const crashGain = context.createGain();
    crashGain.gain.value = 0.3;
    
    // Wave crash timing with 432 Hz modulation
    const crashLFO = context.createOscillator();
    crashLFO.frequency.setValueAtTime(0.13, context.currentTime);
    crashLFO.type = 'triangle';
    
    const crashLFOGain = context.createGain();
    crashLFOGain.gain.value = 0.25;
    
    crashLFO.connect(crashLFOGain);
    crashLFOGain.connect(crashGain.gain);
    crashLFOGain.connect(healing432Gain.gain); // Modulate 432 Hz with waves
    
    crashSource.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(gain);
    
    healing432.connect(healing432Gain);
    healing432Gain.connect(gain);
    
    // 3. 528 Hz "Love Frequency" with foam/bubbles
    const foamBuffer = context.createBuffer(1, context.sampleRate * 6, context.sampleRate);
    const foamData = foamBuffer.getChannelData(0);
    
    // Generate realistic foam/bubble sounds
    for (let i = 0; i < foamData.length; i++) {
      let foam = 0;
      
      // Multiple layers of high-frequency noise for bubbles
      for (let j = 0; j < 3; j++) {
        foam += (Math.random() * 2 - 1) * Math.pow(0.5, j);
      }
      
      // Add crackling effect for bubbles
      const crackle = Math.random() > 0.98 ? (Math.random() * 2 - 1) * 0.3 : 0;
      foamData[i] = (foam + crackle) * 0.15;
    }
    
    const foamSource = context.createBufferSource();
    foamSource.buffer = foamBuffer;
    foamSource.loop = true;
    
    // 528 Hz "Miracle/Love Frequency" (DNA repair)
    const healing528 = context.createOscillator();
    healing528.frequency.setValueAtTime(528, context.currentTime); // Love frequency
    healing528.type = 'sine';
    
    const healing528Gain = context.createGain();
    healing528Gain.gain.value = 0.06; // Gentle but therapeutic
    
    // High-pass filter for foam
    const foamFilter = context.createBiquadFilter();
    foamFilter.type = 'highpass';
    foamFilter.frequency.setValueAtTime(1500, context.currentTime);
    
    const foamGain = context.createGain();
    foamGain.gain.value = 0.12;
    
    // Gentle foam modulation with 528 Hz
    const foamLFO = context.createOscillator();
    foamLFO.frequency.setValueAtTime(0.5, context.currentTime); // Slow, peaceful
    foamLFO.type = 'sine';
    
    const foamLFOGain = context.createGain();
    foamLFOGain.gain.value = 0.04;
    
    foamLFO.connect(foamLFOGain);
    foamLFOGain.connect(foamGain.gain);
    foamLFOGain.connect(healing528Gain.gain); // Gentle 528 Hz modulation
    
    foamSource.connect(foamFilter);
    foamFilter.connect(foamGain);
    foamGain.connect(gain);
    
    healing528.connect(healing528Gain);
    healing528Gain.connect(gain);
    
    // 4. Binaural beats for anxiety relief (Alpha waves 8-12 Hz)
    if (soundscape.alphaCarrier && soundscape.alphaBeat) {
      // Left ear: Base carrier + 396 Hz harmonics
      const leftAlpha = context.createOscillator();
      leftAlpha.frequency.setValueAtTime(soundscape.alphaCarrier, context.currentTime);
      leftAlpha.type = 'sine';
      
      // Right ear: Carrier + alpha beat for relaxation
      const rightAlpha = context.createOscillator();
      rightAlpha.frequency.setValueAtTime(soundscape.alphaCarrier + soundscape.alphaBeat, context.currentTime);
      rightAlpha.type = 'sine';
      
      const alphaGain = context.createGain();
      alphaGain.gain.value = 0.03; // Very subtle binaural beats
      
      const leftPanner = context.createStereoPanner();
      leftPanner.pan.value = -1;
      
      const rightPanner = context.createStereoPanner();
      rightPanner.pan.value = 1;
      
      leftAlpha.connect(leftPanner);
      leftPanner.connect(alphaGain);
      
      rightAlpha.connect(rightPanner);
      rightPanner.connect(alphaGain);
      
      alphaGain.connect(gain);
      
      oscillators.push(leftAlpha, rightAlpha);
      leftAlpha.start();
      rightAlpha.start();
    }
    
    // 5. Gentle water wash with healing frequency harmonics
    const washBuffer = context.createBuffer(1, context.sampleRate * 10, context.sampleRate);
    const washData = washBuffer.getChannelData(0);
    
    // Generate gentle water movement
    for (let i = 0; i < washData.length; i++) {
      let wash = 0;
      for (let octave = 0; octave < 4; octave++) {
        wash += (Math.random() * 2 - 1) / Math.pow(2, octave * 0.7);
      }
      washData[i] = wash * 0.2;
    }
    
    const washSource = context.createBufferSource();
    washSource.buffer = washBuffer;
    washSource.loop = true;
    
    // Filter for gentle water movement
    const washFilter = context.createBiquadFilter();
    washFilter.type = 'bandpass';
    washFilter.frequency.setValueAtTime(150, context.currentTime);
    washFilter.Q.setValueAtTime(0.4, context.currentTime);
    
    const washGain = context.createGain();
    washGain.gain.value = 0.15;
    
    // Very slow wash rhythm
    const washLFO = context.createOscillator();
    washLFO.frequency.setValueAtTime(0.07, context.currentTime);
    washLFO.type = 'sine';
    
    const washLFOGain = context.createGain();
    washLFOGain.gain.value = 0.1;
    
    washLFO.connect(washLFOGain);
    washLFOGain.connect(washGain.gain);
    
    washSource.connect(washFilter);
    washFilter.connect(washGain);
    washGain.connect(gain);
    
    // Start all components
    deepBase.start();
    healing396.start();
    mainWaveLFO.start();
    crashSource.start();
    healing432.start();
    crashLFO.start();
    foamSource.start();
    healing528.start();
    foamLFO.start();
    washSource.start();
    washLFO.start();
    
    // Store all components for cleanup
    oscillators.push(
      deepBase, healing396, mainWaveLFO, crashSource, healing432, crashLFO,
      foamSource, healing528, foamLFO, washSource, washLFO
    );
    setOscillator(oscillators);
    
    console.log('🌊✨ Healing Ocean Waves: 396Hz (Liberation) + 432Hz (Earth) + 528Hz (Love) + Alpha binaural beats + Realistic ocean sounds');
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

  const showCompletionNotification = () => {
    console.log('🎉 Session completed at:', timezoneUtils.formatLocalDateTime(new Date()));
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Meditation Complete! 🎉', {
        body: `Great job! You completed your ${targetTime}-minute meditation session.`,
        icon: '/meditation-icon.png'
      });
    }
    
    // Optional: Play a gentle completion sound
    try {
      const completionTone = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBhqXy/HVgzQIHm/J7+OZSA8PU6fm77BdGAcugtTxzD2sLYPs7lkgCBl5gQEDgVs+l4G6tGEcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEcBhqXy/HVgzQIHm/J7+OZSA8PU6fm77BdGAc=');
      completionTone.volume = 0.3;
      completionTone.play().catch(() => {}); // Ignore errors
    } catch (error) {
      // Ignore audio errors
    }
  };

  const startSession = async (duration, type, soundscape) => {
    const now = timezoneUtils.getCurrentLocalTime();
    
    console.log('🌍 Starting meditation session in timezone:', timezoneUtils.getUserTimezone());
    console.log('🧘 Session start time:', timezoneUtils.formatLocalDateTime(now));
    console.log('🎵 Selected soundscape:', soundscape);
    
    setTargetTime(duration);
    // Don't reset currentSoundscape here - keep the user's selection
    setSessionTime(0);
    setIsSessionActive(true);
    setIsPaused(false);
    setDeepStateAchieved(false);
    setSessionStartTime(now);
    
    // Request wake lock to prevent screen sleep
    const wakeLockSuccess = await requestWakeLock();
    if (!wakeLockSuccess) {
      console.log('🔒 Wake lock failed, using fallback methods');
      // Start fallback keep-awake methods
      const fallbackInterval = startFallbackKeepAwake();
      if (fallbackInterval) {
        // Store the interval for cleanup
        intervalRef.current = fallbackInterval;
      }
    }
    
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
    console.log('🎯 Target duration:', targetTime, 'minutes');
    console.log('✅ Session completed?', sessionTime >= targetTime * 60);
    
    // Release wake lock
    releaseWakeLock();
    
    // Stop audio first
    if (oscillator) {
      if (Array.isArray(oscillator)) {
        // Multiple oscillators (binaural beats, harmonics, ocean waves)
        oscillator.forEach(osc => {
          try {
            if (osc.stop) {
              osc.stop();
            } else if (osc.disconnect) {
              osc.disconnect();
            }
          } catch (error) {
            console.log('Oscillator cleanup:', error);
          }
        });
      } else {
        // Single oscillator
        try {
          if (oscillator.stop) {
            oscillator.stop();
          } else if (oscillator.disconnect) {
            oscillator.disconnect();
          }
        } catch (error) {
          console.log('Oscillator cleanup:', error);
        }
      }
      setOscillator(null);
    }
    
    if (audioContext) {
      try {
        await audioContext.close();
      } catch (error) {
        console.log('AudioContext cleanup:', error);
      }
      setAudioContext(null);
    }
    
    // Update session state
    setIsSessionActive(false);
    setIsPaused(false);
    
    // Auto-log session if it was substantial (>1 minute)
    if (sessionTime >= 60) {
      console.log('💾 Auto-logging session (duration >= 1 minute)');
      console.log('🔍 Session time check:', sessionTime, 'seconds');
      console.log('🔍 Firebase user:', firebaseUser?.uid);
      console.log('🔍 Session start time:', sessionStartTime);
      
      try {
        await autoLogSession();
        console.log('✅ Auto-log completed successfully');
      } catch (error) {
        console.error('❌ Auto-log failed:', error);
      }
    } else {
      console.log('⚠️ Session too short, not logging (< 1 minute)');
    }
    
    console.log('🔇 Audio stopped and session ended successfully');
  };

  const autoLogSession = async () => {
    if (!firebaseUser?.uid || !sessionStartTime) return;
    
    try {
      console.log('📝 Auto-logging session with timezone data');
      console.log('🧘 Session start time:', timezoneUtils.formatLocalDateTime(sessionStartTime));
      console.log('⏰ Session duration:', Math.floor(sessionTime / 60), 'minutes');
      
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
        userTimezone: timezoneUtils.getUserTimezone(),
        notes: formData.notes,
        sentiment: formData.notes ? analyzeSentiment(formData.notes)?.score : null
      };
      
      console.log('📊 Session data being saved:', sessionData);
      
      const response = await meditationService.logMeditation(firebaseUser.uid, sessionData);
      console.log('✅ API Response:', response);
      
      // Add timezone formatting to the new meditation
      const newMeditation = {
        ...response.meditation,
        localDate: timezoneUtils.formatLocalDate(response.meditation.date),
        localDateTime: timezoneUtils.formatLocalDateTime(response.meditation.date),
        relativeTime: timezoneUtils.getRelativeTime(response.meditation.date),
        isToday: timezoneUtils.isToday(response.meditation.date)
      };
      
      console.log('🔄 Adding meditation to UI:', newMeditation);
      console.log('📅 Is today?', newMeditation.isToday);
      console.log('📅 Local date:', newMeditation.localDate);
      
      // Add to the beginning of the meditations array (newest first)
      setMeditations(prev => {
        const updated = [newMeditation, ...prev];
        console.log('📋 Updated meditations list:', updated.length, 'total');
        return updated;
      });
      
      console.log('✅ Session auto-logged and added to UI successfully');
      
    } catch (error) {
      console.error('💥 Error auto-logging session:', error);
      console.error('💥 Error details:', error.message);
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
      
      // After logging, analyze sentiment and extract keywords
      const sentimentResult = analyzeSentiment(formData.notes);
      setSentimentFeedback(sentimentResult);
      setKeywords(extractKeywords(formData.notes));

      // When logging meditation, include sentiment
      if (!editMode) {
        const submitDataWithSentiment = {
          ...submitData,
          sentiment: sentimentResult ? sentimentResult.score : null
        };
        const response = await meditationService.logMeditation(firebaseUser.uid, submitDataWithSentiment);
        
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
    <div 
      className="meditation-page"
      // onClick={(e) => {
      //   console.log('🖱️ Page clicked:', e.target.className, e.target.tagName);
      // }}
    >
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
              {/* Wake Lock Status Indicator */}
              <div className="wake-lock-status">
                {wakeLockActive ? (
                  <span className="wake-lock-active" title="Screen will stay awake during meditation">
                    🔒 Screen Awake
                  </span>
                ) : wakeLockSupported ? (
                  <span className="wake-lock-inactive" title="Screen may sleep during meditation">
                    ⚠️ Screen May Sleep
                  </span>
                ) : (
                  <span className="wake-lock-unsupported" title="Wake lock not supported on this device">
                    📱 Using Fallback
                  </span>
                )}
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
                className="meditation-progress-fill" 
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
          
          {/* Soundscape Selection - Moved to top with instructions */}
          <div className="soundscape-section">
            <h3>🎵 Step 1: Choose Your Soundscape</h3>
            <div className="soundscape-instructions">
              <p>Select a soundscape below (or choose silence for quiet meditation). Click again to deselect.</p>
            </div>
            <div className="soundscape-grid">
              {Object.entries(soundscapes).map(([key, soundscape]) => (
                <div 
                  key={key} 
                  className={`soundscape-option ${soundscape.premium ? 'premium' : ''} ${currentSoundscape === key ? 'selected' : ''} ${soundscape.premium && !isPremium ? 'locked' : ''}`}
                >
                  <div className="soundscape-header">
                    <span className="soundscape-icon">{soundscape.icon}</span>
                    {soundscape.premium && !isPremium && (
                      <span className="premium-badge">PRO</span>
                    )}
                  </div>
                  
                  <div 
                    className="soundscape-content"
                    onClick={(e) => {
                      // Prevent event bubbling to parent elements
                      e.stopPropagation();
                      e.preventDefault();
                      
                      console.log('🎵 Soundscape clicked:', key, 'current selection:', currentSoundscape);
                      
                      if (!soundscape.premium || isPremium) {
                        // Toggle selection - if already selected, deselect to silence
                        if (currentSoundscape === key) {
                          console.log('🔇 Deselecting soundscape to silence');
                          setCurrentSoundscape('silence');
                        } else {
                          console.log('🔊 Selecting soundscape:', key);
                          setCurrentSoundscape(key);
                        }
                      } else {
                        // Show premium gate or alert for non-premium users
                        alert('This soundscape requires Clarity Premium. Upgrade to access premium features!');
                      }
                    }}
                  >
                    <h4>{soundscape.name}</h4>
                    <p className="soundscape-description">{soundscape.description}</p>
                    <small className="neurological-note">{soundscape.neurological}</small>
                  </div>
                  
                  {soundscape.premium && !isPremium && (
                    <div className="premium-overlay">
                      <span className="lock-icon">🔒</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Start Grid - Step 2 */}
          <div className="quick-start-grid">
            <h3>⏰ Step 2: Choose Your Session</h3>
            {Object.entries(meditationTypes).map(([key, type]) => (
              <div key={key} className={`meditation-type ${type.premium ? 'premium' : ''}`}>
                <div className="type-header">
                  <span className="type-icon">{type.icon}</span>
                  <h3>{type.name}</h3>
                  {/* FIX: Only show PRO badge for non-premium users */}
                  {type.premium && !isPremium && <span className="premium-badge">PRO</span>}
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
                      className={`duration-btn`}
                      disabled={type.premium && !isPremium}
                    >
                      {duration}min
                    </button>
                  ))}
                </div>
              </div>
            ))}
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

      {/* After the form or log, show feedback */}
      {sentimentFeedback && (
        <div className="sentiment-feedback">
          {sentimentFeedback.score > 0 && "Your note sounds positive! 😊"}
          {sentimentFeedback.score < 0 && "Your note sounds a bit negative. 😟"}
          {sentimentFeedback.score === 0 && "Your note sounds neutral. 😐"}
          {keywords.length > 0 && (
            <div className="keywords">
              <strong>Keywords:</strong> {keywords.join(', ')}
            </div>
          )}
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
          {/* <button
            className="primary-button"
            onClick={startStripeUpgrade}
            style={{ marginTop: '1rem' }}
          >
            Upgrade with Stripe
          </button> */}
        </div>
      </PremiumGate>
    </div>
  );
}

export default Meditation;