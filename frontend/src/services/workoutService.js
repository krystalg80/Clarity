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
      console.log('🌍 Logging workout in timezone:', timezoneUtils.getUserTimezone());
      
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
        userTimezone: timezoneUtils.getUserTimezone()
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
  async getWorkoutSummary(userId, days = 7) {
    try {
      const { startDate, endDate } = timezoneUtils.getLocalDateRange(days);
      
      console.log('🌍 Weekly workout query for timezone:', timezoneUtils.getUserTimezone());
      console.log('📅 Query range:', timezoneUtils.formatLocalDateTime(startDate), 'to', timezoneUtils.formatLocalDateTime(endDate));
      
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
        period: `${days} days`,
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
      
      console.log('🌍 Daily workout query for timezone:', timezoneUtils.getUserTimezone());
      console.log('📅 Query range:', timezoneUtils.formatLocalDateTime(startDate), 'to', timezoneUtils.formatLocalDateTime(endDate));
      
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
      
      console.log('💪 Found workouts for today:', workouts.length);
      
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