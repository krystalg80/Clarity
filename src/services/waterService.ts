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

export const waterService = {
  async logWaterIntake(userId: string, waterData: any) {
    try {
      const docData = {
        amount: waterData.amount,
        date: timezoneUtils.toLocalTimezone(waterData.date || new Date()),
        userId,
        createdAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone(),
        sentiment: waterData.sentiment || null,
      };
      const docRef = await addDoc(collection(db, `users/${userId}/waterIntake`), docData);
      return { id: docRef.id, success: true, waterIntake: { ...waterData, id: docRef.id } };
    } catch (error: any) {
      throw new Error('Error logging water intake: ' + error.message);
    }
  },

  async fetchWaterIntakeByUser(userId: string, days: number = 30) {
    try {
      const startDate = timezoneUtils.getStartOfDay(new Date());
      startDate.setDate(startDate.getDate() - days);
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const waterIntakes = snapshot.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, date: data.date?.toDate ? data.date.toDate() : data.date };
      });
      return { waterIntakes };
    } catch (error: any) {
      throw new Error('Error fetching water intake: ' + error.message);
    }
  },

  async updateWaterIntake(userId: string, waterId: string, updates: any) {
    try {
      const docRef = doc(db, `users/${userId}/waterIntake`, waterId);
      await updateDoc(docRef, { ...updates, updatedAt: new Date() });
      return { success: true, waterIntake: { id: waterId, ...updates } };
    } catch (error: any) {
      throw new Error('Error updating water intake: ' + error.message);
    }
  },

  async deleteWaterIntake(userId: string, waterId: string) {
    try {
      await deleteDoc(doc(db, `users/${userId}/waterIntake`, waterId));
      return { success: true };
    } catch (error: any) {
      throw new Error('Error deleting water intake: ' + error.message);
    }
  },

  async getTodayWaterIntake(userId: string) {
    try {
      const today = timezoneUtils.getStartOfDay(new Date());
      const tomorrow = timezoneUtils.getEndOfDay(new Date());
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', today),
        where('date', '<', tomorrow),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const todayIntakes = snapshot.docs.map((d) => {
        const data = d.data();
        return { ...data, date: data.date?.toDate ? data.date.toDate() : data.date };
      });
      const totalOz = todayIntakes.reduce((sum, intake) => sum + (intake.amount || 0), 0);
      return { totalOz, intakeCount: todayIntakes.length, intakes: todayIntakes };
    } catch (error: any) {
      throw new Error("Error fetching today's water intake: " + error.message);
    }
  },

  async getWaterSummary(userId: string) {
    try {
      const { startDate, endDate } = timezoneUtils.getCurrentWeekRange();
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const waterIntakes = snapshot.docs.map((d) => d.data());
      const totalOz = waterIntakes.reduce((sum, intake) => sum + (intake.amount || 0), 0);
      const averageOz = totalOz / 7;
      return { totalOz, averageOz, intakeCount: waterIntakes.length };
    } catch (error: any) {
      throw new Error('Error fetching water summary: ' + error.message);
    }
  },

  async getDailyWaterIntake(userId: string, date: Date = new Date()) {
    try {
      const startOfDay = timezoneUtils.getStartOfDay(date);
      const endOfDay = timezoneUtils.getEndOfDay(date);
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const waterEntries = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate(),
      }));
      const totalOz = waterEntries.reduce((sum, entry: any) => sum + (entry.amount || 0), 0);
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalOz,
        totalEntries: waterEntries.length,
        entries: waterEntries,
        hasWaterToday: waterEntries.length > 0,
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    } catch (error) {
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalOz: 0,
        totalEntries: 0,
        entries: [],
        hasWaterToday: false,
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    }
  },

  async getPersonalizedWaterRecommendations(userId: string) {
    try {
      const response = await this.fetchWaterIntakeByUser(userId);
      const entries = response.waterIntakes;
      const recommendations: any[] = [];
      const totalAmount = entries.reduce((sum, e: any) => sum + (e.amount || 0), 0);
      const averageAmount = entries.length > 0 ? totalAmount / entries.length : 0;
      if (averageAmount < 32) {
        recommendations.push({
          type: 'hydration',
          message: 'Your average daily water intake is below recommended levels. Aim for at least 64oz per day.',
          action: 'Set reminders to drink more water.',
        });
      }
      return { recommendations };
    } catch (error: any) {
      throw new Error('Error generating water recommendations: ' + error.message);
    }
  },
};

export default waterService;
