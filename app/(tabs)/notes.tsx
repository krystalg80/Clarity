import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { notesService } from '../../src/services/notesService';
import colors from '../../src/theme/colors';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MOODS = [
  { emoji: '😊', label: 'Happy',      color: '#F6C90E' },
  { emoji: '😌', label: 'Calm',       color: '#5A8A5A' },
  { emoji: '🥰', label: 'Grateful',   color: '#E8748A' },
  { emoji: '🌟', label: 'Energized',  color: '#FF9F43' },
  { emoji: '💪', label: 'Strong',     color: '#54A0FF' },
  { emoji: '🤔', label: 'Reflective', color: '#8395A7' },
  { emoji: '😔', label: 'Sad',        color: '#74B9FF' },
  { emoji: '😰', label: 'Anxious',    color: '#FF6B6B' },
  { emoji: '😤', label: 'Frustrated', color: '#FF9F43' },
  { emoji: '😴', label: 'Tired',      color: '#AABFAA' },
];

const PROMPTS = [
  'What made you smile today?',
  'What are you grateful for right now?',
  'How does your body feel at this moment?',
  "What's been weighing on you? Let it out here.",
  "What's one thing you learned today?",
  'What do you need most right now?',
  'Describe a moment of peace you had today.',
  'What would make tomorrow better than today?',
  'How are you really doing — beneath the surface?',
  'What thought keeps coming back to you today?',
  'What are you proud of yourself for lately?',
  'Write about something you are looking forward to.',
  'How did you take care of yourself today?',
  'What is one thing you want to let go of?',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: any): Date {
  if (!val) return new Date(0);
  const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function groupEntries(entries: any[]) {
  const today     = new Date();
  const todayStr  = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const map = new Map<string, any[]>();

  for (const entry of entries) {
    const d    = toDate(entry.createdAt);
    const dStr = d.toDateString();

    let label: string;
    if (dStr === todayStr) {
      label = 'Today';
    } else if (dStr === yesterdayStr) {
      label = 'Yesterday';
    } else {
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      label = diff < 7
        ? d.toLocaleDateString('en-US', { weekday: 'long' })
        : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(entry);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function calculateStreak(entries: any[]) {
  const dates = new Set(entries.map(e => toDate(e.createdAt).toDateString()).filter(s => s !== new Date(0).toDateString()));
  let streak = 0;
  const cursor = new Date();
  while (dates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onOpen, onDelete }: { entry: any; onOpen: (e: any) => void; onDelete: (e: any) => void }) {
  const moodData  = MOODS.find(m => m.emoji === entry.mood);
  const d         = toDate(entry.createdAt);
  const timeStr   = d.getTime() > 0 ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  const wordCount = entry.text?.trim() ? entry.text.trim().split(/\s+/).length : 0;

  return (
    <TouchableOpacity
      style={[s.entryCard, { borderLeftColor: moodData?.color || colors.primary }]}
      onPress={() => onOpen(entry)}
      activeOpacity={0.75}
    >
      <View style={s.entryCardTop}>
        <View style={{ flex: 1 }}>
          {entry.title ? <Text style={s.entryTitle} numberOfLines={1}>{entry.title}</Text> : null}
          <Text style={s.entryPreview} numberOfLines={entry.title ? 2 : 3}>{entry.text}</Text>
        </View>
        {entry.mood ? <Text style={s.entryMoodEmoji}>{entry.mood}</Text> : null}
      </View>
      <View style={s.entryCardBottom}>
        <Text style={s.entryMeta}>
          {timeStr}{timeStr && wordCount ? '  ·  ' : ''}{wordCount > 0 ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'}` : ''}
        </Text>
        <TouchableOpacity
          onPress={() => onDelete(entry)}
          hitSlop={{ top: 10, bottom: 10, left: 16, right: 10 }}
        >
          <Text style={s.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Journal Screen ───────────────────────────────────────────────────────────

export default function JournalScreen() {
  const { user: firebaseUser } = useAuth();
  const [view, setView]           = useState<'list' | 'compose'>('list');
  const [entries, setEntries]     = useState<any[]>([]);
  const [editing, setEditing]     = useState<any>(null);
  const [title, setTitle]         = useState('');
  const [body, setBody]           = useState('');
  const [mood, setMood]           = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrompt, setShowPrompt] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState('');

  const todayPrompt = PROMPTS[new Date().getDate() % PROMPTS.length];
  const wordCount   = body.trim() ? body.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    (async () => {
      try {
        setIsLoading(true);
        const res = await notesService.fetchNotesByUser(firebaseUser.uid);
        setEntries(res.notes || []);
      } catch {
        setError('Failed to load journal');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [firebaseUser?.uid]);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setBody('');
    setMood('');
    setShowPrompt(true);
    setError('');
    setView('compose');
  };

  const openEdit = (entry: any) => {
    setEditing(entry);
    setTitle(entry.title || '');
    setBody(entry.text || '');
    setMood(entry.mood || '');
    setShowPrompt(false);
    setError('');
    setView('compose');
  };

  const goBack = () => {
    setView('list');
    setEditing(null);
    setError('');
  };

  const save = async () => {
    if (!body.trim()) { setError('Write something before saving.'); return; }
    if (!firebaseUser?.uid) return;
    setIsSaving(true);
    setError('');
    try {
      if (editing) {
        await notesService.updateNote(firebaseUser.uid, editing.id, { text: body, title, mood });
        setEntries(prev => prev.map(n =>
          n.id === editing.id ? { ...n, text: body, title, mood, updatedAt: new Date() } : n
        ));
      } else {
        const res = await notesService.createNote(firebaseUser.uid, { text: body, title, mood });
        setEntries(prev => [res.note, ...prev]);
      }
      goBack();
    } catch {
      setError('Failed to save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (entry: any) => {
    Alert.alert(
      'Delete Entry',
      'This entry will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await notesService.deleteNote(firebaseUser!.uid, entry.id);
              setEntries(prev => prev.filter(n => n.id !== entry.id));
              if (editing?.id === entry.id) goBack();
            } catch {
              setError('Failed to delete entry.');
            }
          },
        },
      ]
    );
  };

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  // ── Compose View ──────────────────────────────────────────────────────────
  if (view === 'compose') {
    const composeDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
      <KeyboardAvoidingView style={s.composeFull} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={s.composeHeader}>
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <Text style={s.backBtnText}>← Journal</Text>
          </TouchableOpacity>
          <Text style={s.composeHeaderDate}>
            {editing ? 'Edit Entry' : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <TouchableOpacity
            style={[s.saveBtn, (!body.trim() || isSaving) && s.saveBtnOff]}
            onPress={save}
            disabled={!body.trim() || isSaving}
          >
            {isSaving
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.saveBtnText}>{editing ? 'Update' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.composePage}
          contentContainerStyle={s.composePageContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text style={s.errorText}>{error}</Text> : null}

          {/* Date line */}
          {!editing && (
            <Text style={s.composeDateLine}>{composeDate}</Text>
          )}

          {/* Mood selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.moodScroll}
            contentContainerStyle={s.moodScrollInner}
          >
            {MOODS.map(m => (
              <TouchableOpacity
                key={m.emoji}
                style={[
                  s.moodChip,
                  mood === m.emoji && { backgroundColor: m.color + '28', borderColor: m.color },
                ]}
                onPress={() => setMood(mood === m.emoji ? '' : m.emoji)}
              >
                <Text style={s.moodChipEmoji}>{m.emoji}</Text>
                <Text style={[s.moodChipLabel, mood === m.emoji && { color: m.color, fontWeight: '700' }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Prompt */}
          {showPrompt && !editing && (
            <View style={s.promptCard}>
              <View style={s.promptCardTop}>
                <Text style={s.promptCardTag}>Today's prompt</Text>
                <TouchableOpacity onPress={() => setShowPrompt(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={s.promptDismiss}>×</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.promptText}>{todayPrompt}</Text>
            </View>
          )}

          {/* Title */}
          <TextInput
            style={s.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title your entry..."
            placeholderTextColor={colors.textMuted}
            maxLength={100}
          />

          <View style={s.dividerLine} />

          {/* Body */}
          <TextInput
            style={s.bodyInput}
            value={body}
            onChangeText={setBody}
            placeholder="Write freely. This is your space..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus={!editing}
          />
        </ScrollView>

        {/* Footer */}
        <View style={s.composeFooter}>
          <Text style={s.wordCount}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</Text>
          {mood ? (
            <View style={s.footerMood}>
              <Text style={s.footerMoodEmoji}>{mood}</Text>
              <Text style={s.footerMoodLabel}>{MOODS.find(m => m.emoji === mood)?.label}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────
  const filtered  = entries.filter(e =>
    e.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const grouped   = groupEntries(filtered);
  const streak    = calculateStreak(entries);
  const wroteToday = entries.some(e => toDate(e.createdAt).toDateString() === new Date().toDateString());

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={s.listHeader}>
        <View>
          <Text style={s.screenTitle}>My Journal</Text>
          <Text style={s.subtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        {streak > 0 && (
          <View style={s.streakBadge}>
            <Text style={s.streakFire}>🔥</Text>
            <Text style={s.streakNum}>{streak}</Text>
            <Text style={s.streakLabel}>{streak === 1 ? 'day' : 'days'}</Text>
          </View>
        )}
      </View>

      {/* Today CTA */}
      {!wroteToday ? (
        <TouchableOpacity style={s.ctaCard} onPress={openNew} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaTitle}>Write today's entry</Text>
            <Text style={s.ctaPrompt}>{todayPrompt}</Text>
          </View>
          <Text style={s.ctaArrow}>→</Text>
        </TouchableOpacity>
      ) : (
        <View style={s.ctaCardDone}>
          <Text style={s.ctaDoneCheck}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.ctaDoneTitle}>You wrote today</Text>
            <TouchableOpacity onPress={openNew}>
              <Text style={s.ctaDoneAdd}>Add another entry →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <TextInput
        style={s.searchInput}
        placeholder="Search your journal..."
        placeholderTextColor={colors.textMuted}
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {/* Entries */}
      {entries.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📖</Text>
          <Text style={s.emptyTitle}>Your journal is empty</Text>
          <Text style={s.emptyDesc}>
            Writing even a few sentences a day builds self-awareness and helps process emotions.
          </Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openNew}>
            <Text style={s.emptyBtnText}>Write First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <Text style={s.noResults}>No entries match "{searchTerm}"</Text>
      ) : (
        grouped.map(group => (
          <View key={group.label}>
            <Text style={s.groupLabel}>{group.label}</Text>
            {group.items.map(entry => (
              <EntryCard key={entry.id} entry={entry} onOpen={openEdit} onDelete={handleDelete} />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Shared
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:      { color: colors.error, fontSize: 13, marginBottom: 10, textAlign: 'center' },

  // List view
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 48 },
  listHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  screenTitle:    { fontSize: 22, fontWeight: '800', color: colors.textDark },
  subtitle:       { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  streakBadge:    { alignItems: 'center', backgroundColor: '#FFF3CD', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 64 },
  streakFire:     { fontSize: 20 },
  streakNum:      { fontSize: 18, fontWeight: '800', color: '#E09B4A', lineHeight: 22 },
  streakLabel:    { fontSize: 10, color: '#E09B4A', fontWeight: '600' },

  ctaCard:        { backgroundColor: colors.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderLeftWidth: 4, borderLeftColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  ctaTitle:       { fontSize: 15, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  ctaPrompt:      { fontSize: 13, color: colors.textMid, lineHeight: 18 },
  ctaArrow:       { fontSize: 20, color: colors.primary, marginLeft: 8 },

  ctaCardDone:    { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  ctaDoneCheck:   { fontSize: 22, color: colors.primary },
  ctaDoneTitle:   { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  ctaDoneAdd:     { fontSize: 13, color: colors.primary, marginTop: 2 },

  searchInput:    { backgroundColor: colors.surface, borderRadius: 12, padding: 12, fontSize: 15, color: colors.textDark, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  emptyState:     { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIcon:      { fontSize: 56, marginBottom: 14 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: colors.textDark, marginBottom: 8 },
  emptyDesc:      { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn:       { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28 },
  emptyBtnText:   { color: colors.white, fontWeight: '700', fontSize: 15 },
  noResults:      { color: colors.textMuted, textAlign: 'center', marginVertical: 24, fontSize: 14 },

  groupLabel:     { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8 },

  // Entry card
  entryCard:      { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  entryCardTop:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  entryTitle:     { fontSize: 15, fontWeight: '700', color: colors.textDark, marginBottom: 4 },
  entryPreview:   { fontSize: 14, color: colors.textMid, lineHeight: 20 },
  entryMoodEmoji: { fontSize: 28, marginTop: 2 },
  entryCardBottom:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryMeta:      { fontSize: 12, color: colors.textMuted },
  deleteText:     { fontSize: 12, color: colors.error, fontWeight: '600' },

  // Compose view
  composeFull:    { flex: 1, backgroundColor: colors.surface },
  composeHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn:        { paddingVertical: 4, paddingRight: 12 },
  backBtnText:    { fontSize: 15, color: colors.primary, fontWeight: '600' },
  composeHeaderDate: { fontSize: 13, color: colors.textMuted, fontWeight: '600', flex: 1, textAlign: 'center' },
  saveBtn:        { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7 },
  saveBtnOff:     { backgroundColor: colors.border },
  saveBtnText:    { color: colors.white, fontWeight: '700', fontSize: 14 },

  composePage:    { flex: 1 },
  composePageContent: { padding: 20, paddingBottom: 80 },

  composeDateLine:{ fontSize: 13, color: colors.textMuted, marginBottom: 16, letterSpacing: 0.5 },

  moodScroll:     { marginBottom: 16 },
  moodScrollInner:{ paddingRight: 16 },
  moodChip:       { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, marginRight: 8 },
  moodChipEmoji:  { fontSize: 16, marginRight: 5 },
  moodChipLabel:  { fontSize: 12, color: colors.textMid, fontWeight: '600' },

  promptCard:     { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  promptCardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  promptCardTag:  { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  promptDismiss:  { fontSize: 20, color: colors.textMuted, lineHeight: 20 },
  promptText:     { fontSize: 14, color: colors.primaryDark, lineHeight: 20, fontStyle: 'italic' },

  titleInput:     { fontSize: 22, fontWeight: '700', color: colors.textDark, paddingVertical: 10, minHeight: 44 },
  dividerLine:    { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  bodyInput:      { fontSize: 16, color: colors.textDark, lineHeight: 26, minHeight: 280, paddingTop: 4 },

  composeFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  wordCount:      { fontSize: 13, color: colors.textMuted },
  footerMood:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerMoodEmoji:{ fontSize: 16 },
  footerMoodLabel:{ fontSize: 12, color: colors.textMid, fontWeight: '600' },
});
