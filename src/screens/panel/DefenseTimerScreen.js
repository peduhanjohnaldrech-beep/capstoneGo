import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Vibration, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DefenseTimerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState('15');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (sound) sound.unloadAsync();
    };
  }, [sound]);

  const start = () => {
    const secs = parseInt(minutes) * 60 || 900;
    if (!started) setTimeLeft(secs);
    setStarted(true);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          triggerAlarm();
          return 0;
        }
        if (prev === 60) Vibration.vibrate(500);
        return prev - 1;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setStarted(false);
    setTimeLeft(parseInt(minutes) * 60 || 900);
  };

  const triggerAlarm = async () => {
    Vibration.vibrate([500, 300, 500, 300, 500]);
    Alert.alert('⏰ Time Up!', 'The presenter\'s time has ended.');
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getColor = () => {
    const total = parseInt(minutes) * 60 || 900;
    const ratio = timeLeft / total;
    if (ratio > 0.5) return COLORS.timerGreen;
    if (ratio > 0.25) return COLORS.timerYellow;
    return COLORS.timerRed;
  };

  const color = getColor();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quick Timer</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        {!started && (
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Minutes:</Text>
            <TextInput
              style={styles.minuteInput}
              value={minutes}
              onChangeText={(v) => { setMinutes(v); setTimeLeft(parseInt(v) * 60 || 0); }}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        )}

        <View style={[styles.timerRing, { borderColor: color }]}>
          <Text style={[styles.timerText, { color }]}>{formatTime(timeLeft)}</Text>
          <Text style={styles.timerSub}>{running ? 'Running' : started ? 'Paused' : 'Ready'}</Text>
        </View>

        <View style={styles.btns}>
          <TouchableOpacity style={styles.sideBtn} onPress={reset}>
            <Ionicons name="refresh" size={26} color={COLORS.textSecondary} />
            <Text style={styles.sideBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: color }]} onPress={running ? pause : start}>
            <Ionicons name={running ? 'pause' : 'play'} size={36} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideBtn} onPress={() => Vibration.vibrate(200)}>
            <Ionicons name="notifications-outline" size={26} color={COLORS.textSecondary} />
            <Text style={styles.sideBtnText}>Test</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary, padding: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  inputLabel: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary },
  minuteInput: {
    fontSize: 32, fontWeight: '800', color: COLORS.text,
    borderBottomWidth: 2, borderBottomColor: COLORS.primary,
    paddingHorizontal: 8, paddingVertical: 4, minWidth: 80, textAlign: 'center',
  },
  timerRing: {
    width: 240, height: 240, borderRadius: 120,
    borderWidth: 8, justifyContent: 'center', alignItems: 'center',
    marginBottom: 48, ...SHADOWS.large,
    backgroundColor: COLORS.card,
  },
  timerText: { fontSize: 52, fontWeight: '800', letterSpacing: 3 },
  timerSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 32 },
  sideBtn: { alignItems: 'center', gap: 6 },
  sideBtnText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  mainBtn: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium,
  },
});
