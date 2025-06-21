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
  }
};

export default meditationService;