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

export const waterService = {
  // Log water intake (replaces Redux logWaterIntake)
  async logWaterIntake(userId, waterData) {
    try {
      const docRef = await addDoc(collection(db, `users/${userId}/waterIntake`), {
        amount: waterData.amount, // in oz
        date: new Date(waterData.date),
        notes: waterData.notes || '',
        // Future: Could track type (water, tea, coffee, etc.)
        type: waterData.type || 'water',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const waterIntakes = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        date: doc.data().date?.toDate() // Convert Firestore timestamp
      }));
      
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', today),
        where('date', '<', tomorrow),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const todayIntakes = snapshot.docs.map(doc => doc.data());
      
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
  async getWaterSummary(userId, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const q = query(
        collection(db, `users/${userId}/waterIntake`),
        where('date', '>=', startDate),
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
      
      const averageOz = totalOz / days;
      
      return {
        totalOz,
        averageOz,
        dailyTotals,
        intakeCount: waterIntakes.length
      };
    } catch (error) {
      throw new Error('Error fetching water summary: ' + error.message);
    }
  }
};

export default waterService;