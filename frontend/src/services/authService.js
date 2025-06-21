import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export const authService = {
  // Register new user (replaces Redux session actions)
  async register(userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        exerciseGoalMinutes: userData.exerciseGoalMinutes || 30,
        waterGoalOz: userData.waterGoalOz || 64,
        meditationGoalMinutes: userData.meditationGoalMinutes || 10,
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
  }
};

export default authService;