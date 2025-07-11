export const soundscapes = {
  silence: {
    name: 'Silence',
    description: 'Pure silence for traditional meditation',
    icon: '🤫',
    neurological: 'Promotes introspection and self-awareness',
    frequency: null,
    baseFreq: null
  },
  pink_noise_rain: {
    name: 'Pink Noise Rain',
    description: 'Synthetic pink noise for deep relaxation',
    icon: '🌧️',
    neurological: 'Pink noise (1/f) - enhances deep sleep and memory consolidation',
    frequency: 'pink_noise',
    baseFreq: 200, // Pink noise base frequency
    waveType: 'sawtooth'
  },
  alpha_waves: {
    name: 'Ocean Waves',
    description: 'Realistic ocean waves with alpha wave entrainment',
    icon: '🌊',
    neurological: 'Ocean rhythms (0.1 Hz) naturally entrain alpha waves (8-12 Hz) for relaxation',
    frequency: 'ocean_waves', // Change to special ocean type
    waveFrequency: 0.1, // Slow wave rhythm (6 waves per minute)
    baseFreq: 60, // Low rumble frequency
    highFreq: 200, // Higher frequency for foam/bubbles
    alphaCarrier: 200, // Carrier for alpha entrainment
    alphaBeat: 10, // 10 Hz alpha waves
    waveType: 'sine'
  },
  earth_frequency: {
    name: 'Earth Resonance',
    description: 'Schumann resonance for grounding',
    icon: '🌲',
    neurological: 'Earth frequency (7.83 Hz) - natural grounding and balance',
    frequency: 'earth_binaural', // Change to special earth type
    carrierFreq: 136.1, // Audible OM frequency (C# note)
    waveType: 'sine'
  },
  white_noise: {
    name: 'White Noise',
    description: 'Full spectrum noise for focus',
    icon: '📻',
    neurological: 'White noise - masks distractions, improves concentration',
    frequency: 'white_noise',
    baseFreq: 440, // A4 note as base
    waveType: 'square'
  },
  gamma_focus: {
    name: 'Gamma Focus',
    description: 'High-frequency binaural beats for peak concentration',
    icon: '🎧',
    neurological: 'Gamma waves (40 Hz) - heightened awareness and cognitive performance',
    frequency: 'gamma',
    baseFreq: 40, // 40 Hz gamma waves
    binauralBeat: 40, // Gamma binaural beat
    leftEar: 200, // Base carrier frequency left ear
    rightEar: 240, // 200 + 40 = 240 Hz right ear (40 Hz beat)
    waveType: 'sine',
    premium: true
  },
  theta_deep: {
    name: 'Theta Deep State',
    description: 'Deep theta waves for profound meditation',
    icon: '🌙',
    neurological: 'Theta waves (6 Hz) - deep meditation, creativity, and memory consolidation',
    frequency: 'theta',
    baseFreq: 6, // 6 Hz theta waves
    binauralBeat: 6, // Theta binaural beat
    leftEar: 200, // Base carrier frequency left ear
    rightEar: 206, // 200 + 6 = 206 Hz right ear (6 Hz beat)
    waveType: 'sine',
    premium: true
  },
  healing_bowls: {
    name: 'Healing Harmonics',
    description: '432 Hz healing frequency with natural harmonics',
    icon: '🎵',
    neurological: '432 Hz "healing frequency" with harmonic overtones for cellular resonance',
    frequency: 'harmonic',
    baseFreq: 432, // 432 Hz healing frequency
    harmonics: [432, 648, 864, 1296], // Proper harmonic series: 432×1.5, 432×2, 432×3
    waveType: 'triangle',
    premium: true
  },
  
  // Researched Hz Frequencies for Specific Mental States
  delta_deep_sleep: {
    name: 'Delta Deep Sleep',
    description: '0.5-4 Hz for deep sleep and regeneration',
    icon: '😴',
    neurological: 'Delta waves (0.5-4 Hz) - deep sleep, physical healing, and immune system boost',
    frequency: 'delta',
    baseFreq: 2, // 2 Hz delta waves
    binauralBeat: 2,
    leftEar: 200,
    rightEar: 202, // 200 + 2 = 202 Hz
    waveType: 'sine',
    premium: true
  },
  
  theta_creativity: {
    name: 'Theta Creativity',
    description: '4-8 Hz for creativity and insight',
    icon: '🎨',
    neurological: 'Theta waves (4-8 Hz) - enhanced creativity, insight, and problem-solving',
    frequency: 'theta',
    baseFreq: 6, // 6 Hz theta waves
    binauralBeat: 6,
    leftEar: 200,
    rightEar: 206, // 200 + 6 = 206 Hz
    waveType: 'sine',
    premium: true
  },
  
  alpha_relaxation: {
    name: 'Alpha Relaxation',
    description: '8-12 Hz for relaxation and stress reduction',
    icon: '😌',
    neurological: 'Alpha waves (8-12 Hz) - relaxation, stress reduction, and improved learning',
    frequency: 'alpha',
    baseFreq: 10, // 10 Hz alpha waves
    binauralBeat: 10,
    leftEar: 200,
    rightEar: 210, // 200 + 10 = 210 Hz
    waveType: 'sine',
    premium: true
  },
  
  beta_focus: {
    name: 'Beta Focus',
    description: '13-30 Hz for focus and alertness',
    icon: '🎯',
    neurological: 'Beta waves (13-30 Hz) - focused attention, alertness, and cognitive performance',
    frequency: 'beta',
    baseFreq: 20, // 20 Hz beta waves
    binauralBeat: 20,
    leftEar: 200,
    rightEar: 220, // 200 + 20 = 220 Hz
    waveType: 'sine',
    premium: true
  },
  
  gamma_insight: {
    name: 'Gamma Insight',
    description: '30-100 Hz for insight and peak performance',
    icon: '💡',
    neurological: 'Gamma waves (30-100 Hz) - insight, peak performance, and heightened awareness',
    frequency: 'gamma',
    baseFreq: 40, // 40 Hz gamma waves
    binauralBeat: 40,
    leftEar: 200,
    rightEar: 240, // 200 + 40 = 240 Hz
    waveType: 'sine',
    premium: true
  },
  
  // Specific Hz Frequencies for Mental Health
  anxiety_relief_528: {
    name: 'Anxiety Relief (528 Hz)',
    description: '528 Hz frequency for anxiety and stress relief',
    icon: '🧘',
    neurological: '528 Hz "Love frequency" - reduces anxiety, promotes healing, and DNA repair',
    frequency: 'single_tone',
    baseFreq: 528,
    waveType: 'sine',
    premium: true
  },
  
  depression_lift_639: {
    name: 'Depression Lift (639 Hz)',
    description: '639 Hz frequency for emotional balance',
    icon: '🌈',
    neurological: '639 Hz "Connection frequency" - improves relationships, emotional balance, and communication',
    frequency: 'single_tone',
    baseFreq: 639,
    waveType: 'sine',
    premium: true
  },
  
  confidence_boost_741: {
    name: 'Confidence Boost (741 Hz)',
    description: '741 Hz frequency for self-expression and confidence',
    icon: '💪',
    neurological: '741 Hz "Expression frequency" - enhances self-expression, confidence, and creativity',
    frequency: 'single_tone',
    baseFreq: 741,
    waveType: 'sine',
    premium: true
  },
  
  intuition_852: {
    name: 'Intuition (852 Hz)',
    description: '852 Hz frequency for intuition and spiritual awareness',
    icon: '🔮',
    neurological: '852 Hz "Intuition frequency" - enhances intuition, spiritual awareness, and inner wisdom',
    frequency: 'single_tone',
    baseFreq: 852,
    waveType: 'sine',
    premium: true
  },
  
  // Solfeggio Frequencies
  solfeggio_396: {
    name: 'Liberation (396 Hz)',
    description: '396 Hz Solfeggio frequency for fear and guilt release',
    icon: '🕊️',
    neurological: '396 Hz "Liberation frequency" - releases fear, guilt, and negative emotions',
    frequency: 'single_tone',
    baseFreq: 396,
    waveType: 'sine',
    premium: true
  },
  
  solfeggio_417: {
    name: 'Transformation (417 Hz)',
    description: '417 Hz Solfeggio frequency for change and transformation',
    icon: '🦋',
    neurological: '417 Hz "Transformation frequency" - facilitates change, transformation, and new beginnings',
    frequency: 'single_tone',
    baseFreq: 417,
    waveType: 'sine',
    premium: true
  },
  
  solfeggio_963: {
    name: 'Awakening (963 Hz)',
    description: '963 Hz Solfeggio frequency for spiritual awakening',
    icon: '✨',
    neurological: '963 Hz "Awakening frequency" - spiritual awakening, connection to higher consciousness',
    frequency: 'single_tone',
    baseFreq: 963,
    waveType: 'sine',
    premium: true
  }
};

export const meditationTypes = {
  mindfulness: {
    name: 'Mindfulness',
    description: 'Present-moment awareness practice',
    duration: [5, 10, 15, 20],
    icon: '🧘‍♀️'
  },
  breathing: {
    name: 'Breathing',
    description: 'Focused breathwork exercises',
    duration: [3, 5, 10],
    icon: '💨'
  },
  body_scan: {
    name: 'Body Scan',
    description: 'Progressive muscle relaxation',
    duration: [10, 15, 20],
    icon: '🫁'
  },
  loving_kindness: {
    name: 'Loving Kindness',
    description: 'Compassion and heart-opening meditation',
    duration: [5, 10, 15],
    icon: '💖'
  },
  flow_state: {
    name: 'Flow State',
    description: 'Neurologically optimized for peak performance',
    duration: [5, 7, 10],
    icon: '🎯',
    premium: true
  }
};

export default { soundscapes, meditationTypes };