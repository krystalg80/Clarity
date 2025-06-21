export const soundscapes = {
  silence: {
    name: 'Silence',
    description: 'Pure silence for traditional meditation',
    icon: '🤫',
    neurological: 'Promotes introspection and self-awareness',
    frequency: null
  },
  rain: {
    name: 'Gentle Rain',
    description: 'Soft rainfall sounds for relaxation',
    icon: '🌧️',
    neurological: 'Pink noise - enhances deep sleep and memory consolidation',
    frequency: 'pink_noise'
  },
  ocean: {
    name: 'Ocean Waves',
    description: 'Rhythmic ocean waves for deep breathing',
    icon: '🌊',
    neurological: 'Natural rhythm promotes alpha brainwaves (8-13 Hz)',
    frequency: 'alpha'
  },
  forest: {
    name: 'Forest Sounds',
    description: 'Birds and rustling leaves for nature connection',
    icon: '🌲',
    neurological: 'Reduces cortisol and activates parasympathetic nervous system',
    frequency: 'natural'
  },
  white_noise: {
    name: 'White Noise',
    description: 'Consistent background for focus',
    icon: '📻',
    neurological: 'Masks distractions, improves concentration',
    frequency: 'white_noise'
  },
  binaural_focus: {
    name: 'Deep Focus',
    description: 'Binaural beats for enhanced concentration',
    icon: '🎧',
    neurological: '40 Hz gamma waves - heightened awareness and focus',
    frequency: 'gamma',
    premium: true // Pro tier feature
  },
  binaural_calm: {
    name: 'Theta Relaxation',
    description: 'Theta waves for deep relaxation',
    icon: '🌙',
    neurological: '6-8 Hz theta waves - deep meditation and creativity',
    frequency: 'theta',
    premium: true // Pro tier feature
  },
  tibetan_bowls: {
    name: 'Tibetan Bowls',
    description: 'Traditional singing bowls',
    icon: '🎵',
    neurological: 'Harmonic frequencies promote mindfulness',
    frequency: 'harmonic',
    premium: true // Plus tier feature
  }
};

export const meditationTypes = {
  mindfulness: {
    name: 'Mindfulness',
    description: 'Present-moment awareness',
    duration: [5, 10, 15, 20],
    icon: '🧘‍♀️'
  },
  breathing: {
    name: 'Breathing',
    description: 'Focused breathing exercises',
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
    description: 'Compassion meditation',
    duration: [5, 10, 15],
    icon: '💖'
  },
  deep_focus: {
    name: 'Deep Focus',
    description: 'Neurologically optimized for flow state',
    duration: [5, 7, 10],
    icon: '🎯',
    premium: true // Pro tier feature
  }
};

export default { soundscapes, meditationTypes };