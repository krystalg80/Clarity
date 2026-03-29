import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

async function addPoints(userId: string, amount: number) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let currentPoints = 0;
    if (userDoc.exists() && typeof userDoc.data().points === 'number') {
      currentPoints = userDoc.data().points;
    }
    await updateDoc(userRef, { points: currentPoints + amount, updatedAt: new Date() });
    return { success: true, newPoints: currentPoints + amount };
  } catch (error) {
    console.error('Error adding points:', error);
    return { success: false, error };
  }
}

async function deductPoints(userId: string, amount: number) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let currentPoints = 0;
    if (userDoc.exists() && typeof userDoc.data().points === 'number') {
      currentPoints = userDoc.data().points;
    }
    if (currentPoints < amount) return { success: false, error: 'Not enough points' };
    await updateDoc(userRef, { points: currentPoints - amount, updatedAt: new Date() });
    return { success: true, newPoints: currentPoints - amount };
  } catch (error) {
    console.error('Error deducting points:', error);
    return { success: false, error };
  }
}

async function getPoints(userId: string): Promise<number> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists() && typeof userDoc.data().points === 'number') {
      return userDoc.data().points;
    }
    return 0;
  } catch (error) {
    console.error('Error getting points:', error);
    return 0;
  }
}

async function completeChallenge(userId: string, challengeId: string, period: string = 'daily') {
  try {
    const today = new Date();
    let periodKey: string;
    if (period === 'daily') {
      periodKey = today.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const year = today.getFullYear();
      const week = Math.ceil(((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      periodKey = `${year}-W${week}`;
    } else {
      periodKey = 'unknown';
    }
    const challengeRef = doc(db, `users/${userId}/challenges`, `${challengeId}_${periodKey}`);
    await setDoc(challengeRef, { challengeId, period, periodKey, completedAt: new Date() });
    return { success: true };
  } catch (error) {
    console.error('Error completing challenge:', error);
    return { success: false, error };
  }
}

async function isChallengeCompleted(userId: string, challengeId: string, period: string = 'daily'): Promise<boolean> {
  try {
    const today = new Date();
    let periodKey: string;
    if (period === 'daily') {
      periodKey = today.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const year = today.getFullYear();
      const week = Math.ceil(((today.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      periodKey = `${year}-W${week}`;
    } else {
      periodKey = 'unknown';
    }
    const challengeRef = doc(db, `users/${userId}/challenges`, `${challengeId}_${periodKey}`);
    const challengeDoc = await getDoc(challengeRef);
    return challengeDoc.exists();
  } catch (error) {
    return false;
  }
}

export const authService = {
  async register(userData: any) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        exerciseGoalMinutes: userData.exerciseGoalMinutes || 30,
        waterGoalOz: userData.waterGoalOz || 64,
        meditationGoalMinutes: userData.meditationGoalMinutes || 10,
        subscription: 'trial',
        subscriptionStatus: 'trial_active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { user: userCredential.user };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user };
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  },

  async logout() {
    try {
      await signOut(auth);
      return { message: 'success' };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  async getUserProfile(userId: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) throw new Error('User not found');
      return { user: { id: userId, ...userDoc.data() } };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  async updateUserProfile(userId: string, updates: any) {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, { ...updates, updatedAt: new Date() }, { merge: true });
      return { user: { id: userId, ...updates } };
    } catch (error: any) {
      throw new Error('Error updating profile: ' + error.message);
    }
  },

  addPoints,
  deductPoints,
  getPoints,
  completeChallenge,
  isChallengeCompleted,
};

export default authService;
