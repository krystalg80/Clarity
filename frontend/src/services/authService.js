import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Add points to user profile
async function addPoints(userId, amount) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let currentPoints = 0;
    if (userDoc.exists() && typeof userDoc.data().points === 'number') {
      currentPoints = userDoc.data().points;
    }
    await updateDoc(userRef, {
      points: currentPoints + amount,
      updatedAt: new Date()
    });
    return { success: true, newPoints: currentPoints + amount };
  } catch (error) {
    console.error('Error adding points:', error);
    return { success: false, error };
  }
}

// Deduct points from user profile
async function deductPoints(userId, amount) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let currentPoints = 0;
    if (userDoc.exists() && typeof userDoc.data().points === 'number') {
      currentPoints = userDoc.data().points;
    }
    if (currentPoints < amount) {
      return { success: false, error: 'Not enough points' };
    }
    await updateDoc(userRef, {
      points: currentPoints - amount,
      updatedAt: new Date()
    });
    return { success: true, newPoints: currentPoints - amount };
  } catch (error) {
    console.error('Error deducting points:', error);
    return { success: false, error };
  }
}

// Get current points for user
async function getPoints(userId) {
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

// Mark a challenge as completed for a user (daily or weekly)
async function completeChallenge(userId, challengeId, period = 'daily') {
  try {
    const today = new Date();
    let periodKey;
    if (period === 'daily') {
      periodKey = today.toISOString().split('T')[0]; // e.g., '2024-06-30'
    } else if (period === 'weekly') {
      // Use ISO week string, e.g., '2024-W27'
      const year = today.getFullYear();
      const week = Math.ceil(((today - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      periodKey = `${year}-W${week}`;
    } else {
      periodKey = 'unknown';
    }
    const challengeRef = doc(db, `users/${userId}/challenges`, `${challengeId}_${periodKey}`);
    await setDoc(challengeRef, {
      challengeId,
      period,
      periodKey,
      completedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error completing challenge:', error);
    return { success: false, error };
  }
}

// Check if a challenge is already completed for a user (daily or weekly)
async function isChallengeCompleted(userId, challengeId, period = 'daily') {
  try {
    const today = new Date();
    let periodKey;
    if (period === 'daily') {
      periodKey = today.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const year = today.getFullYear();
      const week = Math.ceil(((today - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      periodKey = `${year}-W${week}`;
    } else {
      periodKey = 'unknown';
    }
    const challengeRef = doc(db, `users/${userId}/challenges`, `${challengeId}_${periodKey}`);
    const challengeDoc = await getDoc(challengeRef);
    return challengeDoc.exists();
  } catch (error) {
    console.error('Error checking challenge completion:', error);
    return false;
  }
}

export const authService = {
  // Register new user (replaces Redux session actions)
  async register(userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );

      // Create user document in Firestore with TRIAL FIELDS
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        exerciseGoalMinutes: userData.exerciseGoalMinutes || 30,
        waterGoalOz: userData.waterGoalOz || 64,
        meditationGoalMinutes: userData.meditationGoalMinutes || 10,
        
        // ADD THESE TRIAL FIELDS:
        subscription: 'trial',
        subscriptionStatus: 'trial_active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // 14 days from now
        
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { user: userCredential.user };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Login user (replaces session login)
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user };
    } catch (error) {
      throw new Error('Invalid credentials');
    }
  },

  // Logout user (replaces session logout)
  async logout() {
    try {
      await signOut(auth);
      return { message: 'success' };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Get user profile (replaces profile fetch)
  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      return { user: { id: userId, ...userDoc.data() } };
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Update user profile (replaces profile update)
  async updateUserProfile(userId, updates) {
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        ...updates,
        updatedAt: new Date()
      }, { merge: true });
      
      return { user: { id: userId, ...updates } };
    } catch (error) {
      throw new Error('Error updating profile: ' + error.message);
    }
  },

  addPoints,
  deductPoints,
  getPoints,
  completeChallenge,
  isChallengeCompleted
};

export default authService;