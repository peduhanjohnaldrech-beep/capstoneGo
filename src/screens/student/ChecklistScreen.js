import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, ActivityIndicator,
} from 'react-native';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_DOCS = [
  'Title Defense Application Form',
  'Research Proposal',
  'Adviser Endorsement Letter',
  'Ethics Review Form',
  'Chapter 1 - Final Draft',
  'Chapter 2 - Final Draft',
  'Chapter 3 - Final Draft',
  'Chapter 4 - Final Draft',
  'Chapter 5 - Final Draft',
  'Final Defense Application Form',
  'Plagiarism Check Report',
  'Bound Thesis Copy',
];

export default function ChecklistScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'checklist'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) {
        // Only seed default items if the user has never had a checklist before
        const seedFlagRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(seedFlagRef);
        const alreadySeeded = userDoc.data()?.checklistSeeded;
        if (!alreadySeeded) {
          await setDoc(seedFlagRef, { checklistSeeded: true }, { merge: true });
          for (const name of DEFAULT_DOCS) {
            await addDoc(collection(db, 'checklist'), { name, done: false, ownerId: user.uid });
          }
        } else {
          setItems([]);
          setLoading(false);
        }
      } else {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    });
    return unsub;
  }, [user]);

  const toggle = async (item) => {
    await updateDoc(doc(db, 'checklist', item.id), { done: !item.done });
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    await addDoc(collection(db, 'checklist'), { name: newItem.trim(), done: false, ownerId: user.uid });
    setNewItem('');
    setModal(false);
  };

  const deleteItem = async (id) => {
    await deleteDoc(doc(db, 'checklist', id));
  };

  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const s = makeStyles(colors);

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.headerTitle}>Document Checklist</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={s.progressCard}>
        <View style={s.progressTop}>
          <Text style={s.progressLabel}>Overall Completion</Text>
          <Text style={s.progressPct}>{pct}%</Text>
        </View>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={s.progressSub}>{done} of {items.length} documents ready</Text>
      </View>

      <ScrollView contentContainerStyle={s.list}>
        {items.map((item) => (
          <View key={item.id} style={s.item}>
            <TouchableOpacity onPress={() => toggle(item)} style={s.checkbox}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={item.done ? colors.success : colors.textLight}
              />
            </TouchableOpacity>
            <Text style={[s.itemName, item.done && s.itemDone]}>{item.name}</Text>
            <TouchableOpacity onPress={() => deleteItem(item.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Document</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Document name"
              value={newItem}
              onChangeText={setNewItem}
              placeholderTextColor={colors.textLight}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setModal(false)}>
                <Text style={[s.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalSave, { backgroundColor: colors.primary }]} onPress={addItem}>
                <Text style={s.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: colors.card, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  progressCard: {
    margin: 16, backgroundColor: colors.card, borderRadius: 16, padding: 16, ...SHADOWS.small,
  },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  progressPct: { fontSize: 16, fontWeight: '800', color: colors.primary },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressSub: { fontSize: 12, color: colors.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 12, padding: 14, marginBottom: 8, ...SHADOWS.small,
  },
  checkbox: { marginRight: 12 },
  itemName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  itemDone: { textDecorationLine: 'line-through', color: colors.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: colors.text, marginBottom: 12,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalCancelText: { fontWeight: '600' },
  modalSave: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalSaveText: { fontWeight: '700', color: '#fff' },
});
