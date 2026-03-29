import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../src/contexts/AuthContext';
import { waterService } from '../../src/services/waterService';
import { meditationService } from '../../src/services/meditationService';
import { authService } from '../../src/services/authService';
import colors from '../../src/theme/colors';

const RING_RADIUS = 45;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percentage, label, current, goal, color }: any) {
  const offset = RING_CIRCUMFERENCE - (Math.min(percentage, 100) / 100) * RING_CIRCUMFERENCE;
  return (
    <View style={s.ringWrapper}>
      <View style={s.ringContainer}>
        <Svg width={120} height={120}>
          <Circle cx={60} cy={60} r={RING_RADIUS} stroke={colors.sage100} strokeWidth={8} fill="transparent" />
          <Circle
            cx={60} cy={60} r={RING_RADIUS}
            stroke={color}
            strokeWidth={8}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            rotation="-90"
            originX="60"
            originY="60"
          />
        </Svg>
        <View style={s.ringTextContainer}>
          <Text style={s.ringValue}>{Math.round(current)}</Text>
          <Text style={s.ringGoal}>/{goal}</Text>
          <Text style={s.ringLabel}>{label}</Text>
        </View>
      </View>
      <Text style={s.ringPercent}>{Math.round(Math.min(percentage, 100))}%</Text>
    </View>
  );
}

