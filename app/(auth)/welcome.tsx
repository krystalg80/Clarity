import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/authService';
import colors from '../../src/theme/colors';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exerciseGoal, setExerciseGoal] = useState('30');
  const [waterGoal, setWaterGoal] = useState('64');
  const [meditationGoal, setMeditationGoal] = useState('10');
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Awakening animation
  const [awakeningStage, setAwakeningStage] = useState<'pulse' | 'open' | 'form'>('pulse');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulsing.start();

    const t1 = setTimeout(() => setAwakeningStage('open'), 2500);
    const t2 = setTimeout(() => {
      setAwakeningStage('form');
      pulsing.stop();
      Animated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      pulsing.stop();
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, loading]);

  const handleLogin = async () => {
    if (!credential || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await authService.login(credential, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await authService.register({
        email,
        password,
        username,
        firstName,
        lastName,
        exerciseGoalMinutes: parseInt(exerciseGoal),
        waterGoalOz: parseInt(waterGoal),
        meditationGoalMinutes: parseInt(meditationGoal),
      });
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Awakening overlay */}
      {awakeningStage !== 'form' && (
        <View style={styles.awakeningOverlay}>
          <Animated.View style={[styles.awakeningCircle, { transform: [{ scale: awakeningStage === 'open' ? 1.5 : pulseAnim }] }]}>
            <Text style={styles.awakeningEmoji}>{awakeningStage === 'open' ? '👁️' : '✨'}</Text>
          </Animated.View>
          <Text style={styles.awakeningTitle}>Clarity</Text>
        </View>
      )}

      {/* Form */}
      {awakeningStage === 'form' && (
        <Animated.View style={[styles.formWrapper, { opacity: formOpacity }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.logo}>🌿 Clarity</Text>
              <Text style={styles.subtitle}>Begin your wellness today</Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {isSignup ? (
              <>
                <InputField label="Email *" value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" />
                <InputField label="Username" value={username} onChangeText={setUsername} placeholder="Choose a username" />
                <InputField label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="Enter your first name" />
                <InputField label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Enter your last name" />
                <InputField label="Password *" value={password} onChangeText={setPassword} placeholder="Create a password" secureTextEntry />
                <InputField label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" secureTextEntry />
                <InputField label="Exercise Goal (minutes/day)" value={exerciseGoal} onChangeText={setExerciseGoal} placeholder="30" keyboardType="numeric" />
                <InputField label="Water Goal (oz/day)" value={waterGoal} onChangeText={setWaterGoal} placeholder="64" keyboardType="numeric" />
                <InputField label="Meditation Goal (minutes/day)" value={meditationGoal} onChangeText={setMeditationGoal} placeholder="10" keyboardType="numeric" />
              </>
            ) : (
              <>
                <InputField label="Email" value={credential} onChangeText={setCredential} placeholder="Enter your email" keyboardType="email-address" />
                <InputField label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password" secureTextEntry />
              </>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={isSignup ? handleSignup : handleLogin} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>{isSignup ? 'Sign Up' : 'Log In'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => { setIsSignup(!isSignup); setError(''); }}>
              <Text style={styles.secondaryButtonText}>
                {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }: any) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  awakeningOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  awakeningCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  awakeningEmoji: { fontSize: 48 },
  awakeningTitle: { fontSize: 36, fontWeight: '700', color: colors.primary, marginTop: 20 },
  formWrapper: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 36, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 15, color: colors.textMid, marginTop: 4 },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: 12, fontSize: 14 },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.textDark,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  secondaryButton: { alignItems: 'center', paddingVertical: 8 },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
