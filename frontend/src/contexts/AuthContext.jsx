import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Add ref to track if component is mounted
  const isMounted = useRef(true);

  // Calculate trial status function
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
        
        // Only update state if component is still mounted
        if (!isMounted.current) return;
        
        // Only auto-downgrade if trial is ACTUALLY expired
        if (profileData.subscription === 'trial' && !trialStatus.isTrialActive) {
          const updatedProfile = {
            ...profileData,
            subscription: 'free',
            subscriptionStatus: 'trial_expired',
            updatedAt: new Date()
          };
          
          await updateDoc(doc(db, 'users', userId), {
            subscription: 'free',
            subscriptionStatus: 'trial_expired',
            updatedAt: new Date()
          });
          
          // Check again before updating state
          if (isMounted.current) {
            setUserProfile({ ...updatedProfile, ...trialStatus });
            setUserSubscription('free');
          }
        } else {
          // Check again before updating state
          if (isMounted.current) {
            setUserProfile({ ...profileData, ...trialStatus });
            setUserSubscription(profileData.subscription);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set loading to false even on error to prevent infinite loading
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      try {
        // Only update state if component is still mounted
        if (!isMounted.current) return;
        
        setUser(firebaseUser);
        setIsAuthenticated(!!firebaseUser);
        
        if (firebaseUser) {
          // Fetch user profile and subscription info
          await fetchUserProfile(firebaseUser.uid);
        } else {
          // Only update state if component is still mounted
          if (isMounted.current) {
            setUserProfile(null);
            setUserSubscription('free');
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        // Only update state if component is still mounted
        if (isMounted.current) {
          setLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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
        exerciseGoalMinutes: additionalData.exerciseGoalMinutes || 30,
        waterGoalOz: additionalData.waterGoalOz || 64,
        meditationGoalMinutes: additionalData.meditationGoalMinutes || 10
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Calculate trial status for new user
        const trialStatus = calculateTrialStatus(userProfile.trialStartDate, userProfile.trialEndDate);
        setUserProfile({ ...userProfile, ...trialStatus });
        setUserSubscription('trial');
      }
      
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
      console.log('✅ Login successful, Firebase will trigger auth state change');
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
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setUser(null);
        setUserProfile(null);
        setUserSubscription('free');
        setIsAuthenticated(false);
      }
      
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
        const updates = {
          subscription: 'premium',
          subscriptionStatus: 'premium_paid',
          premiumStartDate: new Date(),
          updatedAt: new Date()
        };
        
        await updateDoc(doc(db, 'users', user.uid), updates);
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setUserSubscription('premium');
          setUserProfile(prev => ({
            ...prev,
            ...updates
          }));
        }
        
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
        const updates = {
          subscription: 'free',
          subscriptionCancelledAt: new Date(),
          updatedAt: new Date()
        };
        
        await updateDoc(doc(db, 'users', user.uid), updates);
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setUserSubscription('free');
          setUserProfile(prev => ({
            ...prev,
            ...updates
          }));
        }
        
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
    isAuthenticated,
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