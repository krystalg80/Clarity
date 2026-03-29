import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/authService';
import { workoutService } from '../../src/services/workoutService';
import { waterService } from '../../src/services/waterService';
import { meditationService } from '../../src/services/meditationService';
import affirmations from '../../src/data/affirmations';
import timezoneUtils from '../../src/utils/timezone';
import colors from '../../src/theme/colors';

function getRandomAffirmation() {
  return affirmations[Math.floor(Math.random() * affirmations.length)];
}

function WelcomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const features = [
    'Log meditation sessions and track calm streaks',
    'Track your daily water intake',
    'Log workouts and exercise minutes',
    'Write diary entries and journal thoughts',
    'Get AI-powered wellness recommendations',
    'Earn points and redeem rewards',
  ];
  const premiumFeatures = [
    'Personalized AI Coach',
    'Premium soundscapes',
    'Exclusive challenges and badges',
    'Advanced analytics',
  ];
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={wm.overlay}>
        <View style={wm.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={wm.title}>Welcome to Clarity</Text>
            <Text style={wm.intro}>Your personal wellness companion</Text>
            <Text style={wm.sectionLabel}>WHAT YOU CAN DO</Text>
            {features.map((f, i) => (
              <View key={i} style={wm.featureRow}>
                <View style={wm.dot} />
                <Text style={wm.featureText}>{f}</Text>
              </View>
            ))}
            <Text style={[wm.sectionLabel, { color: colors.diamond, marginTop: 20 }]}>PREMIUM FEATURES</Text>
            {premiumFeatures.map((f, i) => (
              <View key={i} style={wm.featureRow}>
                <View style={[wm.dot, { backgroundColor: colors.diamond }]} />
                <Text style={wm.featureText}>{f}</Text>
              </View>
            ))}
            <TouchableOpacity style={wm.button} onPress={onClose}>
              <Text style={wm.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const wm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40, maxHeight: '80%' },
  title: { fontSize: 24, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  intro: { fontSize: 14, color: colors.textMid, marginBottom: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 12 },
  featureText: { fontSize: 14, color: colors.textMid, flex: 1 },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});

