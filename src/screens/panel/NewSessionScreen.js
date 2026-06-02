import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_CRITERIA = [
  { name: 'Introduction & Background', maxScore: 20 },
  { name: 'Methodology', maxScore: 20 },
  { name: 'Results & Discussion', maxScore: 20 },
  { name: 'Conclusion & Recommendation', maxScore: 20 },
  { name: 'Delivery & Q&A', maxScore: 20 },
];

export default function NewSessionScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState('15');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [presenters, setPresenters] = useState([{ name: '', groupName: '' }]);
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA);
  const [newCriteriaName, setNewCriteriaName] = useState('');
  const [newCriteriaScore, setNewCriteriaScore] = useState('');
  const [loading, setLoading] = useState(false);

  const addPresenter = () => setPresenters([...presenters, { name: '', groupName: '' }]);
  const removePresenter = (i) => setPresenters(presenters.filter((_, idx) => idx !== i));
  const updatePresenter = (i, field, value) => {
    const updated = [...presenters];
    updated[i][field] = value;
    setPresenters(updated);
  };

  const addCriteria = () => {
    const name = newCriteriaName.trim();
    const score = parseInt(newCriteriaScore);
    if (!name) return Alert.alert('Error', 'Criterion name is required.');
    if (!score || score < 1) return Alert.alert('Error', 'Max score must be at least 1.');
    setCriteria([...criteria, { name, maxScore: score }]);
    setNewCriteriaName('');
    setNewCriteriaScore('');
  };

  const removeCriteria = (i) => {
    if (criteria.length <= 1) return Alert.alert('Error', 'At least one criterion is required.');
    setCriteria(criteria.filter((_, idx) => idx !== i));
  };

  const updateCriteriaName = (i, name) => {
    const updated = [...criteria];
    updated[i].name = name;
    setCriteria(updated);
  };

  const updateCriteriaScore = (i, val) => {
    const score = parseInt(val);
    const updated = [...criteria];
    updated[i].maxScore = isNaN(score) ? 0 : score;
    setCriteria(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Session title is required.');
    if (presenters.some((p) => !p.name.trim())) return Alert.alert('Error', 'All presenter names are required.');
    const parsedTime = parseInt(timeLimit);
    if (!parsedTime || parsedTime < 1) return Alert.alert('Error', 'Time limit must be at least 1 minute.');
    setLoading(true);
    try {
      const sessionData = {
        title: title.trim(),
        timeLimit: parsedTime,
        scheduledDate: scheduledDate.trim() || null,
        scheduledTime: scheduledTime.trim() || null,
        presenters: presenters.map((p) => ({
          ...p,
          scores: criteria.map((c) => ({ criterion: c.name, maxScore: c.maxScore, score: 0 })),
          notes: '',
          completed: false,
        })),
        criteria,
        createdBy: user.uid,
        createdByName: userProfile?.name || '',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'defenseSessions'), sessionData);
      navigation.replace('DefenseSession', { sessionId: docRef.id });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Defense Session</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Session Info */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Session Info</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Session Title *</Text>
            <TextInput style={styles.input} placeholder="e.g. Final Defense — Group 7" value={title} onChangeText={setTitle} placeholderTextColor={COLORS.textLight} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Limit per Presenter (minutes)</Text>
            <TextInput style={styles.input} placeholder="15" value={timeLimit} onChangeText={setTimeLimit} keyboardType="numeric" placeholderTextColor={COLORS.textLight} />
          </View>
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Scheduled Date</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={scheduledDate} onChangeText={setScheduledDate} placeholderTextColor={COLORS.textLight} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Time</Text>
              <TextInput style={styles.input} placeholder="e.g. 9:00 AM" value={scheduledTime} onChangeText={setScheduledTime} placeholderTextColor={COLORS.textLight} />
            </View>
          </View>
        </View>

        {/* Presenters */}
        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionLabel}>Presenters / Groups</Text>
            <TouchableOpacity onPress={addPresenter}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {presenters.map((p, i) => (
            <View key={i} style={styles.presenterRow}>
              <View style={styles.presenterNum}>
                <Text style={styles.presenterNumText}>{i + 1}</Text>
              </View>
              <View style={styles.presenterInputs}>
                <TextInput
                  style={styles.presenterInput}
                  placeholder="Presenter/Group Name"
                  value={p.name}
                  onChangeText={(v) => updatePresenter(i, 'name', v)}
                  placeholderTextColor={COLORS.textLight}
                />
                <TextInput
                  style={[styles.presenterInput, { marginTop: 6 }]}
                  placeholder="Project Title (optional)"
                  value={p.groupName}
                  onChangeText={(v) => updatePresenter(i, 'groupName', v)}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
              {presenters.length > 1 && (
                <TouchableOpacity onPress={() => removePresenter(i)} style={{ marginLeft: 8 }}>
                  <Ionicons name="remove-circle" size={22} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Criteria */}
        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.sectionLabel}>Scoring Criteria ({criteria.length})</Text>
          </View>
          {criteria.map((c, i) => (
            <View key={i} style={styles.criteriaEditRow}>
              <View style={styles.presenterNum}>
                <Text style={styles.presenterNumText}>{i + 1}</Text>
              </View>
              <TextInput
                style={styles.criteriaNameInput}
                value={c.name}
                onChangeText={(val) => updateCriteriaName(i, val)}
                placeholderTextColor={COLORS.textLight}
              />
              <TextInput
                style={styles.criteriaScoreInput}
                value={String(c.maxScore)}
                onChangeText={(val) => updateCriteriaScore(i, val)}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
              <Text style={styles.ptsLabel}>pts</Text>
              <TouchableOpacity onPress={() => removeCriteria(i)} style={{ marginLeft: 6 }}>
                <Ionicons name="remove-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addCriteriaRow}>
            <TextInput
              style={styles.addCriteriaNameInput}
              placeholder="New criterion..."
              value={newCriteriaName}
              onChangeText={setNewCriteriaName}
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={styles.addCriteriaScoreInput}
              placeholder="pts"
              value={newCriteriaScore}
              onChangeText={setNewCriteriaScore}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity onPress={addCriteria} style={styles.addCriteriaBtn}>
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Total: {criteria.reduce((a, c) => a + (c.maxScore || 0), 0)} points</Text>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : (
            <View style={styles.btnInner}>
              <Ionicons name="play-circle" size={20} color={COLORS.white} />
              <Text style={styles.btnText}>Start Session</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text,
  },
  presenterRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  presenterNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 4,
  },
  presenterNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  presenterInputs: { flex: 1 },
  presenterInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: COLORS.text,
  },
  criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  criteriaName: { fontSize: 14, color: COLORS.text, flex: 1 },
  criteriaScore: { backgroundColor: `${COLORS.primary}18`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  criteriaScoreText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  criteriaEditRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  criteriaNameInput: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 13, color: COLORS.text, marginRight: 6,
  },
  criteriaScoreInput: {
    width: 48, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7,
    fontSize: 13, color: COLORS.text, textAlign: 'center',
  },
  ptsLabel: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 4 },
  addCriteriaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  addCriteriaNameInput: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, color: COLORS.text,
  },
  addCriteriaScoreInput: {
    width: 52, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 13, color: COLORS.text, textAlign: 'center',
  },
  addCriteriaBtn: {
    backgroundColor: COLORS.primary, width: 36, height: 36,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  rowInputs: { flexDirection: 'row' },
  hint: { fontSize: 12, color: COLORS.textLight, marginTop: 10, fontWeight: '600' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
