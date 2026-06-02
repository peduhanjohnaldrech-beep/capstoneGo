import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TasksScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addTask = async () => {
    if (!taskName.trim()) return;
    await addDoc(collection(db, 'tasks'), {
      name: taskName.trim(),
      assignedTo: assignedTo.trim(),
      status: 'To Do',
      ownerId: user.uid,
      createdAt: new Date().toISOString(),
    });
    setTaskName('');
    setAssignedTo('');
    setModal(false);
  };

  const toggleStatus = async (task) => {
    const next = task.status === 'To Do' ? 'In Progress' : task.status === 'In Progress' ? 'Done' : 'To Do';
    await updateDoc(doc(db, 'tasks', task.id), { status: next });
  };

  const deleteTask = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc(db, 'tasks', id)) },
    ]);
  };

  const filtered = tasks
    .filter((t) => filter === 'All' || t.status === filter)
    .filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()) || t.assignedTo?.toLowerCase().includes(search.toLowerCase()));

  const STATUS_COLOR = { 'To Do': COLORS.notStarted, 'In Progress': COLORS.inProgress, 'Done': COLORS.done };
  const STATUS_ICON = { 'To Do': 'ellipse-outline', 'In Progress': 'time-outline', 'Done': 'checkmark-circle' };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Task Board</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['All', 'To Do', 'In Progress', 'Done'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkbox-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No tasks here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <TouchableOpacity style={styles.taskLeft} onPress={() => toggleStatus(item)}>
              <Ionicons name={STATUS_ICON[item.status]} size={22} color={STATUS_COLOR[item.status]} />
            </TouchableOpacity>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskName, item.status === 'Done' && styles.taskDone]}>{item.name}</Text>
              {item.assignedTo ? (
                <View style={styles.assignedRow}>
                  <Ionicons name="person-outline" size={12} color={COLORS.textLight} />
                  <Text style={styles.assignedText}>{item.assignedTo}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}20` }]}>
              <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Task name"
              value={taskName}
              onChangeText={setTaskName}
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Assigned to (optional)"
              value={assignedTo}
              onChangeText={setAssignedTo}
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addTask}>
                <Text style={styles.modalSaveText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, backgroundColor: COLORS.card, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: COLORS.card },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: COLORS.textLight, marginTop: 10 },
  taskCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, ...SHADOWS.small,
  },
  taskLeft: { marginRight: 12 },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.textLight },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  assignedText: { fontSize: 12, color: COLORS.textLight },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { marginLeft: 8, padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 12,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', color: COLORS.textSecondary },
  modalSave: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  modalSaveText: { fontWeight: '700', color: COLORS.white },
});
