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
      const docRef = await addDoc(collection(db, `users/${userId}/workouts`), {
        title: workoutData.title,
        type: workoutData.type || 'General', // Cardio, Strength, Yoga, etc.
        durationMinutes: workoutData.durationMinutes,
        date: new Date(workoutData.date),
        notes: workoutData.notes || '',
        caloriesBurned: workoutData.caloriesBurned || 0,
        // Future: Will sync with Apple Health data
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return { 
        id: docRef.id, 
        success: true,
        workout: { ...workoutData, id: docRef.id }
      };
    } catch (error) {
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
  }
};

export default workoutService;