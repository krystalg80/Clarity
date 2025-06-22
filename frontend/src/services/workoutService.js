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

export const workoutService = {
  // Log workout (replaces Redux logWorkout)
  async logWorkout(userId, workoutData) {
    try {
      console.log('🔧 Service received data:', { userId, workoutData });
      
      // Fix date handling - use current time instead of midnight
      const workoutDate = workoutData.date ? new Date(workoutData.date) : new Date();
      
      // If the date is just a date string (no time), set to current time of day
      if (workoutData.date && workoutData.date.includes('T00:00:00')) {
        workoutDate.setHours(new Date().getHours(), new Date().getMinutes());
      }
      
      const docData = {
        title: workoutData.title,
        type: workoutData.type || 'General',
        durationMinutes: workoutData.durationMinutes,
        date: workoutDate, // Use the fixed date
        notes: workoutData.notes || '',
        caloriesBurned: workoutData.caloriesBurned || 0,
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('💾 Saving to Firestore with date:', docData.date);
      
      const docRef = await addDoc(collection(db, `users/${userId}/workouts`), docData);
      
      return { 
        id: docRef.id, 
        success: true,
        workout: { ...workoutData, id: docRef.id, completed: true }
      };
    } catch (error) {
      console.error('💥 Service error:', error);
      throw new Error('Error logging workout: ' + error.message);
    }
  },

  // Fetch user workouts (replaces Redux fetchWorkoutsByUser)
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
        date: doc.data().date?.toDate() // Convert Firestore timestamp
      }));
      
      return { workouts };
    } catch (error) {
      throw new Error('Error fetching workouts: ' + error.message);
    }
  },

  // Update workout (replaces Redux updateWorkout)
  async updateWorkout(userId, workoutId, updates) {
    try {
      const docRef = doc(db, `users/${userId}/workouts`, workoutId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return { 
        success: true,
        workout: { id: workoutId, ...updates }
      };
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map(doc => doc.data());
      
      const totalMinutes = workouts.reduce((sum, workout) => 
        sum + (workout.durationMinutes || 0), 0
      );
      
      const totalCalories = workouts.reduce((sum, workout) => 
        sum + (workout.caloriesBurned || 0), 0
      );
      
      return {
        totalWorkouts: workouts.length,
        totalMinutes,
        totalCalories,
        workouts: workouts.slice(0, 5) // Recent 5 for dashboard
      };
    } catch (error) {
      throw new Error('Error fetching workout summary: ' + error.message);
    }
  },

  // Get workout summary for a specific day (for dashboard)
  async getDailyWorkoutSummary(userId, date = new Date()) {
    try {
      // Convert date to start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      
      // Calculate daily stats - remove the completed filter
      const totalMinutes = workouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);
      const completedWorkouts = workouts.length; // All logged workouts are considered completed
      const caloriesBurned = workouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
      
      // Most recent workout details
      const lastWorkout = workouts.length > 0 ? workouts[0] : null;
      
      // Workout types today
      const workoutTypes = [...new Set(workouts.map(w => w.type))];
      const mostCommonType = this.getMostCommonWorkoutType(workouts);
      
      return {
        date: date.toISOString().split('T')[0],
        totalWorkouts: workouts.length,
        completedWorkouts,
        totalMinutes,
        caloriesBurned,
        lastWorkout,
        workoutTypes,
        mostCommonType,
        workouts: workouts, // Full workout data if needed
        
        // Quick stats for dashboard cards
        hasWorkoutsToday: workouts.length > 0,
        averageIntensity: this.calculateAverageIntensity(workouts),
        timeOfLastWorkout: lastWorkout?.date || null
      };
    } catch (error) {
      console.error('Error fetching daily workout summary:', error);
      return {
        date: date.toISOString().split('T')[0],
        totalWorkouts: 0,
        completedWorkouts: 0,
        totalMinutes: 0,
        caloriesBurned: 0,
        lastWorkout: null,
        workoutTypes: [],
        mostCommonType: null,
        workouts: [],
        hasWorkoutsToday: false,
        averageIntensity: 0,
        timeOfLastWorkout: null
      };
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

  calculateAverageIntensity(workouts) {
    if (workouts.length === 0) return 0;
    const totalIntensity = workouts.reduce((sum, w) => sum + (w.intensity || 5), 0);
    return Math.round(totalIntensity / workouts.length);
  }
};

export default workoutService;