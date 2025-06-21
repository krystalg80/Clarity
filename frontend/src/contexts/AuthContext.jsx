// filepath: /Users/krystalgaldamez/Desktop/Capstone Final/Clarity/frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userSubscription, setUserSubscription] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user profile and subscription info
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUserProfile(null);
        setUserSubscription('free');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        setUserProfile(profileData);
        setUserSubscription(profileData.subscription || 'free');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Sign up with subscription choice
  const signup = async (email, password, additionalData = {}) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userProfile = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        subscription: additionalData.subscription || 'free',
        subscriptionDate: additionalData.subscription === 'premium' ? new Date() : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add other profile fields
        firstName: additionalData.firstName || '',
        lastName: additionalData.lastName || '',
        goals: {
          workout: additionalData.workoutGoal || 30, // minutes per day
          water: additionalData.waterGoal || 64, // oz per day
          meditation: additionalData.meditationGoal || 15 // minutes per day
        }
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      
      setUserProfile(userProfile);
      setUserSubscription(userProfile.subscription);
      
      return { success: true, user: firebaseUser };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  // Login
  const login = async (email, password) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: firebaseUser };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setUserSubscription('free');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Upgrade to Premium
  const upgradeToPremium = async () => {
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          subscription: 'premium',
          subscriptionDate: new Date(),
          updatedAt: new Date()
        });
        
        setUserSubscription('premium');
        
        // Update local profile
        setUserProfile(prev => ({
          ...prev,
          subscription: 'premium',
          subscriptionDate: new Date()
        }));
        
        return { success: true };
      }
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      throw error;
    }
  };

  // Cancel Subscription (downgrade to free)
  const cancelSubscription = async () => {
    try {
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          subscription: 'free',
          subscriptionCancelledAt: new Date(),
          updatedAt: new Date()
        });
        
        setUserSubscription('free');
        
        // Update local profile
        setUserProfile(prev => ({
          ...prev,
          subscription: 'free',
          subscriptionCancelledAt: new Date()
        }));
        
        return { success: true };
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    userSubscription,
    isPremium: userSubscription === 'premium',
    loading,
    signup,
    login,
    logout,
    upgradeToPremium,
    cancelSubscription,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};