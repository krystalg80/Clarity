import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { waterService } from '../../src/services/waterService';
import { analyzeTextHybrid, getAIRecommendation } from '../../src/services/aiAnalyticsService';
import timezoneUtils from '../../src/utils/timezone';
import colors from '../../src/theme/colors';

const DRINK_TYPES = ['water', 'tea', 'coffee', 'juice', 'sports_drink', 'other'];

export default function WaterScreen() {
  const { user: firebaseUser, userProfile } = useAuth();
  const [waters, setWaters] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('water');
  const [notes, setNotes] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [todayTotal, setTodayTotal] = useState(0);
  const [userGoal, setUserGoal] = useState(64);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [sentimentFeedback, setSentimentFeedback] = useState<any>(null);
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.waterGoalOz) setUserGoal(userProfile.waterGoalOz);
  }, [userProfile]);

  useEffect(() => {
    fetchData();
  }, [firebaseUser?.uid]);

  const fetchData = async () => {
    if (!firebaseUser?.uid) return;
    try {
      setIsLoading(true);
      const [response, todayResponse] = await Promise.all([
        waterService.fetchWaterIntakeByUser(firebaseUser.uid),
        waterService.getTodayWaterIntake(firebaseUser.uid),
      ]);
      setWaters(response.waterIntakes || []);
      setTodayTotal(todayResponse.totalOz || 0);
    } catch {
      setError('Failed to load water data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshToday = async () => {
    if (!firebaseUser?.uid) return;
    const r = await waterService.getTodayWaterIntake(firebaseUser.uid);
    setTodayTotal(r.totalOz || 0);
  };

  const quickAdd = async (oz: number) => {
    if (!firebaseUser?.uid) return;
    setIsSubmitting(true);
    try {
      await waterService.logWaterIntake(firebaseUser.uid, { date: new Date(), amount: oz, type: 'water', notes: '', sentiment: null });
      await fetchData();
    } catch { setError('Failed to log water'); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmit = async () => {
    if (!firebaseUser?.uid || !amount) { setError('Amount is required'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      const waterData = { date: new Date(), amount: parseFloat(amount), type, notes };
      if (editMode && editId) {
        await waterService.updateWaterIntake(firebaseUser.uid, editId, waterData);
        setWaters((prev) => prev.map((w) => (w.id === editId ? { ...w, ...waterData } : w)));
        resetEdit();
      } else {
        const aiResult = await analyzeTextHybrid(notes);
        setSentimentFeedback({ score: aiResult.sentiment });
        setShowSentimentModal(aiResult.sentiment !== null);
        setAiRecommendation(getAIRecommendation(aiResult.sentiment, aiResult.entities));
        const response = await waterService.logWaterIntake(firebaseUser.uid, { ...waterData, sentiment: aiResult.sentiment });
        setWaters((prev) => [response.waterIntake, ...prev]);
      }
      await refreshToday();
      resetForm();
    } catch { setError('Failed to save water intake'); }
    finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setAmount(''); setType('water'); setNotes(''); };
  const resetEdit = () => { setEditMode(false); setEditId(null); resetForm(); };

  const handleEdit = (w: any) => {
    setEditMode(true);
    setEditId(w.id);
    setAmount(String(w.amount || ''));
    setType(w.type || 'water');
    setNotes(w.notes || '');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await waterService.deleteWaterIntake(firebaseUser!.uid, id);
          setWaters((prev) => prev.filter((w) => w.id !== id));
          await refreshToday();
        },
      },
    ]);
  };

  const progress = Math.min((todayTotal / userGoal) * 100, 100);
  const todayWaters = waters.filter((w) => w.date && timezoneUtils.isToday(w.date));

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>💧 Daily Hydration</Text>

      {/* Progress Bar */}
      <View style={s.progressCard}>
        <Text style={s.progressLabel}>Today: {todayTotal} / {userGoal} oz ({Math.round(progress)}%)</Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` as any }]} />
        </View>
        {todayTotal >= userGoal && <Text style={s.goalAchieved}>🎉 Daily goal achieved! Great job!</Text>}
      </View>

      {/* Quick Add */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Quick Add</Text>
        <View style={s.quickRow}>
          {[8, 16, 20, 32].map((oz) => (
            <TouchableOpacity key={oz} style={s.quickBtn} onPress={() => quickAdd(oz)} disabled={isSubmitting}>
              <Text style={s.quickBtnTop}>{oz} oz</Text>
              <Text style={s.quickBtnSub}>{oz === 8 ? 'Glass' : oz === 16 ? 'Bottle' : oz === 20 ? 'Large Bottle' : 'Large Cup'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Form */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>{editMode ? '✏️ Edit Entry' : '📝 Log Water Intake'}</Text>
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <Text style={s.label}>Amount (oz) *</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="8" keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Drink Type</Text>
        <TouchableOpacity style={s.picker} onPress={() => setShowTypePicker(true)}>
          <Text style={s.pickerText}>{type}</Text>
          <Text>▾</Text>
        </TouchableOpacity>

        <Text style={s.label}>Notes (optional)</Text>
        <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="e.g., with lemon, iced, etc." placeholderTextColor={colors.textMuted} />

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={s.submitBtnText}>{editMode ? 'Update Entry' : 'Log Water'}</Text>}
        </TouchableOpacity>
        {editMode && (
          <TouchableOpacity style={s.cancelBtn} onPress={resetEdit}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Today's Entries */}
      <Text style={s.sectionHeader}>Today's Entries ({todayWaters.length})</Text>
      {todayWaters.length === 0 ? (
        <Text style={s.emptyText}>No water logged for today. Stay hydrated! 💧</Text>
      ) : (
        todayWaters.map((w) => (
          <View key={w.id} style={s.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.logTitle}>{w.amount} oz · {w.type}</Text>
              {w.notes ? <Text style={s.logNotes}>{w.notes}</Text> : null}
            </View>
            <View style={s.logActions}>
              <TouchableOpacity onPress={() => handleEdit(w)} style={s.editBtn}><Text style={s.editBtnText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(w.id)} style={s.deleteBtn}><Text style={s.deleteBtnText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Type Picker */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.pickerModal}>
            <Text style={s.pickerModalTitle}>Select Drink Type</Text>
            {DRINK_TYPES.map((t) => (
              <TouchableOpacity key={t} style={s.pickerOption} onPress={() => { setType(t); setShowTypePicker(false); }}>
                <Text style={[s.pickerOptionText, t === type && { color: colors.primary, fontWeight: '700' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowTypePicker(false)}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sentiment Modal */}
      <Modal visible={showSentimentModal} transparent animationType="fade">
        <View style={[s.modalOverlay, { justifyContent: 'center', padding: 24 }]}>
          <View style={s.sentimentModal}>
            <Text style={s.sentimentText}>
              {sentimentFeedback?.score > 0 ? '😊 Your note sounds positive!' : sentimentFeedback?.score < 0 ? '😟 Your note sounds a bit negative.' : '😐 Your note sounds neutral.'}
            </Text>
            {aiRecommendation && <Text style={{ color: colors.textMid, marginTop: 8 }}>💡 {aiRecommendation}</Text>}
            <TouchableOpacity style={s.submitBtn} onPress={() => setShowSentimentModal(false)}>
              <Text style={s.submitBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 16 },
  progressCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.textMid, marginBottom: 10 },
  progressTrack: { height: 12, backgroundColor: colors.sage100, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: 12, backgroundColor: colors.waterBlue, borderRadius: 6 },
  goalAchieved: { color: colors.success, fontWeight: '700', textAlign: 'center', marginTop: 10 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, alignItems: 'center' },
  quickBtnTop: { fontSize: 14, fontWeight: '700', color: colors.primary },
  quickBtnSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.surfaceAlt, backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderRadius: 10, padding: 12, fontSize: 15, color: colors.textDark, marginBottom: 8 },
  picker: { backgroundColor: colors.surfaceAlt, backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pickerText: { fontSize: 15, color: colors.textDark },
  submitBtn: { backgroundColor: colors.waterBlue, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textMid, fontWeight: '600', fontSize: 15 },
  logItem: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  logTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  logNotes: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 2 },
  logActions: { gap: 6 },
  editBtn: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#fff0f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  errorText: { color: colors.error, marginBottom: 10, textAlign: 'center' },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginVertical: 16 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  pickerModalTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  pickerOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionText: { fontSize: 16, color: colors.textDark },
  sentimentModal: { backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  sentimentText: { fontSize: 16, fontWeight: '600', color: colors.textDark, textAlign: 'center', marginBottom: 8 },
});
