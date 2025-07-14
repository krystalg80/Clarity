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
  getPoints
};

export default authService;