import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import timezoneUtils from '../utils/timezone';

export const workoutService = {
  async logWorkout(userId: string, workoutData: any) {
    try {
      let workoutDate = timezoneUtils.getCurrentLocalTime();
      if (workoutData.date) workoutDate = timezoneUtils.toLocalTimezone(workoutData.date);
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
        sentiment: workoutData.sentiment || null,
      };
      const docRef = await addDoc(collection(db, `users/${userId}/workouts`), docData);
      return { id: docRef.id, success: true, workout: { ...workoutData, id: docRef.id } };
    } catch (error: any) {
      throw new Error('Error logging workout: ' + error.message);
    }
  },

  async fetchWorkoutsByUser(userId: string) {
    try {
      const q = query(collection(db, `users/${userId}/workouts`), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate(),
        localDate: timezoneUtils.formatLocalDate(d.data().date?.toDate()),
        localDateTime: timezoneUtils.formatLocalDateTime(d.data().date?.toDate()),
        relativeTime: timezoneUtils.getRelativeTime(d.data().date?.toDate()),
      }));
      return { workouts };
    } catch (error: any) {
      throw new Error('Error fetching workouts: ' + error.message);
    }
  },

  async updateWorkout(userId: string, workoutId: string, updates: any) {
    try {
      const docRef = doc(db, `users/${userId}/workouts`, workoutId);
      const updateData = {
        ...updates,
        updatedAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone(),
      };
      if (updates.date) updateData.date = timezoneUtils.toLocalTimezone(updates.date);
      await updateDoc(docRef, updateData);
      return { success: true, workout: { id: workoutId, ...updates } };
    } catch (error: any) {
      throw new Error('Error updating workout: ' + error.message);
    }
  },

  async deleteWorkout(userId: string, workoutId: string) {
    try {
      await deleteDoc(doc(db, `users/${userId}/workouts`, workoutId));
      return { success: true };
    } catch (error: any) {
      throw new Error('Error deleting workout: ' + error.message);
    }
  },

  async getWorkoutSummary(userId: string) {
    try {
      const { startDate, endDate } = timezoneUtils.getCurrentWeekRange();
      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }));
      const totalMinutes = workouts.reduce((sum, w: any) => sum + (w.durationMinutes || 0), 0);
      const totalCalories = workouts.reduce((sum, w: any) => sum + (w.caloriesBurned || 0), 0);
      return { totalWorkouts: workouts.length, totalMinutes, totalCalories, workouts: workouts.slice(0, 5) };
    } catch (error: any) {
      throw new Error('Error fetching workout summary: ' + error.message);
    }
  },

  async getDailyWorkoutSummary(userId: string, date: Date = new Date()) {
    try {
      const startDate = timezoneUtils.getStartOfDay(date);
      const endDate = timezoneUtils.getEndOfDay(date);
      const q = query(
        collection(db, `users/${userId}/workouts`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const workouts = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }));
      const totalMinutes = workouts.reduce((sum, w: any) => sum + (w.durationMinutes || 0), 0);
      const caloriesBurned = workouts.reduce((sum, w: any) => sum + (w.caloriesBurned || 0), 0);
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalWorkouts: workouts.length,
        completedWorkouts: workouts.length,
        totalMinutes,
        caloriesBurned,
        lastWorkout: workouts.length > 0 ? workouts[0] : null,
        workouts,
        hasWorkoutsToday: workouts.length > 0,
        mostCommonType: workouts.length > 0 ? this.getMostCommonWorkoutType(workouts) : null,
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    } catch (error) {
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
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    }
  },

  async getPersonalizedWorkoutRecommendations(userId: string) {
    try {
      const response = await this.fetchWorkoutsByUser(userId);
      const entries = response.workouts;
      const recommendations: any[] = [];
      if (entries.length === 0) return { recommendations };
      const totalDuration = entries.reduce((sum, e: any) => sum + (e.durationMinutes || 0), 0);
      const averageDuration = totalDuration / entries.length;
      if (averageDuration < 20) {
        recommendations.push({
          type: 'duration',
          message: 'Your average workout duration is below 20 minutes. Consider increasing your session length for better results.',
          action: 'Try a 30-minute session this week.',
        });
      }
      return { recommendations };
    } catch (error: any) {
      throw new Error('Error generating workout recommendations: ' + error.message);
    }
  },

  getMostCommonWorkoutType(workouts: any[]): string | null {
    if (workouts.length === 0) return null;
    const typeCounts: Record<string, number> = {};
    workouts.forEach((w) => { typeCounts[w.type] = (typeCounts[w.type] || 0) + 1; });
    return Object.keys(typeCounts).reduce((a, b) => (typeCounts[a] > typeCounts[b] ? a : b));
  },
};

export default workoutService;
