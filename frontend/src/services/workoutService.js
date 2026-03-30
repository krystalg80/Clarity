import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import timezoneUtils from '../utils/timezone';

export const workoutService = {
  // Log workout with timezone awareness
  async logWorkout(userId, workoutData) {
    try {
      
      // Handle date in user's local timezone
      let workoutDate = timezoneUtils.getCurrentLocalTime();
      if (workoutData.date) {
        workoutDate = timezoneUtils.toLocalTimezone(workoutData.date);
      }
      
      const docData = {
        title: workoutData.title,
        type: workoutData.type || 'General',
        durationMinutes: workoutData.durationMinutes,
        date: workoutDate,
        notes: workoutData.notes || '',
        caloriesBurned: workoutData.caloriesBurned || 0,
        completed: true,
        createdAt: timezoneUtils.getCurrentLocalTime(),
        updatedAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone(),
        sentiment: workoutData.sentiment || null // Store sentiment
      };
      
      const docRef = await addDoc(collection(db, `users/${userId}/workouts`), docData);
      return { id: docRef.id, success: true, workout: { ...workoutData, id: docRef.id } };
    } catch (error) {
      throw new Error('Error logging workout: ' + error.message);
    }
  },

  // Fetch workouts with timezone awareness
  async fetchWorkoutsByUser(userId) {
    try {
      const q = query(
        collection(db, `users/${userId}/workouts`),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().date?.toDate(),
        // Add formatted dates for display
        localDate: timezoneUtils.formatLocalDate(doc.data().date?.toDate()),
        localDateTime: timezoneUtils.formatLocalDateTime(doc.data().date?.toDate()),
        relativeTime: timezoneUtils.getRelativeTime(doc.data().date?.toDate())
      }));
      
      return { workouts };
    } catch (error) {
      throw new Error('Error fetching workouts: ' + error.message);
    }
  },

  // Update workout with timezone awareness
  async updateWorkout(userId, workoutId, updates) {
    try {
      const docRef = doc(db, `users/${userId}/workouts`, workoutId);
      const updateData = {
        ...updates,
        updatedAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone()
      };
      
      // If date is being updated, ensure it's in local timezone
      if (updates.date) {
        updateData.date = timezoneUtils.toLocalTimezone(updates.date);
      }
      
      await updateDoc(docRef, updateData);
      return { success: true, workout: { id: workoutId, ...updates } };
    } catch (error) {
      throw new Error('Error updating workout: ' + error.message);
    }
  },

  // Delete workout (replaces Redux deleteWorkout)
  async deleteWorkout(userId, workoutId) {
    try {
      await deleteDoc(doc(db, `users/${userId}/workouts`, workoutId));
      return { 
        success: true,
        message: 'Workout deleted successfully' 
      };
    } catch (error) {
      throw new Error('Error deleting workout: ' + error.message);
    }
  },

  // Get workout summary for dashboard
  async getWorkoutSummary(userId) {
    try {
      const { startDate, endDate } = timezoneUtils.getCurrentWeekRange();

      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));

      const totalMinutes = workouts.reduce((sum, workout) => sum + (workout.durationMinutes || 0), 0);
      const totalCalories = workouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0);

      return {
        totalWorkouts: workouts.length,
        totalMinutes,
        totalCalories,
        workouts: workouts.slice(0, 5),
        period: 'This week',
        userTimezone: timezoneUtils.getUserTimezone()
      };
    } catch (error) {
      throw new Error('Error fetching workout summary: ' + error.message);
    }
  },

  // Get workout summary for a specific day (for dashboard)
  async getDailyWorkoutSummary(userId, date = new Date()) {
    try {
      const { startDate, endDate } = {
        startDate: timezoneUtils.getStartOfDay(date),
        endDate: timezoneUtils.getEndOfDay(date)
      };
      
      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      
      const totalMinutes = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
      const totalWorkouts = workouts.length;
      const caloriesBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalWorkouts,
        completedWorkouts: totalWorkouts,
        totalMinutes,
        caloriesBurned,
        lastWorkout: workouts.length > 0 ? workouts[0] : null,
        workouts,
        hasWorkoutsToday: workouts.length > 0,
        mostCommonType: workouts.length > 0 ? this.getMostCommonWorkoutType(workouts) : null,
        userTimezone: timezoneUtils.getUserTimezone()
      };
    } catch (error) {
      console.error('Error fetching daily workout summary:', error);
      return this.getEmptyDailySummary(date);
    }
  },

  // Get workout analytics for sentiment insights
  async getWorkoutAnalytics(userId, days = 30) {
    try {
      const response = await this.fetchWorkoutsByUser(userId);
      const entries = response.workouts;
      if (entries.length === 0) {
        return {
          totalEntries: 0,
          averageDuration: 0,
          averageSentiment: 0,
          sentimentTrend: 'neutral',
        };
      }
      const totalDuration = entries.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);
      const sentimentScores = entries.map(e => typeof e.sentiment === 'number' ? e.sentiment : 0);
      const averageSentiment = sentimentScores.length > 0 ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;
      let sentimentTrend = 'neutral';
      if (averageSentiment > 0) sentimentTrend = 'positive';
      else if (averageSentiment < 0) sentimentTrend = 'negative';
      return {
        totalEntries: entries.length,
        averageDuration: totalDuration / entries.length,
        averageSentiment,
        sentimentTrend,
      };
    } catch (error) {
      throw new Error('Error fetching workout analytics: ' + error.message);
    }
  },

  // Get personalized workout recommendations based on sentiment
  async getPersonalizedWorkoutRecommendations(userId) {
    try {
      const analytics = await this.getWorkoutAnalytics(userId);
      const recommendations = [];
      if (analytics.averageSentiment < 0) {
        recommendations.push({
          type: 'sentiment',
          message: 'Your workout notes have been a bit negative. Try celebrating small wins and focusing on progress, not perfection!',
          action: 'Reflect on what went well after each workout.'
        });
      }
      if (analytics.averageDuration < 20) {
        recommendations.push({
          type: 'duration',
          message: 'Your average workout duration is below 20 minutes. Consider increasing your session length for better results.',
          action: 'Try a 30-minute session this week.'
        });
      }
      return { recommendations };
    } catch (error) {
      throw new Error('Error generating workout recommendations: ' + error.message);
    }
  },

  // Helper functions
  getMostCommonWorkoutType(workouts) {
    if (workouts.length === 0) return null;
    const typeCounts = {};
    workouts.forEach(w => {
      typeCounts[w.type] = (typeCounts[w.type] || 0) + 1;
    });
    return Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
  },

  getEmptyDailySummary(date) {
    return {
      date: timezoneUtils.formatLocalDate(date),
      totalWorkouts: 0,
      completedWorkouts: 0,
      totalMinutes: 0,
      caloriesBurned: 0,
      lastWorkout: null,
      workouts: [],
      hasWorkoutsToday: false,
      mostCommonType: null,
      userTimezone: timezoneUtils.getUserTimezone()
    };
  }
};

export default workoutService;