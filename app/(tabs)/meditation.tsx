import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as KeepAwake from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../src/contexts/AuthContext';
import { meditationService } from '../../src/services/meditationService';
import { getSoundscapeRecommendation, SoundscapeRecommendation } from '../../src/services/aiService';
import { soundscapes, meditationTypes } from '../../src/data/soundscapes';
import timezoneUtils from '../../src/utils/timezone';
import colors from '../../src/theme/colors';

const MOODS = ['😔', '😰', '😐', '😌', '😊', '🎉'];
const MOOD_LABELS = ['Sad', 'Anxious', 'Neutral', 'Peaceful', 'Happy', 'Excited'];

// Free soundscapes (first 5)
const FREE_SOUNDSCAPE_KEYS = ['silence', 'pink_noise_rain', 'alpha_waves', 'earth_frequency', 'white_noise'];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MeditationScreen() {
  const { user: firebaseUser, isPremium } = useAuth();
  const [meditations, setMeditations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [targetTime, setTargetTime] = useState(5);
  const [deepStateAchieved, setDeepStateAchieved] = useState(false);
  const [currentSoundscape, setCurrentSoundscape] = useState('silence');
  const [sessionMoodBefore, setSessionMoodBefore] = useState('');
  const [moodAfter, setMoodAfter] = useState('');
  const [sessionType, setSessionType] = useState('mindfulness');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showMoodAfterModal, setShowMoodAfterModal] = useState(false);

  // Pickers
  const [showSoundscapePicker, setShowSoundscapePicker] = useState(false);

  // AI recommendation
  const [aiRec, setAiRec] = useState<SoundscapeRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Fetch meditations
  useEffect(() => {
    const fetch = async () => {
      if (!firebaseUser?.uid) return;
      try {
        setIsLoading(true);
        const response = await meditationService.fetchMeditationsByUser(firebaseUser.uid);
        setMeditations(response.meditations || []);
      } catch { }
      finally { setIsLoading(false); }
    };
    fetch();
  }, [firebaseUser?.uid]);

  // Timer
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSessionTime((prev) => {
          const next = prev + 1;
          if (next >= 180 && !deepStateAchieved) {
            setDeepStateAchieved(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          if (next >= targetTime * 60) {
            handleSessionComplete();
          }
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isSessionActive, isPaused, targetTime, deepStateAchieved]);

  const startSession = async () => {
    setSessionTime(0);
    setDeepStateAchieved(false);
    setSessionStartTime(new Date());
    setIsSessionActive(true);
    setIsPaused(false);
    await KeepAwake.activateKeepAwakeAsync();
    await startAudio();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pauseSession = () => setIsPaused((prev) => !prev);

  const stopSession = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsSessionActive(false);
    setIsPaused(false);
    await stopAudio();
    await KeepAwake.deactivateKeepAwake();
    if (sessionTime > 30) {
      setShowMoodAfterModal(true);
    }
  };

  const handleSessionComplete = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsSessionActive(false);
    await stopAudio();
    await KeepAwake.deactivateKeepAwake();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowMoodAfterModal(true);
  };

  const saveSession = async () => {
    if (!firebaseUser?.uid) return;
    setShowMoodAfterModal(false);
    const durationMinutes = Math.max(1, Math.floor(sessionTime / 60));
    try {
      await meditationService.logMeditation(firebaseUser.uid, {
        title: `${meditationTypes[sessionType]?.name || 'Meditation'} Session`,
        type: sessionType,
        soundscape: currentSoundscape,
        durationMinutes,
        targetDuration: targetTime,
        completed: sessionTime >= targetTime * 60,
        deepStateAchieved,
        date: sessionStartTime || new Date(),
        moodBefore: sessionMoodBefore,
        moodAfter,
      });
      const response = await meditationService.fetchMeditationsByUser(firebaseUser.uid);
      setMeditations(response.meditations || []);
      setMoodAfter('');
    } catch (err) {
      console.error('Error saving meditation:', err);
    }
  };

  const startAudio = async () => {
    if (currentSoundscape === 'silence') return;
    // NOTE: Audio files need to be added to assets/audio/
    // Uncomment when you add the audio files:
    // const audioMap: Record<string, any> = {
    //   pink_noise_rain: require('../../assets/audio/pink_noise_rain.mp3'),
    //   alpha_waves: require('../../assets/audio/ocean_waves.mp3'),
    //   earth_frequency: require('../../assets/audio/earth_resonance.mp3'),
    //   white_noise: require('../../assets/audio/white_noise.mp3'),
    // };
    // const src = audioMap[currentSoundscape];
    // if (!src) return;
    // try {
    //   await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
    //   const { sound } = await Audio.Sound.createAsync(src, { isLooping: true });
    //   soundRef.current = sound;
    //   await sound.playAsync();
    // } catch (err) { console.warn('Audio error:', err); }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch { }
      soundRef.current = null;
    }
  };

  const MOOD_LABEL_MAP: Record<string, string> = {
    '😔': 'Sad', '😰': 'Anxious', '😐': 'Neutral', '😌': 'Peaceful', '😊': 'Happy', '🎉': 'Excited',
  };

  const handleAiRecommend = async () => {
    if (!sessionMoodBefore) return;
    setAiLoading(true);
    setAiError('');
    setAiRec(null);
    try {
      const available = Object.entries(soundscapes).map(([key, sc]) => ({
        key,
        name: sc.name,
        desc: sc.neurological,
      }));
      const result = await getSoundscapeRecommendation({
        mood: sessionMoodBefore,
        moodLabel: MOOD_LABEL_MAP[sessionMoodBefore] || 'Unknown',
        meditationType: meditationTypes[sessionType]?.name || sessionType,
        availableSoundscapes: available,
      });
      setAiRec(result);
    } catch (err: any) {
      if (err.message === 'OPENROUTER_KEY_MISSING') {
        setAiError('Add your OpenRouter API key to .env to enable AI recommendations.');
      } else {
        setAiError('Could not get a recommendation right now. Try again.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const todayMeditations = meditations.filter((m) => m.date && timezoneUtils.isToday(m.date));

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Session Control */}
      <View style={s.card}>
        {!isSessionActive ? (
          <>
            <Text style={s.cardTitle}>New Session</Text>

            {/* Mood Before */}
            <Text style={s.label}>How are you feeling?</Text>
            <View style={s.moodRow}>
              {MOODS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[s.moodBtn, sessionMoodBefore === m && s.moodBtnSelected]}
                  onPress={() => { setSessionMoodBefore(m); setAiRec(null); setAiError(''); }}
                >
                  <Text style={s.moodEmoji}>{m}</Text>
                  {sessionMoodBefore === m && (
                    <Text style={s.moodLabel}>{MOOD_LABELS[i]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* AI Soundscape Suggestion */}
            <View style={s.aiSection}>
                {!aiRec && !aiLoading && (
                  <TouchableOpacity
                    style={[s.aiBtn, !sessionMoodBefore && s.aiBtnDimmed]}
                    onPress={() => {
                      if (!sessionMoodBefore) {
                        Alert.alert('Select a mood', 'Pick how you\'re feeling above first.');
                        return;
                      }
                      handleAiRecommend();
                    }}
                  >
                    <Text style={s.aiBtnText}>✨ Recommend a soundscape for my mood</Text>
                    <Text style={s.aiBtnArrow}>→</Text>
                  </TouchableOpacity>
                )}
                {aiLoading && (
                  <View style={s.aiLoadingRow}>
                    <ActivityIndicator size="small" color={colors.meditationPurple} />
                    <Text style={s.aiLoadingText}>Finding the right soundscape for you...</Text>
                  </View>
                )}
                {aiError ? <Text style={s.aiError}>{aiError}</Text> : null}
                {aiRec && !aiLoading && (
                  <View style={s.aiCard}>
                    <View style={s.aiCardHeader}>
                      <Text style={s.aiCardTitle}>AI Recommendation</Text>
                      <TouchableOpacity
                        onPress={() => { setAiRec(null); setAiError(''); }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={s.aiCardDismiss}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.aiCardMessage}>{aiRec.message}</Text>
                    <View style={s.aiChips}>
                      {aiRec.recommendations.map(key => {
                        const sc = soundscapes[key];
                        if (!sc) return null;
                        const isLocked  = sc.premium && !isPremium;
                        const isSelected = currentSoundscape === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[s.aiChip, isSelected && s.aiChipSelected, isLocked && s.aiChipLocked]}
                            onPress={() => {
                              if (isLocked) { Alert.alert('Premium', 'Upgrade to unlock this soundscape.'); return; }
                              setCurrentSoundscape(key);
                            }}
                          >
                            <Text style={s.aiChipIcon}>{sc.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.aiChipName, isSelected && s.aiChipNameSelected]}>
                                {sc.name}
                                {isLocked ? <Text style={s.premiumTag}>  Premium</Text> : null}
                              </Text>
                              {sc.baseFreq ? <Text style={s.aiChipHz}>{sc.baseFreq} Hz</Text> : null}
                            </View>
                            {isSelected && <Text style={s.aiChipCheck}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
            </View>

            {/* Type */}
            <Text style={s.label}>Type</Text>
            <View style={s.typeGrid}>
              {Object.entries(meditationTypes).map(([key, mt]) => {
                const isSelected = key === sessionType;
                const isLocked   = mt.premium && !isPremium;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.typeCard, isSelected && s.typeCardSelected, isLocked && s.typeCardLocked]}
                    onPress={() => {
                      if (isLocked) { Alert.alert('Premium', 'Upgrade to unlock this meditation type.'); return; }
                      setSessionType(key);
                    }}
                  >
                    <Text style={s.typeCardIcon}>{mt.icon}</Text>
                    <Text style={[s.typeCardName, isSelected && s.typeCardNameSelected]}>{mt.name}</Text>
                    <Text style={s.typeCardDesc} numberOfLines={2}>{mt.description}</Text>
                    {isLocked && <Text style={s.typeCardLockTag}>✦ Premium</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration */}
            <Text style={s.label}>Duration</Text>
            <View style={s.durationRow}>
              {[3, 5, 7, 10, 15, 20].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.durationBtn, targetTime === d && s.durationBtnSelected]}
                  onPress={() => setTargetTime(d)}
                >
                  <Text style={[s.durationBtnText, targetTime === d && s.durationBtnTextSelected]}>{d}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Soundscape */}
            <Text style={s.label}>Soundscape</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowSoundscapePicker(true)}>
              <View style={s.pickerLeft}>
                <Text style={s.pickerIcon}>{soundscapes[currentSoundscape]?.icon}</Text>
                <Text style={s.pickerText}>{soundscapes[currentSoundscape]?.name}</Text>
              </View>
              <Text style={s.pickerChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.startBtn} onPress={startSession}>
              <Text style={s.startBtnText}>Begin Session</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Active Session */
          <View style={s.activeSession}>
            <Text style={s.sessionTypeLabel}>{meditationTypes[sessionType]?.name}</Text>
            <Text style={s.timerText}>{formatTime(sessionTime)}</Text>
            <Text style={s.timerTarget}>of {formatTime(targetTime * 60)}</Text>
            <View style={s.sessionProgress}>
              <View style={[s.sessionProgressFill, { width: `${Math.min((sessionTime / (targetTime * 60)) * 100, 100)}%` as any }]} />
            </View>
            {deepStateAchieved && (
              <View style={s.deepStateBadge}>
                <Text style={s.deepStateBadgeText}>Deep state achieved</Text>
              </View>
            )}
            <Text style={s.soundscapeActive}>{soundscapes[currentSoundscape]?.name}</Text>
            <View style={s.sessionControls}>
              <TouchableOpacity style={s.pauseBtn} onPress={pauseSession}>
                <Text style={s.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.stopBtn} onPress={stopSession}>
                <Text style={s.stopBtnText}>End</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Today's Sessions */}
      {todayMeditations.length > 0 && (
        <>
          <Text style={s.sectionHeader}>Today  ·  {todayMeditations.length} {todayMeditations.length === 1 ? 'session' : 'sessions'}</Text>
          {todayMeditations.map((m) => (
            <View key={m.id} style={s.logItem}>
              <View style={s.logItemLeft}>
                <Text style={s.logTitle}>{m.title}</Text>
                <Text style={s.logMeta}>{m.durationMinutes} min  ·  {soundscapes[m.soundscape]?.name || m.soundscape}</Text>
              </View>
              {m.deepStateAchieved && (
                <View style={s.deepStatePill}>
                  <Text style={s.deepStatePillText}>Deep state</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}

      {todayMeditations.length === 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>No sessions yet today.</Text>
        </View>
      )}

      {/* Soundscape Picker */}
      <Modal visible={showSoundscapePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.pickerModal}>
            <Text style={s.pickerModalTitle}>Soundscape</Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {Object.entries(soundscapes).map(([key, sc]) => {
                const isLocked   = sc.premium && !isPremium;
                const isSelected = key === currentSoundscape;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.pickerOption, isSelected && s.pickerOptionSelected]}
                    onPress={() => {
                      if (isLocked) { Alert.alert('Premium', 'Upgrade to unlock this soundscape.'); return; }
                      setCurrentSoundscape(key);
                      setShowSoundscapePicker(false);
                    }}
                  >
                    <Text style={s.pickerOptionIcon}>{sc.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={s.pickerOptionRow}>
                        <Text style={[s.pickerOptionText, isSelected && s.pickerOptionTextSelected]}>
                          {sc.name}
                        </Text>
                        {isLocked && <Text style={s.premiumTag}>Premium</Text>}
                        {sc.baseFreq ? <Text style={s.hzTag}>{sc.baseFreq} Hz</Text> : null}
                      </View>
                      <Text style={s.pickerOptionSub}>{sc.neurological}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowSoundscapePicker(false)}>
              <Text style={s.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      {/* Mood After Modal */}
      <Modal visible={showMoodAfterModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center', padding: 24 }]}>
          <View style={s.completionModal}>
            <Text style={s.completionTitle}>Session complete</Text>
            <Text style={s.completionSub}>How do you feel now?</Text>
            <View style={s.moodRow}>
              {MOODS.map((m) => (
                <TouchableOpacity key={m} style={[s.moodBtn, moodAfter === m && s.moodBtnSelected]} onPress={() => setMoodAfter(m)}>
                  <Text style={s.moodEmoji}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.startBtn} onPress={saveSession}>
              <Text style={s.startBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowMoodAfterModal(false)}>
              <Text style={s.cancelBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:           { flex: 1, backgroundColor: colors.background },
  content:             { padding: 16, paddingBottom: 40 },
  centered:            { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Card
  card:                { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  cardTitle:           { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  label:               { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },

  // Mood
  moodRow:             { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  moodBtn:             { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: colors.background, minWidth: 44 },
  moodBtnSelected:     { borderColor: colors.meditationPurple, backgroundColor: '#F3EEF9' },
  moodEmoji:           { fontSize: 22 },
  moodLabel:           { fontSize: 10, color: colors.meditationPurple, fontWeight: '600', marginTop: 2 },

  // Pickers
  picker:              { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pickerLeft:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerIcon:          { fontSize: 18 },
  pickerText:          { fontSize: 15, color: colors.textDark, fontWeight: '500' },
  pickerChevron:       { fontSize: 20, color: colors.textMuted, lineHeight: 22 },

  // Duration
  typeGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  typeCard:            { width: '47%', backgroundColor: colors.background, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  typeCardSelected:    { borderColor: colors.meditationPurple, backgroundColor: '#F3EEF9' },
  typeCardLocked:      { opacity: 0.6 },
  typeCardIcon:        { fontSize: 26, marginBottom: 6 },
  typeCardName:        { fontSize: 13, fontWeight: '700', color: colors.textDark, marginBottom: 3 },
  typeCardNameSelected:{ color: colors.meditationPurple },
  typeCardDesc:        { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  typeCardLockTag:     { fontSize: 10, color: colors.meditationPurple, fontWeight: '700', marginTop: 5 },
  durationRow:         { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  durationBtn:         { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  durationBtnSelected: { backgroundColor: colors.meditationPurple, borderColor: colors.meditationPurple },
  durationBtnText:     { fontSize: 14, color: colors.textMid, fontWeight: '600' },
  durationBtnTextSelected: { color: colors.white },

  // Start button
  startBtn:            { backgroundColor: colors.meditationPurple, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  startBtnText:        { color: colors.white, fontWeight: '700', fontSize: 16 },
  cancelBtn:           { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelBtnText:       { color: colors.textMuted, fontWeight: '600', fontSize: 15 },

  // Active session
  activeSession:       { alignItems: 'center', paddingVertical: 8 },
  sessionTypeLabel:    { fontSize: 13, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 },
  timerText:           { fontSize: 72, fontWeight: '800', color: colors.meditationPurple, letterSpacing: -2 },
  timerTarget:         { fontSize: 15, color: colors.textMuted, marginBottom: 20, marginTop: 2 },
  sessionProgress:     { width: '100%', height: 4, backgroundColor: colors.sage100, borderRadius: 2, overflow: 'hidden', marginBottom: 16 },
  sessionProgressFill: { height: 4, backgroundColor: colors.meditationPurple, borderRadius: 2 },
  deepStateBadge:      { backgroundColor: '#FFF8E7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 12 },
  deepStateBadgeText:  { fontSize: 13, color: colors.gold, fontWeight: '700' },
  soundscapeActive:    { fontSize: 13, color: colors.textMuted, marginBottom: 20 },
  sessionControls:     { flexDirection: 'row', gap: 12, width: '100%' },
  pauseBtn:            { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  pauseBtnText:        { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  stopBtn:             { flex: 1, backgroundColor: '#FFF0F0', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  stopBtnText:         { color: colors.error, fontWeight: '700', fontSize: 15 },

  // Session log
  sectionHeader:       { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4 },
  logItem:             { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  logItemLeft:         { flex: 1 },
  logTitle:            { fontSize: 15, fontWeight: '600', color: colors.textDark },
  logMeta:             { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  deepStatePill:       { backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  deepStatePillText:   { fontSize: 11, color: colors.gold, fontWeight: '700' },
  emptyState:          { paddingVertical: 16 },
  emptyText:           { color: colors.textMuted, textAlign: 'center', fontSize: 14 },

  // Modal
  modalOverlay:        { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerModal:         { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  pickerModalTitle:    { fontSize: 17, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  pickerOption:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionSelected:{ backgroundColor: colors.primaryLight, marginHorizontal: -24, paddingHorizontal: 24, borderBottomColor: 'transparent' },
  pickerOptionIcon:    { fontSize: 22, marginTop: 1 },
  pickerOptionRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pickerOptionText:    { fontSize: 15, color: colors.textDark, fontWeight: '500' },
  pickerOptionTextSelected: { color: colors.primary, fontWeight: '700' },
  pickerOptionSub:     { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  premiumTag:          { fontSize: 11, color: colors.meditationPurple, fontWeight: '700', backgroundColor: '#F3EEF9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  hzTag:               { fontSize: 11, color: colors.textMuted, fontWeight: '600' },

  // Completion modal
  completionModal:     { backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
  completionTitle:     { fontSize: 20, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 4 },
  completionSub:       { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },

  // AI recommendation
  aiSection:           { marginTop: 8, marginBottom: 4 },
  aiBtn:               { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3EEF9', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: '#D4C5F0' },
  aiBtnDimmed:         { opacity: 0.5 },
  aiBtnText:           { fontSize: 14, color: colors.meditationPurple, fontWeight: '600', flex: 1 },
  aiBtnArrow:          { fontSize: 16, color: colors.meditationPurple },
  aiLoadingRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  aiLoadingText:       { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  aiError:             { fontSize: 13, color: colors.error, marginTop: 4 },
  aiCard:              { backgroundColor: '#F3EEF9', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#D4C5F0', marginTop: 4 },
  aiCardHeader:        { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiCardTitle:         { flex: 1, fontSize: 11, fontWeight: '700', color: colors.meditationPurple, textTransform: 'uppercase', letterSpacing: 1 },
  aiCardDismiss:       { fontSize: 22, color: colors.textMuted, lineHeight: 22 },
  aiCardMessage:       { fontSize: 14, color: '#4A3570', lineHeight: 21, marginBottom: 12, fontStyle: 'italic' },
  aiChips:             { gap: 8 },
  aiChip:              { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#D4C5F0' },
  aiChipSelected:      { borderColor: colors.meditationPurple, backgroundColor: '#EDE5FA' },
  aiChipLocked:        { opacity: 0.55 },
  aiChipIcon:          { fontSize: 20 },
  aiChipName:          { fontSize: 14, fontWeight: '600', color: colors.textDark },
  aiChipNameSelected:  { color: colors.meditationPurple },
  aiChipHz:            { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  aiChipCheck:         { fontSize: 15, color: colors.meditationPurple, fontWeight: '700' },
});
