import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, Vibration, Modal, ActivityIndicator,
} from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Audio } from 'expo-av';
import { COLORS, SHADOWS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DefenseSessionScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [currentPresenterIdx, setCurrentPresenterIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [scoreModal, setScoreModal] = useState(false);
  const [sound, setSound] = useState(null);
  const [expandedCriterion, setExpandedCriterion] = useState({});
  const intervalRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'defenseSessions', sessionId), (d) => {
      if (d.exists()) {
        const data = { id: d.id, ...d.data() };
        setSession(data);
        if (timeLeft === 0 && !timerRunning) {
          setTimeLeft((data.timeLimit || 15) * 60);
        }
      }
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const startTimer = () => {
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerRunning(false);
          triggerAlarm();
          return 0;
        }
        if (prev === 60) Vibration.vibrate(500);
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setTimerRunning(false);
    setTimeLeft((session?.timeLimit || 15) * 60);
  };

  const triggerAlarm = async () => {
    Vibration.vibrate([500, 500, 500, 500, 500]);
    try {
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
        { shouldPlay: true }
      );
      setSound(s);
    } catch (e) {}
    Alert.alert('Time Up!', `${session?.presenters?.[currentPresenterIdx]?.name}'s time is up!`);
  };

  const updateScore = async (criterionIdx, score) => {
    if (!session) return;
    const updated = [...session.presenters];
    updated[currentPresenterIdx].scores[criterionIdx].score = Math.min(
      score,
      updated[currentPresenterIdx].scores[criterionIdx].maxScore
    );
    await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: updated });
  };

  const toggleCriterionNote = (i) => {
    setExpandedCriterion((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const updateCriterionNote = async (criterionIdx, note) => {
    if (!session) return;
    const updated = [...session.presenters];
    if (!updated[currentPresenterIdx].criterionNotes) updated[currentPresenterIdx].criterionNotes = {};
    updated[currentPresenterIdx].criterionNotes[criterionIdx] = note;
    await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: updated });
  };

  const updateNotes = async (notes) => {
    if (!session) return;
    const updated = [...session.presenters];
    updated[currentPresenterIdx].notes = notes;
    await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: updated });
  };

  const markDone = async () => {
    const updated = [...session.presenters];
    updated[currentPresenterIdx].completed = true;
    await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: updated });
    resetTimer();
    if (currentPresenterIdx < session.presenters.length - 1) {
      setCurrentPresenterIdx(currentPresenterIdx + 1);
    } else {
      Alert.alert('Session Complete!', 'All presenters done. View results?', [
        { text: 'Later' },
        { text: 'View Results', onPress: () => navigation.replace('SessionResults', { sessionId }) },
      ]);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTimerColor = () => {
    if (!session) return COLORS.timerGreen;
    const total = (session.timeLimit || 15) * 60;
    const ratio = timeLeft / total;
    if (ratio > 0.5) return COLORS.timerGreen;
    if (ratio > 0.25) return COLORS.timerYellow;
    return COLORS.timerRed;
  };

  if (!session) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const presenter = session.presenters?.[currentPresenterIdx];
  const totalScore = presenter?.scores?.reduce((a, s) => a + (s.score || 0), 0) || 0;
  const maxTotal = presenter?.scores?.reduce((a, s) => a + s.maxScore, 0) || 100;
  const timerColor = getTimerColor();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => {
          Alert.alert('Exit Session', 'Session progress is saved. Exit?', [
            { text: 'Cancel' },
            { text: 'Exit', onPress: () => navigation.goBack() },
          ]);
        }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{session.title}</Text>
          <Text style={styles.headerSub}>
            {currentPresenterIdx + 1} of {session.presenters?.length} presenters
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SessionResults', { sessionId })}>
          <Ionicons name="bar-chart-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Presenter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presenterTabs}>
          {session.presenters?.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.presenterTab, i === currentPresenterIdx && styles.presenterTabActive, p.completed && styles.presenterTabDone]}
              onPress={() => { resetTimer(); setCurrentPresenterIdx(i); }}
            >
              {p.completed && <Ionicons name="checkmark-circle" size={12} color={COLORS.white} />}
              <Text style={[styles.presenterTabText, i === currentPresenterIdx && styles.presenterTabTextActive]}>
                {p.name || `Group ${i + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Timer */}
        <View style={[styles.timerCard, { borderColor: timerColor }]}>
          <Text style={styles.presenterName}>{presenter?.name}</Text>
          {presenter?.groupName ? <Text style={styles.presenterProject}>{presenter.groupName}</Text> : null}
          <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
          <View style={styles.timerBtns}>
            <TouchableOpacity style={styles.timerBtn} onPress={resetTimer}>
              <Ionicons name="refresh" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timerBtnMain, { backgroundColor: timerColor }]} onPress={timerRunning ? pauseTimer : startTimer}>
              <Ionicons name={timerRunning ? 'pause' : 'play'} size={28} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.timerBtn, { backgroundColor: `${COLORS.success}20` }]} onPress={markDone}>
              <Ionicons name="checkmark-done" size={22} color={COLORS.success} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreCardHeader}>
            <Text style={styles.scoreCardTitle}>Scorecard</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalScore}/{maxTotal}</Text>
            </View>
          </View>
          {presenter?.scores?.map((s, i) => {
            const noteExpanded = expandedCriterion[i];
            const noteVal = presenter?.criterionNotes?.[i] || '';
            return (
              <View key={i}>
                <View style={styles.criterionRow}>
                  <Text style={styles.criterionName}>{s.criterion}</Text>
                  <View style={styles.scoreInput}>
                    <TouchableOpacity onPress={() => updateScore(i, Math.max(0, (s.score || 0) - 1))}>
                      <Ionicons name="remove-circle-outline" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.scoreValue}>{s.score || 0}</Text>
                    <TouchableOpacity onPress={() => updateScore(i, (s.score || 0) + 1)}>
                      <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.maxScore}>/{s.maxScore}</Text>
                    <TouchableOpacity onPress={() => toggleCriterionNote(i)} style={styles.noteToggleBtn}>
                      <Ionicons name={noteVal ? 'chatbubble' : 'chatbubble-outline'} size={16} color={noteVal ? COLORS.secondary : COLORS.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                {noteExpanded && (
                  <TextInput
                    style={styles.criterionNoteInput}
                    placeholder="Add note for this criterion..."
                    value={noteVal}
                    onChangeText={(v) => updateCriterionNote(i, v)}
                    multiline
                    placeholderTextColor={COLORS.textLight}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Judge Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Write notes or comments..."
            value={presenter?.notes || ''}
            onChangeText={updateNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.primary, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  presenterTabs: { marginBottom: 16 },
  presenterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.card, marginRight: 8, borderWidth: 1.5, borderColor: COLORS.border,
  },
  presenterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presenterTabDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  presenterTabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  presenterTabTextActive: { color: COLORS.white },
  timerCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 16, borderWidth: 2, ...SHADOWS.medium,
  },
  presenterName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  presenterProject: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  timerText: { fontSize: 64, fontWeight: '800', letterSpacing: 4, marginVertical: 16 },
  timerBtns: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timerBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  timerBtnMain: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.small,
  },
  scoreCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  scoreCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  scoreCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  totalBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
  criterionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  criterionName: { fontSize: 13, color: COLORS.text, flex: 1, marginRight: 8 },
  scoreInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary, minWidth: 28, textAlign: 'center' },
  maxScore: { fontSize: 13, color: COLORS.textSecondary },
  noteToggleBtn: { marginLeft: 6, padding: 2 },
  criterionNoteInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
    color: COLORS.text, marginBottom: 8, marginTop: 2, backgroundColor: `${COLORS.secondary}08`,
  },
  notesCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, ...SHADOWS.small },
  notesTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  notesInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text, minHeight: 80,
  },
});
