import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  userProfile: any;
  userSubscription: string;
  isAuthenticated: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  loading: boolean;
  signup: (email: string, password: string, additionalData?: any) => Promise<any>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<any>;
  upgradeToPremium: () => Promise<any>;
  cancelSubscription: () => Promise<any>;
  fetchUserProfile: (userId: string) => Promise<void>;
  authKey: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userSubscription, setUserSubscription] = useState('free');
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isMounted = useRef(true);

  const calculateTrialStatus = (trialStartDate: any, trialEndDate: any) => {
    if (!trialStartDate || !trialEndDate) return { isTrialActive: false, daysRemaining: 0 };
    const trialEnd = trialEndDate.seconds ? new Date(trialEndDate.seconds * 1000) : new Date(trialEndDate);
    const now = new Date();
    const isTrialActive = now < trialEnd;
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { isTrialActive, daysRemaining: Math.max(0, daysRemaining), trialEndDate: trialEnd };
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        const trialStatus = calculateTrialStatus(profileData.trialStartDate, profileData.trialEndDate);
        if (!isMounted.current) return;

        if (profileData.subscription === 'trial' && !trialStatus.isTrialActive) {
          const updatedProfile = { ...profileData, subscription: 'free', subscriptionStatus: 'trial_expired', updatedAt: new Date() };
          await updateDoc(doc(db, 'users', userId), { subscription: 'free', subscriptionStatus: 'trial_expired', updatedAt: new Date() });
          if (isMounted.current) {
            setUserProfile({ ...updatedProfile, ...trialStatus });
            setUserSubscription('free');
          }
        } else {
          if (isMounted.current) {
            setUserProfile({ ...profileData, ...trialStatus });
            setUserSubscription(profileData.subscription);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!isMounted.current) return;
        setUser(firebaseUser);
        setIsAuthenticated(!!firebaseUser);
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser.uid);
        } else {
          if (isMounted.current) {
            setUserProfile(null);
            setUserSubscription('free');
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const signup = async (email: string, password: string, additionalData: any = {}) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      const profile = {
        email: firebaseUser.email,
        uid: firebaseUser.uid,
        subscription: 'trial',
        subscriptionStatus: 'trial_active',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        firstName: additionalData.firstName || '',
        lastName: additionalData.lastName || '',
        exerciseGoalMinutes: additionalData.exerciseGoalMinutes || 30,
        waterGoalOz: additionalData.waterGoalOz || 64,
        meditationGoalMinutes: additionalData.meditationGoalMinutes || 10,
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), profile);
      if (isMounted.current) {
        const trialStatus = calculateTrialStatus(profile.trialStartDate, profile.trialEndDate);
        setUserProfile({ ...profile, ...trialStatus });
        setUserSubscription('trial');
      }
      return { success: true, user: firebaseUser };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: firebaseUser };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear welcome shown flag on logout
      if (user?.uid) {
        await AsyncStorage.removeItem(`clarity_welcome_shown_${user.uid}`);
      }
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

  const upgradeToPremium = async () => {
    try {
      if (user?.uid) {
        const updates = { subscription: 'premium', subscriptionStatus: 'premium_paid', premiumStartDate: new Date(), updatedAt: new Date() };
        await updateDoc(doc(db, 'users', user.uid), updates);
        if (isMounted.current) {
          setUserSubscription('premium');
          setUserProfile((prev: any) => ({ ...prev, ...updates }));
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    try {
      if (user?.uid) {
        const updates = { subscription: 'free', subscriptionCancelledAt: new Date(), updatedAt: new Date() };
        await updateDoc(doc(db, 'users', user.uid), updates);
        if (isMounted.current) {
          setUserSubscription('free');
          setUserProfile((prev: any) => ({ ...prev, ...updates }));
        }
        return { success: true };
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
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
    fetchUserProfile,
    authKey: user?.uid || 'no-user',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