export default function GoalsScreen() {
  const { user: firebaseUser, isPremium } = useAuth();

  const [weeklyData, setWeeklyData] = useState({
    water: { current: 0, goal: 448 },
    meditation: { current: 0, goal: 105 },
  });
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customWaterGoal, setCustomWaterGoal] = useState(64);
  const [customMeditationGoal, setCustomMeditationGoal] = useState(15);
  const [userPoints, setUserPoints] = useState(0);
  const [weeklyChallengeClaimed, setWeeklyChallengeClaimed] = useState(false);
  const [diamondWeekClaimed, setDiamondWeekClaimed] = useState(false);
  const [perfectBalanceClaimed, setPerfectBalanceClaimed] = useState(false);
  const [soundscapeActiveUntil, setSoundscapeActiveUntil] = useState<Date | null>(null);

  const getDaysRemainingInWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  };

  const computeAchievements = (data: typeof weeklyData) => {
    const result: any[] = [];
    Object.entries(data).forEach(([key, d]) => {
      const pct = (d.current / d.goal) * 100;
      if (pct >= 125) result.push({ type: key, level: 'diamond', percentage: pct });
      else if (pct >= 100) result.push({ type: key, level: 'gold', percentage: pct });
      else if (pct >= 75) result.push({ type: key, level: 'silver', percentage: pct });
      else if (pct >= 50) result.push({ type: key, level: 'bronze', percentage: pct });
    });
    setAchievements(result);
  };

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const profileResponse = await authService.getUserProfile(firebaseUser.uid);
        const userProfile = profileResponse.user;
        const waGoal = userProfile.waterGoalOz || 64;
        const mGoal = userProfile.meditationGoalMinutes || 15;
        setCustomWaterGoal(waGoal);
        setCustomMeditationGoal(mGoal);

        const [waterData, meditationData] = await Promise.all([
          waterService.getWaterSummary(firebaseUser.uid, 7),
          meditationService.getMeditationSummary(firebaseUser.uid, 7),
        ]);

        const newData = {
          water: { current: waterData.totalOz || 0, goal: waGoal * 7 },
          meditation: { current: meditationData.totalMinutes || 0, goal: mGoal * 7 },
        };
        setWeeklyData(newData);
        computeAchievements(newData);

        const points = await authService.getPoints(firebaseUser.uid);
        setUserPoints(points);

        const [weeklyClaimed, diamondClaimed, perfectClaimed] = await Promise.all([
          authService.isChallengeCompleted(firebaseUser.uid, 'weekly_meditation_3', 'weekly'),
          authService.isChallengeCompleted(firebaseUser.uid, 'diamond_week', 'weekly'),
          authService.isChallengeCompleted(firebaseUser.uid, 'perfect_balance', 'weekly'),
        ]);
        setWeeklyChallengeClaimed(weeklyClaimed);
        setDiamondWeekClaimed(diamondClaimed);
        setPerfectBalanceClaimed(perfectClaimed);

        const soundscapeUntil = userProfile.premiumSoundscapeUntil
          ? new Date(userProfile.premiumSoundscapeUntil)
          : null;
        setSoundscapeActiveUntil(soundscapeUntil);
      } catch {
        Alert.alert('Error', 'Failed to load goals data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [firebaseUser?.uid]);

  const meditationSessionsThisWeek = weeklyData.meditation.current / (customMeditationGoal || 15);
  const weeklyChallengeComplete = meditationSessionsThisWeek >= 3;
  const diamondWeekComplete =
    weeklyData.water.current / weeklyData.water.goal >= 1.25 &&
    weeklyData.meditation.current / weeklyData.meditation.goal >= 1.25;
  const perfectBalanceComplete =
    weeklyData.water.current / weeklyData.water.goal >= 1 &&
    weeklyData.meditation.current / weeklyData.meditation.goal >= 1;

  const now = new Date();
  const soundscapeActive = soundscapeActiveUntil && soundscapeActiveUntil > now;
  const canRedeemSoundscape = userPoints >= 150 && !soundscapeActive;

  const handleClaimWeeklyChallenge = async () => {
    if (!firebaseUser?.uid || weeklyChallengeClaimed || !weeklyChallengeComplete) return;
    await authService.addPoints(firebaseUser.uid, 50);
    await authService.completeChallenge(firebaseUser.uid, 'weekly_meditation_3', 'weekly');
    setWeeklyChallengeClaimed(true);
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    Alert.alert('Claimed!', 'You claimed 50 points for the Weekly Meditation Challenge!');
  };

  const handleClaimDiamondWeek = async () => {
    if (!firebaseUser?.uid || diamondWeekClaimed || !diamondWeekComplete) return;
    await authService.addPoints(firebaseUser.uid, 200);
    await authService.completeChallenge(firebaseUser.uid, 'diamond_week', 'weekly');
    setDiamondWeekClaimed(true);
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    Alert.alert('Claimed!', 'You claimed 200 points for Diamond Week Challenge!');
  };

  const handleClaimPerfectBalance = async () => {
    if (!firebaseUser?.uid || perfectBalanceClaimed || !perfectBalanceComplete) return;
    await authService.addPoints(firebaseUser.uid, 150);
    await authService.completeChallenge(firebaseUser.uid, 'perfect_balance', 'weekly');
    setPerfectBalanceClaimed(true);
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    Alert.alert('Claimed!', 'You claimed 150 points for Perfect Balance Challenge!');
  };

  const handleRedeemSoundscape = async () => {
    if (!firebaseUser?.uid || !canRedeemSoundscape) return;
    await authService.deductPoints(firebaseUser.uid, 150);
    const until = new Date();
    until.setDate(until.getDate() + 7);
    await authService.updateUserProfile(firebaseUser.uid, { premiumSoundscapeUntil: until });
    setSoundscapeActiveUntil(until);
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    Alert.alert('Unlocked!', 'You unlocked Premium Soundscape for 1 week!');
  };

  const handleSaveGoals = async () => {
    if (!firebaseUser?.uid) return;
    setIsSaving(true);
    try {
      await authService.updateUserProfile(firebaseUser.uid, {
        meditationGoalMinutes: customMeditationGoal,
        waterGoalOz: customWaterGoal,
      });
      const newData = {
        water: { ...weeklyData.water, goal: customWaterGoal * 7 },
        meditation: { ...weeklyData.meditation, goal: customMeditationGoal * 7 },
      };
      setWeeklyData(newData);
      computeAchievements(newData);
      Alert.alert('Saved!', 'Your goals have been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save goals.');
    } finally {
      setIsSaving(false);
    }
  };

  const getBadgeEmoji = (level: string) => {
    const map: Record<string, string> = { diamond: '💎', gold: '🥇', silver: '🥈', bronze: '🥉' };
    return map[level] || '⭐';
  };

  const getRingColor = (pct: number) => {
    if (pct >= 100) return colors.sage500;
    if (pct >= 75) return colors.sage300;
    if (pct >= 50) return '#FFD700';
    return colors.sage100;
  };

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const daysRemaining = getDaysRemainingInWeek();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Points Balance */}
      <View style={s.pointsBadge}>
        <Text style={s.pointsText}>⭐ {userPoints} Points</Text>
      </View>

      {/* Header */}
      <Text style={s.screenTitle}>Weekly Goals</Text>
      <Text style={s.subtitle}>Track your progress and earn rewards</Text>
      <View style={s.weekInfo}>
        <Text style={s.weekLabel}>Current Week</Text>
        <Text style={s.daysRemaining}>{daysRemaining === 0 ? 'Last day!' : `${daysRemaining} days remaining`}</Text>
      </View>

      {/* Progress Rings */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Weekly Progress</Text>
        <View style={s.ringsRow}>
          {Object.entries(weeklyData).map(([key, data]) => {
            const pct = (data.current / data.goal) * 100;
            return (
              <ProgressRing
                key={key}
                label={key}
                current={data.current}
                goal={data.goal}
                percentage={pct}
                color={getRingColor(pct)}
              />
            );
          })}
        </View>
      </View>

      {/* Achievement Gallery */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>This Week's Achievements</Text>
        {achievements.length === 0 ? (
          <View style={s.emptyRow}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyText}>Keep going! Your first achievement is waiting.</Text>
          </View>
        ) : (
          <View style={s.achievementsGrid}>
            {achievements.map((ach, i) => (
              <View key={i} style={[s.achievementCard, { borderColor: ach.level === 'diamond' ? '#b9f2ff' : ach.level === 'gold' ? '#FFD700' : ach.level === 'silver' ? '#C0C0C0' : '#CD7F32' }]}>
                <Text style={s.achIcon}>{getBadgeEmoji(ach.level)}</Text>
                <Text style={s.achLevel}>{ach.level.toUpperCase()}</Text>
                <Text style={s.achType}>{ach.type.toUpperCase()}</Text>
                <Text style={s.achPct}>{Math.round(ach.percentage)}%</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Weekly Challenge */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Weekly Challenges</Text>
        <View style={s.challengeCard}>
          <View style={s.challengeHeader}>
            <Text style={s.challengeTitle}>Mindful Monday</Text>
            <Text style={s.challengeReward}>+50 pts</Text>
            <TouchableOpacity
              style={[s.claimBtn, (!weeklyChallengeComplete || weeklyChallengeClaimed) && s.claimBtnDisabled]}
              onPress={handleClaimWeeklyChallenge}
              disabled={!weeklyChallengeComplete || weeklyChallengeClaimed}
            >
              <Text style={s.claimBtnText}>{weeklyChallengeClaimed ? 'Claimed' : 'Claim'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.challengeDesc}>Complete 3 meditation sessions this week</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.min((meditationSessionsThisWeek / 3) * 100, 100)}%` as any }]} />
          </View>
          <Text style={s.challengeStatus}>{Math.floor(meditationSessionsThisWeek)}/3 completed</Text>
        </View>
      </View>

      {/* Exclusive Challenges (Premium) */}
      {isPremium ? (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Exclusive Challenges</Text>

          <View style={s.challengeCard}>
            <View style={s.challengeHeader}>
              <Text style={s.challengeTitle}>💎 Diamond Week</Text>
              <Text style={s.challengeReward}>+200 pts</Text>
              <TouchableOpacity
                style={[s.claimBtn, (!diamondWeekComplete || diamondWeekClaimed) && s.claimBtnDisabled]}
                onPress={handleClaimDiamondWeek}
                disabled={!diamondWeekComplete || diamondWeekClaimed}
              >
                <Text style={s.claimBtnText}>{diamondWeekClaimed ? 'Claimed' : 'Claim'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.challengeDesc}>Complete 125% of all goals for 7 consecutive days</Text>
            <Text style={s.participantsText}>🏆 1,247 participants this week</Text>
          </View>

          <View style={[s.challengeCard, { marginTop: 12 }]}>
            <View style={s.challengeHeader}>
              <Text style={s.challengeTitle}>🎯 Perfect Balance</Text>
              <Text style={s.challengeReward}>+150 pts</Text>
              <TouchableOpacity
                style={[s.claimBtn, (!perfectBalanceComplete || perfectBalanceClaimed) && s.claimBtnDisabled]}
                onPress={handleClaimPerfectBalance}
                disabled={!perfectBalanceComplete || perfectBalanceClaimed}
              >
                <Text style={s.claimBtnText}>{perfectBalanceClaimed ? 'Claimed' : 'Claim'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.challengeDesc}>Hit exactly 100% on all three goals in one day</Text>
            <Text style={s.participantsText}>🎉 892 members completed</Text>
          </View>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Exclusive Challenges</Text>
          <View style={s.premiumLockedCard}>
            <Text style={s.premiumLockedIcon}>🔒</Text>
            <Text style={s.premiumLockedTitle}>Premium Challenges</Text>
            <Text style={s.premiumLockedText}>Upgrade to access Diamond Week (+200 pts) and Perfect Balance (+150 pts) challenges.</Text>
          </View>
        </View>
      )}

      {/* Reward Marketplace (Premium) */}
      {isPremium && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Reward Marketplace</Text>
          <View style={s.rewardItem}>
            <Text style={s.rewardIcon}>🎵</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rewardTitle}>Premium Soundscape</Text>
              <Text style={s.rewardDesc}>Unlock for 1 week · 150 points</Text>
              {soundscapeActive && soundscapeActiveUntil && (
                <Text style={s.rewardActive}>Active until {soundscapeActiveUntil.toLocaleDateString()}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[s.claimBtn, !canRedeemSoundscape && s.claimBtnDisabled]}
              onPress={handleRedeemSoundscape}
              disabled={!canRedeemSoundscape}
            >
              <Text style={s.claimBtnText}>{soundscapeActive ? 'Active' : 'Redeem'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Goal Customization */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Goal Customization</Text>

        <GoalStepper label="Daily Water Goal" value={customWaterGoal} unit="oz" min={32} max={128} step={8} onChange={setCustomWaterGoal} weeklyLabel={`Weekly: ${customWaterGoal * 7} oz`} />
        <GoalStepper label="Daily Meditation Goal" value={customMeditationGoal} unit="min" min={5} max={60} step={5} onChange={setCustomMeditationGoal} weeklyLabel={`Weekly: ${customMeditationGoal * 7} min`} />

        <TouchableOpacity style={s.saveBtn} onPress={handleSaveGoals} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Save Goals</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function GoalStepper({ label, value, unit, min, max, step, onChange, weeklyLabel }: any) {
  return (
    <View style={s.stepperRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.stepperLabel}>{label}</Text>
        <Text style={s.stepperWeekly}>{weeklyLabel}</Text>
      </View>
      <View style={s.stepperControls}>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
          <Text style={s.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.stepValue}>{value} {unit}</Text>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
          <Text style={s.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pointsBadge: { alignSelf: 'flex-end', backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 },
  pointsText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  weekInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  weekLabel: { fontSize: 13, color: colors.textMid, fontWeight: '600' },
  daysRemaining: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 14 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ringWrapper: { alignItems: 'center' },
  ringContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  ringTextContainer: { position: 'absolute', alignItems: 'center' },
  ringValue: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  ringGoal: { fontSize: 10, color: colors.textMuted },
  ringLabel: { fontSize: 10, color: colors.textMid, textTransform: 'capitalize', marginTop: 2 },
  ringPercent: { fontSize: 12, fontWeight: '700', color: colors.textMid, marginTop: 4 },
  emptyRow: { alignItems: 'center', paddingVertical: 12 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: colors.textMuted, textAlign: 'center' },
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achievementCard: { width: '45%', borderRadius: 12, borderWidth: 2, padding: 12, alignItems: 'center' },
  achIcon: { fontSize: 28, marginBottom: 4 },
  achLevel: { fontSize: 12, fontWeight: '800', color: colors.textDark },
  achType: { fontSize: 11, color: colors.textMid, textTransform: 'uppercase' },
  achPct: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 2 },
  challengeCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  challengeTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textDark },
  challengeReward: { fontSize: 13, color: colors.primary, fontWeight: '600', marginRight: 8 },
  challengeDesc: { fontSize: 13, color: colors.textMid, marginBottom: 8 },
  progressTrack: { height: 8, backgroundColor: colors.sage100, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  challengeStatus: { fontSize: 12, color: colors.textMuted },
  participantsText: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  claimBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  claimBtnDisabled: { backgroundColor: colors.border },
  claimBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  premiumLockedCard: { alignItems: 'center', padding: 16 },
  premiumLockedIcon: { fontSize: 36, marginBottom: 8 },
  premiumLockedTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  premiumLockedText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rewardIcon: { fontSize: 32 },
  rewardTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  rewardDesc: { fontSize: 13, color: colors.textMid },
  rewardActive: { fontSize: 12, color: colors.success, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  stepperLabel: { fontSize: 13, fontWeight: '600', color: colors.textDark },
  stepperWeekly: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  stepValue: { fontSize: 14, fontWeight: '700', color: colors.textDark, minWidth: 60, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
