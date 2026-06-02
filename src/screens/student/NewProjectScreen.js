import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_CHAPTERS = [
  { name: 'Chapter 1: Introduction', status: 'Not Started', deadline: '', notes: '' },
  { name: 'Chapter 2: Review of Related Literature', status: 'Not Started', deadline: '', notes: '' },
  { name: 'Chapter 3: Methodology', status: 'Not Started', deadline: '', notes: '' },
  { name: 'Chapter 4: Results and Discussion', status: 'Not Started', deadline: '', notes: '' },
  { name: 'Chapter 5: Conclusion and Recommendation', status: 'Not Started', deadline: '', notes: '' },
];

export default function NewProjectScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [groupName, setGroupName] = useState('');
  const [adviserName, setAdviserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [chapters, setChapters] = useState(DEFAULT_CHAPTERS);
  const [newChapterName, setNewChapterName] = useState('');

  const addChapter = () => {
    const name = newChapterName.trim();
    if (!name) return;
    setChapters([...chapters, { name, status: 'Not Started', deadline: '', notes: '' }]);
    setNewChapterName('');
  };

  const removeChapter = (index) => {
    if (chapters.length <= 1) return Alert.alert('Error', 'Project must have at least one chapter.');
    setChapters(chapters.filter((_, i) => i !== index));
  };

  const updateChapterName = (index, name) => {
    const updated = [...chapters];
    updated[index].name = name;
    setChapters(updated);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Error', 'Project title is required.');
    const validChapters = chapters.filter((c) => c.name.trim());
    if (validChapters.length === 0) return Alert.alert('Error', 'At least one chapter is required.');
    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        title: title.trim(),
        groupName: groupName.trim(),
        adviserName: adviserName.trim(),
        ownerId: user.uid,
        ownerName: userProfile?.name || '',
        chapters: validChapters,
        tasks: [],
        feedbackLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Project created!');
      navigation.goBack();
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
          <Text style={styles.headerTitle}>New Project</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Project Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CapstoneGo Mobile App"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Group 7"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adviser Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Santos"
              value={adviserName}
              onChangeText={setAdviserName}
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Chapters ({chapters.length})</Text>

          {chapters.map((c, i) => (
            <View key={i} style={styles.chapterRow}>
              <View style={styles.chapterNum}>
                <Text style={styles.chapterNumText}>{i + 1}</Text>
              </View>
              <TextInput
                style={styles.chapterInput}
                value={c.name}
                onChangeText={(val) => updateChapterName(i, val)}
                placeholderTextColor={COLORS.textLight}
              />
              <TouchableOpacity onPress={() => removeChapter(i)} style={styles.removeBtn}>
                <Ionicons name="remove-circle" size={22} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addChapterRow}>
            <TextInput
              style={styles.addChapterInput}
              placeholder="New chapter name..."
              value={newChapterName}
              onChangeText={setNewChapterName}
              placeholderTextColor={COLORS.textLight}
              onSubmitEditing={addChapter}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addChapter} style={styles.addChapterBtn}>
              <Ionicons name="add" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.white} /> : (
            <View style={styles.btnInner}>
              <Ionicons name="add-circle" size={20} color={COLORS.white} />
              <Text style={styles.btnText}>Create Project</Text>
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
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: COLORS.text,
  },
  chapterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chapterNum: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  chapterNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  chapterInput: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: COLORS.text,
  },
  removeBtn: { marginLeft: 8 },
  addChapterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  addChapterInput: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.primary,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, color: COLORS.text,
  },
  addChapterBtn: {
    backgroundColor: COLORS.primary, width: 36, height: 36,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
