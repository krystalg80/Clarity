import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export const meditationService = {
  // Log meditation session with detailed tracking
  async logMeditation(userId, meditationData) {
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/meditations`), {
        title: meditationData.title || 'Meditation Session',
        type: meditationData.type || 'mindfulness', // mindfulness, breathing, guided, deep_focus
        soundscape: meditationData.soundscape || 'silence', // rain, ocean, white_noise, forest, etc.
        durationMinutes: meditationData.durationMinutes,
        targetDuration: meditationData.targetDuration || meditationData.durationMinutes,
        completed: meditationData.completed || false,
        deepStateAchieved: meditationData.deepStateAchieved || false, // NEW: Track if user hit deep state
        date: new Date(meditationData.date),
        notes: meditationData.notes || '',
        moodBefore: meditationData.moodBefore || '', // Track mood before
        moodAfter: meditationData.moodAfter || '', // Track mood after
        guidedSession: meditationData.guidedSession || false,
        interruptions: meditationData.interruptions || 0, // Track how many times paused
        heartRateData: meditationData.heartRateData || null, // Future: Apple Health integration
        // Neurological optimization tracking
        brainwaveFrequency: meditationData.brainwaveFrequency || null, // alpha, theta, delta
        focusLevel: meditationData.focusLevel || null, // 1-10 scale
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return { 
        id: docRef.id, 
        success: true,
        meditation: { ...meditationData, id: docRef.id }
      };
    } catch (error) {
      throw new Error('Error logging meditation: ' + error.message);
    }
  },

  // Fetch meditation sessions
  async fetchMeditationsByUser(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      
      return { meditations };
    } catch (error) {
      throw new Error('Error fetching meditations: ' + error.message);
    }
  },

  // Get meditation analytics for neurological insights
  async getMeditationAnalytics(userId, days = 30) {
    try {
      const response = await this.fetchMeditationsByUser(userId, days);
      const sessions = response.meditations;
      
      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          deepStateSuccessRate: 0,
          averageDuration: 0,
          favoriteTime: 'morning',
          favoriteSound: 'silence',
          moodImprovement: 0
        };
      }
      
      // Calculate deep state success rate
      const deepStateSessions = sessions.filter(s => s.deepStateAchieved).length;
      const deepStateSuccessRate = (deepStateSessions / sessions.length) * 100;
      
      // Find patterns
      const soundFrequency = {};
      const timeOfDay = {};
      const moodChanges = [];
      
      sessions.forEach(session => {
        // Sound preferences
        soundFrequency[session.soundscape] = (soundFrequency[session.soundscape] || 0) + 1;
        
        // Time preferences
        const hour = session.date.getHours();
        const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        timeOfDay[timeSlot] = (timeOfDay[timeSlot] || 0) + 1;
        
        // Mood tracking
        if (session.moodBefore && session.moodAfter) {
          const moodValues = {
            '😔': 1, '😰': 2, '😐': 3, '😌': 4, '😊': 5, '🎉': 6
          };
          const before = moodValues[session.moodBefore] || 3;
          const after = moodValues[session.moodAfter] || 3;
          moodChanges.push(after - before);
        }
      });
      
      return {
        totalSessions: sessions.length,
        deepStateSuccessRate: Math.round(deepStateSuccessRate),
        averageDuration: sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / sessions.length,
        favoriteTime: Object.keys(timeOfDay).reduce((a, b) => timeOfDay[a] > timeOfDay[b] ? a : b, 'morning'),
        favoriteSound: Object.keys(soundFrequency).reduce((a, b) => soundFrequency[a] > soundFrequency[b] ? a : b, 'silence'),
        moodImprovement: moodChanges.length > 0 ? moodChanges.reduce((sum, change) => sum + change, 0) / moodChanges.length : 0,
        consistency: sessions.length / days // sessions per day
      };
    } catch (error) {
      throw new Error('Error fetching meditation analytics: ' + error.message);
    }
  },

  // Get personalized recommendations (Pro tier)
  async getPersonalizedRecommendations(userId) {
    try {
      const analytics = await this.getMeditationAnalytics(userId);
      const recommendations = [];
      
      // Analyze success patterns and recommend improvements
      if (analytics.deepStateSuccessRate < 50) {
        recommendations.push({
          type: 'duration',
          message: 'Try longer sessions (7-10 minutes) to achieve deeper states',
          action: 'Increase session length'
        });
      }
      
      if (analytics.favoriteSound === 'silence') {
        recommendations.push({
          type: 'soundscape',
          message: 'Research shows binaural beats can enhance focus. Try our "Deep Focus" soundscape.',
          action: 'Try binaural beats'
        });
      }
      
      if (analytics.consistency < 0.5) {
        recommendations.push({
          type: 'consistency',
          message: `Your best time is ${analytics.favoriteTime}. Set a daily reminder for consistent practice.`,
          action: 'Set daily reminder'
        });
      }
      
      return { recommendations };
    } catch (error) {
      throw new Error('Error generating recommendations: ' + error.message);
    }
  },

  // Update meditation session
  async updateMeditation(userId, meditationId, updates) {
    try {
      const docRef = doc(db, `users/${userId}/meditations`, meditationId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return { 
        success: true,
        meditation: { id: meditationId, ...updates }
      };
    } catch (error) {
      throw new Error('Error updating meditation: ' + error.message);
    }
  },

  // Delete meditation session
  async deleteMeditation(userId, meditationId) {
    try {
      await deleteDoc(doc(db, `users/${userId}/meditations`, meditationId));
      return { 
        success: true,
        message: 'Meditation deleted successfully' 
      };
    } catch (error) {
      throw new Error('Error deleting meditation: ' + error.message);
    }
  },

  // Get meditation summary for dashboard
  async getMeditationSummary(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map(doc => doc.data());
      
      // Fix: Add initial value of 0 to prevent "empty array" error
      const totalMinutes = meditations.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
      const averageDuration = meditations.length > 0 ? totalMinutes / meditations.length : 0;
      
      // Fix: Handle empty array for deep state calculation
      const deepStateRate = meditations.length > 0 
        ? (meditations.filter(m => m.deepStateAchieved).length / meditations.length * 100)
        : 0;
      
      return {
        totalSessions: meditations.length,
        totalMinutes,
        averageDuration,
        deepStateSuccessRate: deepStateRate,
        favoriteSoundscape: meditations.length > 0 ? this.getMostFrequent(meditations, 'soundscape') : 'silence',
        favoriteTime: meditations.length > 0 ? this.getMostFrequent(meditations, 'timeOfDay') : 'morning',
        moodImprovement: this.calculateMoodImprovement(meditations)
      };
    } catch (error) {
      console.error('Error fetching meditation summary:', error);
      throw new Error('Error fetching meditation summary: ' + error.message);
    }
  },
  
  // Helper function: Get most frequent item in an array
  getMostFrequent(array, key) {
    const frequency = {};
    array.forEach(item => {
      const value = key === 'timeOfDay' ? this.getTimeOfDay(item.date) : item[key];
      frequency[value] = (frequency[value] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  },
  
  // Helper function: Get time of day from date
  getTimeOfDay(date) {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  },
  
  // Helper function: Calculate mood improvement
  calculateMoodImprovement(sessions) {
    const moodValues = {
      '😔': 1, '😰': 2, '😐': 3, '😌': 4, '😊': 5, '🎉': 6
    };
    let totalImprovement = 0;
    let count = 0;
    
    sessions.forEach(session => {
      const before = moodValues[session.moodBefore] || 3;
      const after = moodValues[session.moodAfter] || 3;
      totalImprovement += after - before;
      count++;
    });
    
    return count > 0 ? totalImprovement / count : 0;
  },

  // Get meditation summary for a specific day (for dashboard)
  async getDailyMeditationSummary(userId, date = new Date()) {
    try {
      // Convert date to start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      
      // Calculate daily stats using your existing helper functions
      const totalMinutes = meditations.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
      const completedSessions = meditations.filter(m => m.completed).length;
      const averageDuration = meditations.length > 0 ? totalMinutes / meditations.length : 0;
      
      // Deep state achievements today
      const deepStateAchieved = meditations.filter(m => m.deepStateAchieved).length;
      const deepStateRate = meditations.length > 0 ? (deepStateAchieved / meditations.length * 100) : 0;
      
      // Most recent session details
      const lastSession = meditations.length > 0 ? meditations[0] : null;
      
      // Use your existing helper functions
      const favoriteSoundscape = meditations.length > 0 ? this.getMostFrequent(meditations, 'soundscape') : 'silence';
      const favoriteTime = meditations.length > 0 ? this.getMostFrequent(meditations, 'timeOfDay') : 'morning';
      const moodImprovement = this.calculateMoodImprovement(meditations);
      
      return {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        totalSessions: meditations.length,
        completedSessions,
        totalMinutes,
        averageDuration: Math.round(averageDuration * 10) / 10, // Round to 1 decimal
        deepStateAchieved,
        deepStateSuccessRate: Math.round(deepStateRate),
        lastSession,
        favoriteSoundscape,
        favoriteTime,
        moodImprovement: Math.round(moodImprovement * 100) / 100, // Round to 2 decimals
        sessions: meditations, // Full session data if needed
        
        // Quick stats for dashboard cards
        hasSessionsToday: meditations.length > 0,
        mostRecentType: lastSession?.type || 'mindfulness',
        mostRecentSoundscape: lastSession?.soundscape || 'silence',
        timeOfLastSession: lastSession?.date || null,
        totalInterruptions: meditations.reduce((sum, m) => sum + (m.interruptions || 0), 0),
        averageFocusLevel: meditations.length > 0 
          ? meditations.reduce((sum, m) => sum + (m.focusLevel || 5), 0) / meditations.length 
          : 0
      };
    } catch (error) {
      console.error('Error fetching daily meditation summary:', error);
      return {
        date: date.toISOString().split('T')[0],
        totalSessions: 0,
        completedSessions: 0,
        totalMinutes: 0,
        averageDuration: 0,
        deepStateAchieved: 0,
        deepStateSuccessRate: 0,
        lastSession: null,
        favoriteSoundscape: 'silence',
        favoriteTime: 'morning',
        moodImprovement: 0,
        sessions: [],
        hasSessionsToday: false,
        mostRecentType: 'mindfulness',
        mostRecentSoundscape: 'silence',
        timeOfLastSession: null,
        totalInterruptions: 0,
        averageFocusLevel: 0
      };
    }
  },
};

export default meditationService;