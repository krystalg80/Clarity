import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { workoutService } from '../../src/services/workoutService';
import { analyzeTextHybrid, getAIRecommendation } from '../../src/services/aiAnalyticsService';
import timezoneUtils from '../../src/utils/timezone';
import colors from '../../src/theme/colors';

const WORKOUT_TYPES = ['General', 'Cardio', 'Strength', 'Yoga', 'Running', 'Cycling', 'Swimming', 'Walking', 'HIIT', 'Other'];

export default function WorkoutScreen() {
  const { user: firebaseUser } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('General');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [sentimentFeedback, setSentimentFeedback] = useState<any>(null);
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkouts();
  }, [firebaseUser?.uid]);

  const fetchWorkouts = async () => {
    if (!firebaseUser?.uid) return;
    try {
      setIsLoading(true);
      const response = await workoutService.fetchWorkoutsByUser(firebaseUser.uid);
      setWorkouts(response.workouts || []);
    } catch {
      setError('Failed to load workouts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!firebaseUser?.uid) return;
    if (!title || !duration) { setError('Title and duration are required'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const now = new Date();
      const workoutData = {
        title,
        type,
        durationMinutes: parseInt(duration),
        date: now,
        notes,
        caloriesBurned: calories ? parseInt(calories) : 0,
      };

      if (editMode && editId) {
        await workoutService.updateWorkout(firebaseUser.uid, editId, workoutData);
        setWorkouts((prev) => prev.map((w) => (w.id === editId ? { ...w, ...workoutData } : w)));
        resetEdit();
      } else {
        const aiResult = await analyzeTextHybrid(notes);
        setSentimentFeedback({ score: aiResult.sentiment });
        setShowSentimentModal(aiResult.sentiment !== null);
        setAiRecommendation(getAIRecommendation(aiResult.sentiment, aiResult.entities));
        const result = await workoutService.logWorkout(firebaseUser.uid, { ...workoutData, sentiment: aiResult.sentiment, entities: aiResult.entities });
        setWorkouts((prev) => [{ ...workoutData, id: result.id }, ...prev]);
      }
      resetForm();
    } catch {
      setError('Failed to save workout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => { setTitle(''); setType('General'); setDuration(''); setCalories(''); setNotes(''); };
  const resetEdit = () => { setEditMode(false); setEditId(null); resetForm(); };

  const handleEdit = (w: any) => {
    setEditMode(true);
    setEditId(w.id);
    setTitle(w.title || '');
    setType(w.type || 'General');
    setDuration(String(w.durationMinutes || ''));
    setCalories(String(w.caloriesBurned || ''));
    setNotes(w.notes || '');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await workoutService.deleteWorkout(firebaseUser!.uid, id);
          setWorkouts((prev) => prev.filter((w) => w.id !== id));
        },
      },
    ]);
  };

  const todayWorkouts = workouts.filter((w) => w.date && timezoneUtils.isToday(w.date));

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>{editMode ? '✏️ Edit Workout' : '💪 Log Workout Session'}</Text>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <View style={s.card}>
        <Field label="Workout Title *" value={title} onChangeText={setTitle} placeholder="e.g., Morning Run, Gym Session" />

        <Text style={s.label}>Workout Type</Text>
        <TouchableOpacity style={s.picker} onPress={() => setShowTypePicker(true)}>
          <Text style={s.pickerText}>{type}</Text>
          <Text style={s.pickerArrow}>▾</Text>
        </TouchableOpacity>

        <Field label="Duration (minutes) *" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" />
        <Field label="Calories Burned (optional)" value={calories} onChangeText={setCalories} placeholder="0" keyboardType="numeric" />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="How did it feel? Any achievements?" multiline />

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={s.submitBtnText}>{editMode ? 'Update Workout' : 'Log Workout'}</Text>}
        </TouchableOpacity>
        {editMode && (
          <TouchableOpacity style={s.cancelBtn} onPress={resetEdit}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.sectionTitle}>Today's Workouts ({todayWorkouts.length})</Text>
      {todayWorkouts.length === 0 ? (
        <Text style={s.emptyText}>No workouts logged for today. Start your fitness journey!</Text>
      ) : (
        todayWorkouts.map((w) => (
          <View key={w.id} style={s.logItem}>
            <View style={{ flex: 1 }}>
              <Text style={s.logTitle}>{w.title}</Text>
              <Text style={s.logMeta}>{w.type} · {w.durationMinutes} min{w.caloriesBurned > 0 ? ` · ${w.caloriesBurned} cal` : ''}</Text>
              {w.notes ? <Text style={s.logNotes}>{w.notes}</Text> : null}
            </View>
            <View style={s.logActions}>
              <TouchableOpacity onPress={() => handleEdit(w)} style={s.editBtn}><Text style={s.editBtnText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(w.id)} style={s.deleteBtn}><Text style={s.deleteBtnText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.pickerModal}>
            <Text style={s.pickerModalTitle}>Select Workout Type</Text>
            {WORKOUT_TYPES.map((t) => (
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
        <View style={s.modalOverlay}>
          <View style={s.sentimentModal}>
            <Text style={s.sentimentText}>
              {sentimentFeedback?.score > 0 ? 'Your note sounds positive! 😊' : sentimentFeedback?.score < 0 ? 'Your note sounds a bit negative. 😟' : 'Your note sounds neutral. 😐'}
            </Text>
            {aiRecommendation && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: '700', color: colors.textDark }}>AI Suggestion:</Text>
                <Text style={{ color: colors.textMid, marginTop: 4 }}>{aiRecommendation}</Text>
              </View>
            )}
            <TouchableOpacity style={s.submitBtn} onPress={() => setShowSentimentModal(false)}>
              <Text style={s.submitBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMid, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceAlt, backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderRadius: 10, padding: 12, fontSize: 15, color: colors.textDark },
  picker: { backgroundColor: colors.surfaceAlt, backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  pickerText: { fontSize: 15, color: colors.textDark },
  pickerArrow: { fontSize: 15, color: colors.textMuted },
  submitBtn: { backgroundColor: colors.workoutBlue, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: { backgroundColor: colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textMid, fontWeight: '600', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 12 },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginVertical: 16 },
  logItem: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  logTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  logMeta: { fontSize: 13, color: colors.textMid, marginTop: 2 },
  logNotes: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  logActions: { gap: 6 },
  editBtn: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#fff0f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  errorText: { color: colors.error, marginBottom: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  pickerModalTitle: { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 16 },
  pickerOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionText: { fontSize: 16, color: colors.textDark },
  sentimentModal: { backgroundColor: colors.surface, margin: 24, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  sentimentText: { fontSize: 16, fontWeight: '600', color: colors.textDark, textAlign: 'center', marginBottom: 12 },
});
