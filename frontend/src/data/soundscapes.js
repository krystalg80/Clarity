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