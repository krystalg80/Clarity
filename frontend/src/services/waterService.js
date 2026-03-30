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
import timezoneUtils from '../utils/timezone';

export const waterService = {
  // Log water intake (replaces Redux logWaterIntake)
  async logWaterIntake(userId, waterData) {
    try {
      const docData = {
        amount: waterData.amount,
        date: timezoneUtils.toLocalTimezone(waterData.date || new Date()),
        userId,
        createdAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone(),
        sentiment: waterData.sentiment || null // Store sentiment
      };
      
      const docRef = await addDoc(collection(db, `users/${userId}/waterIntake`), docData);
      
      return { 
        id: docRef.id, 
        success: true,
        waterIntake: { ...waterData, id: docRef.id }
      };
    } catch (error) {
      throw new Error('Error logging water intake: ' + error.message);
    }
  },

  // Fetch user water intake (replaces Redux fetchWaterIntakeByUser)
  async fetchWaterIntakeByUser(userId, days = 30) {
    try {
      const startDate = timezoneUtils.getStartOfDay(new Date());
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const waterIntakes = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          date: data.date?.toDate ? data.date.toDate() : data.date // Convert Firestore timestamp
        };
      });
      
      return { waterIntakes };
    } catch (error) {
      throw new Error('Error fetching water intake: ' + error.message);
    }
  },

  // Update water intake (replaces Redux updateWaterIntake)
  async updateWaterIntake(userId, waterId, updates) {
    try {
      const docRef = doc(db, `users/${userId}/waterIntake`, waterId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return { 
        success: true,
        waterIntake: { id: waterId, ...updates }
      };
    } catch (error) {
      throw new Error('Error updating water intake: ' + error.message);
    }
  },

  // Delete water intake (replaces Redux deleteWaterIntake)
  async deleteWaterIntake(userId, waterId) {
    try {
      await deleteDoc(doc(db, `users/${userId}/waterIntake`, waterId));
      return { 
        success: true,
        message: 'Water intake deleted successfully' 
      };
    } catch (error) {
      throw new Error('Error deleting water intake: ' + error.message);
    }
  },

  // Get today's water intake for dashboard
  async getTodayWaterIntake(userId) {
    try {
      // Use timezone utilities to get proper start/end of day
      const today = timezoneUtils.getStartOfDay(new Date());
      const tomorrow = timezoneUtils.getEndOfDay(new Date());
      tomorrow.setMilliseconds(tomorrow.getMilliseconds() + 1); // Add 1ms to make it exclusive
      
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', today),
        where('date', '<', tomorrow),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const todayIntakes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          date: data.date?.toDate ? data.date.toDate() : data.date
        };
      });
      
      const totalOz = todayIntakes.reduce((sum, intake) => 
        sum + (intake.amount || 0), 0
      );
      
      return {
        totalOz,
        intakeCount: todayIntakes.length,
        intakes: todayIntakes
      };
    } catch (error) {
      throw new Error('Error fetching today\'s water intake: ' + error.message);
    }
  },

  // Get water summary for progress tracking (Plus tier feature)
  async getWaterSummary(userId) {
    try {
      const { startDate, endDate } = timezoneUtils.getCurrentWeekRange();

      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const waterIntakes = snapshot.docs.map(doc => doc.data());

      // Group by date for charts
      const dailyTotals = {};
      waterIntakes.forEach(intake => {
        const dateKey = intake.date.toDate().toDateString();
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + intake.amount;
      });

      const totalOz = waterIntakes.reduce((sum, intake) => 
        sum + (intake.amount || 0), 0
      );

      // Avoid division by zero
      const daysInWeek = 7;
      const averageOz = daysInWeek > 0 ? totalOz / daysInWeek : 0;

      return {
        totalOz,
        averageOz,
        dailyTotals,
        intakeCount: waterIntakes.length
      };
    } catch (error) {
      throw new Error('Error fetching water summary: ' + error.message);
    }
  },

  // Get water intake for a specific day (for dashboard)
  async getDailyWaterIntake(userId, date = new Date()) {
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
      const waterEntries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      
      const totalOz = waterEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalOz,
        totalEntries: waterEntries.length,
        entries: waterEntries,
        hasWaterToday: waterEntries.length > 0,
        userTimezone: timezoneUtils.getUserTimezone()
      };
    } catch (error) {
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalOz: 0,
        totalEntries: 0,
        entries: [],
        hasWaterToday: false,
        userTimezone: timezoneUtils.getUserTimezone()
      };
    }
  },

  // Get water analytics for sentiment insights
  async getWaterAnalytics(userId, days = 30) {
    try {
      const response = await this.fetchWaterIntakeByUser(userId, days);
      const entries = response.waterIntakes;
      if (entries.length === 0) {
        return {
          totalEntries: 0,
          averageAmount: 0,
          averageSentiment: 0,
          sentimentTrend: 'neutral',
        };
      }
      const totalAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
      const sentimentScores = entries.map(e => typeof e.sentiment === 'number' ? e.sentiment : 0);
      const averageSentiment = sentimentScores.length > 0 ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0;
      let sentimentTrend = 'neutral';
      if (averageSentiment > 0) sentimentTrend = 'positive';
      else if (averageSentiment < 0) sentimentTrend = 'negative';
      return {
        totalEntries: entries.length,
        averageAmount: totalAmount / entries.length,
        averageSentiment,
        sentimentTrend,
      };
    } catch (error) {
      throw new Error('Error fetching water analytics: ' + error.message);
    }
  },

  // Get personalized water recommendations based on sentiment
  async getPersonalizedWaterRecommendations(userId) {
    try {
      const analytics = await this.getWaterAnalytics(userId);
      const recommendations = [];
      if (analytics.averageSentiment < 0) {
        recommendations.push({
          type: 'sentiment',
          message: 'Your water intake notes have been a bit negative. Try associating hydration with positive routines or rewards!',
          action: 'Pair water breaks with something you enjoy.'
        });
      }
      if (analytics.averageAmount < 32) {
        recommendations.push({
          type: 'hydration',
          message: 'Your average daily water intake is below recommended levels. Aim for at least 64oz per day.',
          action: 'Set reminders to drink more water.'
        });
      }
      return { recommendations };
    } catch (error) {
      throw new Error('Error generating water recommendations: ' + error.message);
    }
  },

  // Helper function
  calculateHourlyWaterIntake(entries) {
    const hourlyData = {};
    entries.forEach(entry => {
      const hour = entry.date.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + entry.amount;
    });
    return hourlyData;
  }
};

export default waterService;