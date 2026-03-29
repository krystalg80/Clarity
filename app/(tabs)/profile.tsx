import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/authService';
import colors from '../../src/theme/colors';

export default function ProfileScreen() {
  const {
    user: firebaseUser,
    loading: authLoading,
    isPremium,
    userSubscription,
    trialDaysRemaining,
    cancelSubscription,
  } = useAuth();

  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    waterGoalOz: '',
    meditationGoalMinutes: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await authService.getUserProfile(firebaseUser.uid);
        setUser(response.user);
      } catch {
        setError('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        waterGoalOz: String(user.waterGoalOz || ''),
        meditationGoalMinutes: String(user.meditationGoalMinutes || ''),
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!firebaseUser?.uid) return;
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');
    try {
      const profileData = {
        ...formData,
        waterGoalOz: parseInt(formData.waterGoalOz) || 64,
        meditationGoalMinutes: parseInt(formData.meditationGoalMinutes) || 10,
      };
      await authService.updateUserProfile(firebaseUser.uid, profileData);
      setUser({ ...user, ...profileData });
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        waterGoalOz: String(user.waterGoalOz || ''),
        meditationGoalMinutes: String(user.meditationGoalMinutes || ''),
      });
    }
    setError('');
    setSuccessMessage('');
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription?',
      [
        { text: 'Keep Premium', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => cancelSubscription() },
      ]
    );
  };

  const formatDate = (val: any) => {
    if (!val) return 'N/A';
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  if (authLoading || isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  if (!firebaseUser) return (
    <View style={s.centered}><Text style={s.errorText}>Please log in to view your profile.</Text></View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Text style={s.screenTitle}>👤 Profile</Text>
      <Text style={s.subtitle}>Update your profile and wellness goals</Text>

      {successMessage ? <Text style={s.successText}>{successMessage}</Text> : null}
      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {/* Account Info */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Account Information</Text>
        <ProfileField label="Username" value={formData.username} onChange={v => setFormData(p => ({ ...p, username: v }))} placeholder="Choose a username" />
        <ProfileField label="Email" value={formData.email} onChange={v => setFormData(p => ({ ...p, email: v }))} placeholder="your@email.com" keyboardType="email-address" />
        <View style={s.rowFields}>
          <View style={{ flex: 1 }}>
            <ProfileField label="First Name" value={formData.firstName} onChange={v => setFormData(p => ({ ...p, firstName: v }))} placeholder="First" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <ProfileField label="Last Name" value={formData.lastName} onChange={v => setFormData(p => ({ ...p, lastName: v }))} placeholder="Last" />
          </View>
        </View>
      </View>

      {/* Daily Wellness Goals */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Daily Wellness Goals</Text>
        <Text style={s.sectionDesc}>Set your daily targets to track your progress effectively</Text>
        <ProfileField label="Water Goal (oz)" value={formData.waterGoalOz} onChange={v => setFormData(p => ({ ...p, waterGoalOz: v }))} placeholder="64" keyboardType="numeric" hint="Recommended: 64–100 oz" />
        <ProfileField label="Meditation Goal (minutes)" value={formData.meditationGoalMinutes} onChange={v => setFormData(p => ({ ...p, meditationGoalMinutes: v }))} placeholder="10" keyboardType="numeric" hint="Recommended: 5–20 minutes" />

        <View style={s.formActions}>
          <TouchableOpacity style={s.resetBtn} onPress={resetForm} disabled={isSubmitting}>
            <Text style={s.resetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={s.saveBtnText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Summary */}
      {user && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Account Summary</Text>
          <View style={s.statsGrid}>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Member Since</Text>
              <Text style={s.statValue}>{formatDate(user.createdAt)}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Profile Updated</Text>
              <Text style={s.statValue}>{formatDate(user.updatedAt)}</Text>
            </View>
            <View style={s.statItem}>
              <Text style={s.statLabel}>Goals Set</Text>
              <Text style={s.statValue}>
                {[formData.waterGoalOz, formData.meditationGoalMinutes]
                  .filter(g => g && parseInt(g) > 0).length} / 2
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Subscription */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Your Plan</Text>

        {userSubscription === 'trial' && (
          <View style={[s.planCard, { borderColor: colors.primary }]}>
            <Text style={s.planTitle}>Premium Trial</Text>
            <Text style={s.planDesc}>You're experiencing the full premium experience!</Text>
            <View style={s.trialCountdown}>
              <Text style={s.trialDays}>{trialDaysRemaining}</Text>
              <Text style={s.trialDaysLabel}>days remaining</Text>
            </View>
            <View style={s.benefitsList}>
              {['Custom goal setting', 'Diamond achievements', 'Premium soundscapes', 'Advanced analytics'].map(b => (
                <Text key={b} style={s.benefitItem}>✓ {b}</Text>
              ))}
            </View>
            <View style={s.upgradeHint}>
              <Text style={s.upgradeHintText}>💡 In-app purchase coming soon (RevenueCat)</Text>
            </View>
          </View>
        )}

        {userSubscription === 'premium' && (
          <View style={[s.planCard, { borderColor: '#FFD700' }]}>
            <Text style={s.planTitle}>💎 Premium Member</Text>
            <Text style={s.planDesc}>You have access to all premium features!</Text>
            <View style={s.benefitsList}>
              {['Custom goal setting', 'Exclusive Diamond badges', 'Premium soundscapes', 'Advanced analytics', 'Challenge competitions', 'Priority support'].map(b => (
                <Text key={b} style={s.benefitItem}>✓ {b}</Text>
              ))}
            </View>
            <TouchableOpacity style={s.cancelSubBtn} onPress={handleCancelSubscription}>
              <Text style={s.cancelSubBtnText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        {userSubscription === 'free' && (
          <View style={[s.planCard, { borderColor: colors.border }]}>
            <Text style={s.planTitle}>🆓 Free Plan</Text>
            <Text style={s.planDesc}>Upgrade to unlock premium features and enhance your wellness journey</Text>
            <View style={s.benefitsList}>
              {[
                { icon: '🎯', text: 'Custom goal setting' },
                { icon: '💎', text: 'Exclusive Diamond badges' },
                { icon: '🎵', text: 'Premium soundscapes' },
                { icon: '📊', text: 'Advanced analytics' },
                { icon: '🏆', text: 'Challenge competitions' },
                { icon: '⚡', text: 'Priority support' },
              ].map(b => (
                <Text key={b.text} style={s.benefitItem}>{b.icon} {b.text}</Text>
              ))}
            </View>
            <View style={s.upgradeHint}>
              <Text style={s.upgradeHintText}>💡 In-app purchase coming soon — $4.99/month</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ProfileField({ label, value, onChange, placeholder, keyboardType, hint }: any) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
      />
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  successText: { color: colors.success, textAlign: 'center', marginBottom: 10, fontWeight: '600' },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  sectionDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  rowFields: { flexDirection: 'row' },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceAlt, backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderRadius: 10, padding: 12, fontSize: 15, color: colors.textDark },
  fieldHint: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  resetBtn: { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  resetBtnText: { color: colors.textMid, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  planCard: { borderWidth: 2, borderRadius: 14, padding: 16 },
  planTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  planDesc: { fontSize: 13, color: colors.textMid, marginBottom: 12 },
  trialCountdown: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  trialDays: { fontSize: 36, fontWeight: '800', color: colors.primary },
  trialDaysLabel: { fontSize: 14, color: colors.textMid },
  benefitsList: { gap: 6, marginBottom: 14 },
  benefitItem: { fontSize: 14, color: colors.textMid },
  upgradeHint: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 12 },
  upgradeHintText: { fontSize: 13, color: colors.primary, textAlign: 'center', fontWeight: '600' },
  cancelSubBtn: { backgroundColor: '#fff0f0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.error },
  cancelSubBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
});
