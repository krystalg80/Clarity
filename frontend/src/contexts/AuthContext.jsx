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

  // Replace your calculateTrialStatus function with this:
  const calculateTrialStatus = (trialStartDate, trialEndDate) => {
    if (!trialStartDate || !trialEndDate) return { isTrialActive: false, daysRemaining: 0 };
    
    // Handle Firebase timestamp objects
    const trialEnd = trialEndDate.seconds ? new Date(trialEndDate.seconds * 1000) : new Date(trialEndDate);
    const now = new Date();
    
    const isTrialActive = now < trialEnd;
    const daysRemaining = Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000));
    
    return {
      isTrialActive,
      daysRemaining: Math.max(0, daysRemaining),
      trialEndDate: trialEnd
    };
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        
        // Use the ACTUAL trial dates from Firestore, not createdAt
        const trialStatus = calculateTrialStatus(profileData.trialStartDate, profileData.trialEndDate);
        
        console.log('🔍 Profile Data:', profileData);
        console.log('📅 Trial Status:', trialStatus);
        
        // Only auto-downgrade if trial is ACTUALLY expired
        if (profileData.subscription === 'trial' && !trialStatus.isTrialActive) {
          await updateDoc(doc(db, 'users', userId), {
            subscription: 'free',
            subscriptionStatus: 'trial_expired',
            updatedAt: new Date()
          });
          profileData.subscription = 'free';
          profileData.subscriptionStatus = 'trial_expired';
        }
        
        setUserProfile({ ...profileData, ...trialStatus });
        setUserSubscription(profileData.subscription);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Sign up with subscription choice
  const signup = async (email, password, additionalData = {}) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      const userProfile = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        subscription: 'trial', // Everyone starts with trial
        subscriptionStatus: 'trial_active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // 14 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: additionalData.firstName || '',
        lastName: additionalData.lastName || '',
        goals: {
          workout: additionalData.workoutGoal || 30,
          water: additionalData.waterGoal || 64,
          meditation: additionalData.meditationGoal || 15
        }
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      
      setUserProfile(userProfile);
      setUserSubscription('trial');
      
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
          subscriptionStatus: 'premium_paid',
          premiumStartDate: new Date(),
          updatedAt: new Date()
        });
        
        setUserSubscription('premium');
        setUserProfile(prev => ({
          ...prev,
          subscription: 'premium',
          subscriptionStatus: 'premium_paid'
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
    isPremium: userSubscription === 'premium' || userSubscription === 'trial',
    isTrialActive: userProfile?.isTrialActive || false,
    trialDaysRemaining: userProfile?.daysRemaining || 0,
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