import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import colors from '../../src/theme/colors';

function TrialBannerInline() {
  const { userSubscription, isTrialActive, trialDaysRemaining } = useAuth();

  if (userSubscription === 'premium' || userSubscription === 'free' || !isTrialActive) return null;

  const isUrgent = trialDaysRemaining <= 3;

  return (
    <View style={[styles.trialBanner, isUrgent && styles.trialBannerUrgent]}>
      <Text style={styles.trialText}>
        {isUrgent ? '⏰' : '✨'}{' '}
        {trialDaysRemaining <= 1 ? 'Last day of premium!' : `${trialDaysRemaining} days left in trial`}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 54 + insets.bottom;

  return (
    <>
      <TrialBannerInline />
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { fontSize: 18, fontWeight: '700', color: colors.textDark },
          headerShadowVisible: false,
          headerTintColor: colors.textDark,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: 6,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            height: tabBarHeight,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            headerTitle: 'Clarity',
            headerTitleStyle: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
            tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="meditation"
          options={{
            title: 'Meditate',
            tabBarIcon: ({ color }) => <Ionicons name="leaf" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="water"
          options={{
            title: 'Water',
            tabBarIcon: ({ color }) => <Ionicons name="water" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="games"
          options={{
            title: 'Games',
            tabBarIcon: ({ color }) => <Ionicons name="game-controller" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: 'Goals',
            tabBarIcon: ({ color }) => <Ionicons name="trophy" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: 'Diary',
            tabBarIcon: ({ color }) => <Ionicons name="journal" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  trialBanner: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  trialBannerUrgent: {
    backgroundColor: colors.warning,
  },
  trialText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});