export default function DashboardScreen() {
  const router = useRouter();
  const { user: firebaseUser, loading: authLoading, isPremium } = useAuth();

  const [userProfile, setUserProfile] = useState<any>(null);
  const [dailyData, setDailyData] = useState({
    workout: { totalMinutes: 0, sessions: 0, hasWorkoutsToday: false, calories: 0 },
    meditation: { totalMinutes: 0, sessions: 0, hasSessionsToday: false },
    water: { totalOz: 0, entries: 0, hasWaterToday: false },
  });
  const [exerciseGoalMinutes, setExerciseGoalMinutes] = useState(30);
  const [meditationGoalMinutes, setMeditationGoalMinutes] = useState(10);
  const [waterGoalOz, setWaterGoalOz] = useState(64);
  const [affirmation, setAffirmation] = useState(getRandomAffirmation());
  const [isLoading, setIsLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);

  useEffect(() => {
    const checkWelcome = async () => {
      if (!firebaseUser?.uid) return;
      const key = `clarity_welcome_shown_${firebaseUser.uid}`;
      const shown = await AsyncStorage.getItem(key);
      if (!shown) { setShowWelcomeModal(true); await AsyncStorage.setItem(key, 'true'); }
    };
    checkWelcome();
  }, [firebaseUser?.uid]);

  useEffect(() => {
    const loadAffirmation = async () => {
      const stored = await AsyncStorage.getItem('affirmation');
      const storedDate = await AsyncStorage.getItem('affirmationDate');
      const today = new Date().toISOString().split('T')[0];
      if (stored && storedDate === today) { setAffirmation(stored); }
      else {
        const next = getRandomAffirmation();
        setAffirmation(next);
        await AsyncStorage.setItem('affirmation', next);
        await AsyncStorage.setItem('affirmationDate', today);
      }
    };
    loadAffirmation();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!firebaseUser?.uid) return;
      try {
        setIsLoading(true);
        const today = timezoneUtils.getCurrentLocalTime();
        const profileResponse = await authService.getUserProfile(firebaseUser.uid);
        setUserProfile(profileResponse.user);
        setExerciseGoalMinutes(profileResponse.user.exerciseGoalMinutes || 30);
        setMeditationGoalMinutes(profileResponse.user.meditationGoalMinutes || 10);
        setWaterGoalOz(profileResponse.user.waterGoalOz || 64);

        const [workoutData, meditationData, waterData] = await Promise.all([
          workoutService.getDailyWorkoutSummary(firebaseUser.uid, today),
          meditationService.getDailyMeditationSummary(firebaseUser.uid, today),
          waterService.getDailyWaterIntake(firebaseUser.uid, today),
        ]);

        setDailyData({
          workout: { totalMinutes: workoutData.totalMinutes || 0, sessions: workoutData.totalWorkouts || 0, hasWorkoutsToday: workoutData.hasWorkoutsToday || false, calories: (workoutData as any).caloriesBurned || 0 },
          meditation: { totalMinutes: meditationData.totalMinutes || 0, sessions: meditationData.totalSessions || 0, hasSessionsToday: meditationData.hasSessionsToday || false },
          water: { totalOz: waterData.totalOz || 0, entries: waterData.totalEntries || 0, hasWaterToday: (waterData.totalOz || 0) > 0 },
        });

        const points = await authService.getPoints(firebaseUser.uid);
        setUserPoints(points);
      } catch {}
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [firebaseUser?.uid]);

  useEffect(() => {
    const checkTrial = async () => {
      if (userProfile?.subscriptionStatus === 'trial_expired' && userProfile?.subscription === 'free') {
        const dontRemind = await AsyncStorage.getItem('dontRemindTrial');
        const lastReminded = await AsyncStorage.getItem('lastTrialReminded');
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        if (!dontRemind && (!lastReminded || Date.now() - Number(lastReminded) > oneWeek)) {
          setShowTrialModal(true);
          await AsyncStorage.setItem('lastTrialReminded', String(Date.now()));
        }
      }
    };
    checkTrial();
  }, [userProfile]);

  useEffect(() => {
    const fetchRecs = async () => {
      if (!firebaseUser?.uid) return;
      try {
        const [meditationRec, waterRec, workoutRec] = await Promise.all([
          meditationService.getPersonalizedRecommendations(firebaseUser.uid),
          waterService.getPersonalizedWaterRecommendations(firebaseUser.uid),
          workoutService.getPersonalizedWorkoutRecommendations(firebaseUser.uid),
        ]);
        const all = [...(meditationRec?.recommendations || []), ...(waterRec?.recommendations || []), ...(workoutRec?.recommendations || [])].slice(0, 3);
        const hasLogs = dailyData.workout.totalMinutes > 0 || dailyData.meditation.totalMinutes > 0 || dailyData.water.totalOz > 0;
        setRecommendations(hasLogs ? all : []);
      } catch { setRecommendations([]); }
    };
    fetchRecs();
  }, [firebaseUser?.uid, dailyData]);

  if (authLoading || isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!userProfile) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const workoutProgress = Math.min((dailyData.workout.totalMinutes / exerciseGoalMinutes) * 100, 100) || 0;
  const meditationProgress = Math.min((dailyData.meditation.totalMinutes / meditationGoalMinutes) * 100, 100) || 0;
  const waterProgress = Math.min((dailyData.water.totalOz / waterGoalOz) * 100, 100) || 0;
  const allGoalsHit = workoutProgress >= 100 && meditationProgress >= 100 && waterProgress >= 100;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <WelcomeModal visible={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />

      {/* Greeting */}
      <View style={s.greetingRow}>
        <View>
          <Text style={s.greetingText}>Good {getTimeOfDay()}, {userProfile.firstName}</Text>
          <Text style={s.greetingSubtitle}>Here's your day so far</Text>
        </View>
        <View style={s.pointsPill}>
          <Text style={s.pointsValue}>{userPoints}</Text>
          <Text style={s.pointsLabel}>pts</Text>
        </View>
      </View>

      {/* Progress Rings */}
      <View style={s.ringsCard}>
        <RingCard
          label="Meditate"
          current={dailyData.meditation.totalMinutes}
          goal={meditationGoalMinutes}
          unit="min"
          progress={meditationProgress}
          color={colors.meditationPurple}
          onPress={() => router.push('/(tabs)/meditation')}
        />
        <View style={s.ringDivider} />
        <RingCard
          label="Water"
          current={dailyData.water.totalOz}
          goal={waterGoalOz}
          unit="oz"
          progress={waterProgress}
          color={colors.waterBlue}
          onPress={() => router.push('/(tabs)/water')}
        />
      </View>

      {allGoalsHit && (
        <View style={s.celebrationCard}>
          <Text style={s.celebrationText}>All daily goals achieved!</Text>
        </View>
      )}

      {/* Quick Actions */}
      <Text style={s.sectionLabel}>QUICK LOG</Text>
      <View style={s.quickActionsRow}>
        {[
          { label: 'Meditate', color: colors.meditationPurple, route: '/(tabs)/meditation' },
          { label: 'Water', color: colors.waterBlue, route: '/(tabs)/water' },
          { label: 'Notes', color: colors.primary, route: '/(tabs)/notes' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={s.quickAction} onPress={() => router.push(item.route as any)}>
            <View style={[s.quickActionDot, { backgroundColor: item.color }]} />
            <Text style={s.quickActionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Affirmation */}
      <View style={s.affirmationCard}>
        <Text style={s.affirmationLabel}>DAILY AFFIRMATION</Text>
        <Text style={s.affirmationText}>"{affirmation}"</Text>
      </View>

      {/* AI Coach */}
      {isPremium && (
        <View style={s.aiCard}>
          <View style={s.aiCardHeader}>
            <Text style={s.aiCardTitle}>AI Coach</Text>
            <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>PREMIUM</Text></View>
          </View>
          {recommendations.length > 0 ? recommendations.map((rec, i) => (
            <View key={i} style={s.aiMessage}>
              <Text style={s.aiMessageText}>{rec.message}</Text>
              {rec.action && <Text style={s.aiAction}>{rec.action}</Text>}
            </View>
          )) : (
            <Text style={s.aiEmptyText}>
              Log a workout, meditation, or water entry and I'll start giving you personalized tips.
            </Text>
          )}
        </View>
      )}

      {/* Trial expired modal */}
      <Modal visible={showTrialModal} transparent animationType="fade">
        <View style={wm.overlay}>
          <View style={wm.modal}>
            <Text style={wm.title}>Your trial has ended</Text>
            <Text style={[wm.featureText, { marginBottom: 20, marginTop: 8 }]}>
              Upgrade to keep your AI Coach and premium features.
            </Text>
            <TouchableOpacity style={wm.button} onPress={() => { setShowTrialModal(false); router.push('/(tabs)/profile'); }}>
              <Text style={wm.buttonText}>View Upgrade Options</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dismissLink} onPress={() => setShowTrialModal(false)}>
              <Text style={s.dismissText}>Remind me later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.dismissLink} onPress={async () => { await AsyncStorage.setItem('dontRemindTrial', 'true'); setShowTrialModal(false); }}>
              <Text style={[s.dismissText, { fontSize: 12 }]}>Don't remind me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function RingCard({ label, current, goal, unit, progress, color, onPress }: any) {
  return (
    <TouchableOpacity style={s.ringItem} onPress={onPress} activeOpacity={0.7}>
      <AnimatedCircularProgress
        size={80}
        width={6}
        fill={progress}
        tintColor={color}
        backgroundColor={colors.border}
        rotation={0}
      >
        {() => <Text style={[s.ringPercent, { color }]}>{Math.round(progress)}%</Text>}
      </AnimatedCircularProgress>
      <Text style={s.ringValue}>{current}<Text style={s.ringUnit}> {unit}</Text></Text>
      <Text style={s.ringLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greetingText: { fontSize: 22, fontWeight: '700', color: colors.textDark },
  greetingSubtitle: { fontSize: 13, color: colors.textMid, marginTop: 2 },
  pointsPill: { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  pointsValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  pointsLabel: { fontSize: 10, color: colors.primary, opacity: 0.7 },

  ringsCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  ringItem: { alignItems: 'center', flex: 1 },
  ringDivider: { width: 1, backgroundColor: colors.border },
  ringPercent: { fontSize: 13, fontWeight: '700' },
  ringValue: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: 8 },
  ringUnit: { fontSize: 11, color: colors.textMid, fontWeight: '400' },
  ringLabel: { fontSize: 11, color: colors.textMid, marginTop: 2 },

  celebrationCard: { backgroundColor: colors.success, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16 },
  celebrationText: { color: colors.background, fontWeight: '700', fontSize: 14 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.2, marginBottom: 12, marginTop: 8 },

  quickActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickAction: { flex: 1, backgroundColor: colors.white, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  quickActionDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: colors.textMid },

  affirmationCard: { backgroundColor: colors.primaryLight, borderRadius: 20, padding: 20, marginBottom: 16 },
  affirmationLabel: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 1.2, marginBottom: 10 },
  affirmationText: { fontSize: 16, color: colors.textDark, fontStyle: 'italic', lineHeight: 24 },

  aiCard: { backgroundColor: colors.white, borderRadius: 20, padding: 20, borderLeftWidth: 3, borderLeftColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  aiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  aiCardTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark },
  premiumBadge: { backgroundColor: colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.5 },
  aiMessage: { backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 8 },
  aiMessageText: { fontSize: 14, color: colors.textDark, lineHeight: 20 },
  aiAction: { fontSize: 13, color: colors.primary, marginTop: 6, fontStyle: 'italic' },
  aiEmptyText: { fontSize: 14, color: colors.textMid, lineHeight: 20 },

  dismissLink: { alignItems: 'center', marginTop: 12 },
  dismissText: { color: colors.textMuted, fontSize: 14 },
});
