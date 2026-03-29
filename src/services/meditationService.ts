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

export const meditationService = {
  async logMeditation(userId: string, meditationData: any) {
    try {
      const docData = {
        title: meditationData.title || 'Meditation Session',
        type: meditationData.type || 'mindfulness',
        soundscape: meditationData.soundscape || 'silence',
        durationMinutes: meditationData.durationMinutes,
        targetDuration: meditationData.targetDuration || meditationData.durationMinutes,
        completed: meditationData.completed || false,
        deepStateAchieved: meditationData.deepStateAchieved || false,
        date: timezoneUtils.toLocalTimezone(meditationData.date || new Date()),
        notes: meditationData.notes || '',
        moodBefore: meditationData.moodBefore || '',
        moodAfter: meditationData.moodAfter || '',
        guidedSession: meditationData.guidedSession || false,
        interruptions: meditationData.interruptions || 0,
        brainwaveFrequency: meditationData.brainwaveFrequency || null,
        focusLevel: meditationData.focusLevel || null,
        createdAt: timezoneUtils.getCurrentLocalTime(),
        updatedAt: timezoneUtils.getCurrentLocalTime(),
        userTimezone: timezoneUtils.getUserTimezone(),
        sentiment: meditationData.sentiment || null,
      };
      const docRef = await addDoc(collection(db, `users/${userId}/meditations`), docData);
      return { id: docRef.id, success: true, meditation: { ...docData, id: docRef.id } };
    } catch (error: any) {
      throw new Error('Error logging meditation: ' + error.message);
    }
  },

  async fetchMeditationsByUser(userId: string, days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate(),
      }));
      return { meditations };
    } catch (error: any) {
      throw new Error('Error fetching meditations: ' + error.message);
    }
  },

  async updateMeditation(userId: string, meditationId: string, updates: any) {
    try {
      const docRef = doc(db, `users/${userId}/meditations`, meditationId);
      await updateDoc(docRef, { ...updates, updatedAt: new Date() });
      return { success: true, meditation: { id: meditationId, ...updates } };
    } catch (error: any) {
      throw new Error('Error updating meditation: ' + error.message);
    }
  },

  async deleteMeditation(userId: string, meditationId: string) {
    try {
      await deleteDoc(doc(db, `users/${userId}/meditations`, meditationId));
      return { success: true };
    } catch (error: any) {
      throw new Error('Error deleting meditation: ' + error.message);
    }
  },

  async getMeditationSummary(userId: string) {
    try {
      const { startDate, endDate } = timezoneUtils.getCurrentWeekRange();
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map((d) => d.data());
      const totalMinutes = meditations.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
      const deepStateSessions = meditations.filter((m) => m.deepStateAchieved).length;
      return {
        totalSessions: meditations.length,
        totalMinutes,
        averageDuration: meditations.length > 0 ? totalMinutes / meditations.length : 0,
        deepStateSuccessRate: meditations.length > 0 ? (deepStateSessions / meditations.length) * 100 : 0,
      };
    } catch (error: any) {
      throw new Error('Error fetching meditation summary: ' + error.message);
    }
  },

  async getDailyMeditationSummary(userId: string, date: Date = new Date()) {
    try {
      const startOfDay = timezoneUtils.getStartOfDay(date);
      const endOfDay = timezoneUtils.getEndOfDay(date);
      const q = query(
        collection(db, `users/${userId}/meditations`),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const meditations = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), date: d.data().date?.toDate() }));
      const totalMinutes = meditations.reduce((sum, m: any) => sum + (m.durationMinutes || 0), 0);
      const deepStateAchieved = meditations.filter((m: any) => m.deepStateAchieved).length;
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalSessions: meditations.length,
        completedSessions: meditations.filter((m: any) => m.completed).length,
        totalMinutes,
        deepStateAchieved,
        hasSessionsToday: meditations.length > 0,
        mostRecentType: meditations.length > 0 ? (meditations[0] as any).type : 'mindfulness',
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    } catch (error) {
      return {
        date: timezoneUtils.formatLocalDate(date),
        totalSessions: 0,
        completedSessions: 0,
        totalMinutes: 0,
        deepStateAchieved: 0,
        hasSessionsToday: false,
        mostRecentType: 'mindfulness',
        userTimezone: timezoneUtils.getUserTimezone(),
      };
    }
  },

  async getPersonalizedRecommendations(userId: string) {
    try {
      const summary = await this.getMeditationSummary(userId);
      const recommendations: any[] = [];
      if (summary.totalSessions === 0) return { recommendations };
      if (summary.averageDuration < 5) {
        recommendations.push({
          type: 'duration',
          message: 'Try longer sessions (7-10 minutes) to achieve deeper states',
          action: 'Increase session length',
        });
      }
      return { recommendations };
    } catch (error: any) {
      throw new Error('Error generating recommendations: ' + error.message);
    }
  },
};

export default meditationService;
