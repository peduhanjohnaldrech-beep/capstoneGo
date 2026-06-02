import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal,
  TextInput, ActivityIndicator,
} from 'react-native';
import { doc, onSnapshot, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scheduleDeadlineReminder } from '../../utils/notifications';

const STATUSES = ['Not Started', 'In Progress', 'For Review', 'Done'];
const REVISION_STATUSES = ['None', 'Revisions Pending', 'In Progress', 'Approved'];
const REVISION_COLORS = {
  'None': null,
  'Revisions Pending': COLORS.danger,
  'In Progress': '#F59E0B',
  'Approved': COLORS.success,
};
const STATUS_COLORS = {
  'Not Started': COLORS.notStarted,
  'In Progress': COLORS.inProgress,
  'For Review': COLORS.forReview,
  'Done': COLORS.done,
};
const STATUS_ICONS = {
  'Not Started': 'ellipse-outline',
  'In Progress': 'time-outline',
  'For Review': 'eye-outline',
  'Done': 'checkmark-circle',
};

export default function ProjectDetailScreen({ route, navigation }) {
  const { projectId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('chapters');
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackChapter, setFeedbackChapter] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGroup, setEditGroup] = useState('');
  const [editAdviser, setEditAdviser] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deadlineModal, setDeadlineModal] = useState(false);
  const [deadlineChapterIdx, setDeadlineChapterIdx] = useState(null);
  const [deadlineValue, setDeadlineValue] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [taskChapterIdx, setTaskChapterIdx] = useState(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [expandedChapters, setExpandedChapters] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'projects', projectId), (d) => {
      if (d.exists()) setProject({ id: d.id, ...d.data() });
    });
    return unsub;
  }, [projectId]);

  const updateChapterStatus = async (index, status) => {
    const updated = [...project.chapters];
    updated[index].status = status;
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
  };

  const toggleChapterExpand = (index) => {
    setExpandedChapters((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const openTaskModal = (idx) => {
    setTaskChapterIdx(idx);
    setNewTaskName('');
    setTaskModal(true);
  };

  const addChapterTask = async () => {
    if (!newTaskName.trim()) return;
    const updated = [...project.chapters];
    const tasks = [...(updated[taskChapterIdx].tasks || []), { name: newTaskName.trim(), done: false }];
    updated[taskChapterIdx].tasks = tasks;
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
    setNewTaskName('');
    setTaskModal(false);
  };

  const toggleChapterTask = async (chapterIdx, taskIdx) => {
    const updated = [...project.chapters];
    updated[chapterIdx].tasks[taskIdx].done = !updated[chapterIdx].tasks[taskIdx].done;
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
  };

  const deleteChapterTask = async (chapterIdx, taskIdx) => {
    const updated = [...project.chapters];
    updated[chapterIdx].tasks = updated[chapterIdx].tasks.filter((_, i) => i !== taskIdx);
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
  };

  const addFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSavingFeedback(true);
    const newFeedback = {
      text: feedbackText.trim(),
      chapter: feedbackChapter,
      date: new Date().toISOString(),
    };
    const updated = [...(project.feedbackLog || []), newFeedback];
    await updateDoc(doc(db, 'projects', projectId), { feedbackLog: updated });
    setFeedbackText('');
    setFeedbackChapter('');
    setFeedbackModal(false);
    setSavingFeedback(false);
  };

  const openEditModal = () => {
    setEditTitle(project.title || '');
    setEditGroup(project.groupName || '');
    setEditAdviser(project.adviserName || '');
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return Alert.alert('Error', 'Project title is required.');
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        title: editTitle.trim(),
        groupName: editGroup.trim(),
        adviserName: editAdviser.trim(),
        updatedAt: new Date().toISOString(),
      });
      setEditModal(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteProject = () => {
    Alert.alert('Delete Project', 'This will permanently delete the project and all its data. Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'projects', projectId));
          navigation.goBack();
        },
      },
    ]);
  };

  const openDeadlineModal = (idx) => {
    setDeadlineChapterIdx(idx);
    setDeadlineValue(project.chapters[idx].deadline || '');
    setDeadlineModal(true);
  };

  const saveDeadline = async () => {
    const updated = [...project.chapters];
    updated[deadlineChapterIdx].deadline = deadlineValue.trim();
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
    const chapter = updated[deadlineChapterIdx];
    if (chapter.deadline) {
      const chapterId = `${projectId}_${deadlineChapterIdx}`;
      await scheduleDeadlineReminder(chapterId, chapter.name, project.title, chapter.deadline);
    }
    setDeadlineModal(false);
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', inviteEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Not Found', 'No user found with that email.');
        setInviting(false);
        return;
      }
      const foundUser = snap.docs[0];
      const foundData = foundUser.data();
      const members = project.members || [];
      if (members.some((m) => m.uid === foundUser.id)) {
        Alert.alert('Already Added', 'This user is already a member.');
        setInviting(false);
        return;
      }
      const updated = [...members, { uid: foundUser.id, email: foundData.email, name: foundData.name || foundData.email }];
      await updateDoc(doc(db, 'projects', projectId), { members: updated });
      setInviteEmail('');
      setInviteModal(false);
      Alert.alert('Success', `${foundData.name || foundData.email} has been added.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setInviting(false);
    }
  };

  const removeMember = (uid) => {
    Alert.alert('Remove Member', 'Remove this member from the project?', [
      { text: 'Cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          const updated = (project.members || []).filter((m) => m.uid !== uid);
          await updateDoc(doc(db, 'projects', projectId), { members: updated });
        },
      },
    ]);
  };

  const getDeadlineLabel = (deadline) => {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(deadline); due.setHours(0, 0, 0, 0);
    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: COLORS.danger };
    if (diff === 0) return { label: 'Due today!', color: COLORS.warning };
    if (diff === 1) return { label: 'Tomorrow', color: COLORS.warning };
    return { label: `${diff}d left`, color: COLORS.success };
  };

  const cycleRevisionStatus = async (chapterIdx) => {
    const current = project.chapters[chapterIdx].revisionStatus || 'None';
    const currentIdx = REVISION_STATUSES.indexOf(current);
    const next = REVISION_STATUSES[(currentIdx + 1) % REVISION_STATUSES.length];
    const updated = [...project.chapters];
    updated[chapterIdx].revisionStatus = next;
    await updateDoc(doc(db, 'projects', projectId), { chapters: updated });
  };

  const deleteFeedback = async (index) => {
    Alert.alert('Delete Feedback', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = project.feedbackLog.filter((_, i) => i !== index);
          await updateDoc(doc(db, 'projects', projectId), { feedbackLog: updated });
        },
      },
    ]);
  };

  if (!project) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const progress = Math.round(
    ((project.chapters?.filter((c) => c.status === 'Done').length || 0) / (project.chapters?.length || 1)) * 100
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{project.title}</Text>
          <Text style={styles.headerSub}>{project.groupName}</Text>
        </View>
        <TouchableOpacity onPress={openEditModal} style={styles.headerBtn}>
          <Ionicons name="create-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteProject} style={styles.headerBtn}>
          <Ionicons name="trash-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: `${progress}%` }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['chapters', 'feedback', 'members'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'chapters' && (
          <>
            <Text style={styles.sectionLabel}>Adviser: {project.adviserName || 'Not set'}</Text>
            {(project.chapters || []).map((chapter, i) => {
              const dl = getDeadlineLabel(chapter.deadline);
              const isExpanded = expandedChapters[i];
              const chapterTasks = chapter.tasks || [];
              const doneTasks = chapterTasks.filter((t) => t.done).length;
              return (
                <View key={i} style={styles.chapterCard}>
                  <View style={styles.chapterCardHeader}>
                    <Ionicons name={STATUS_ICONS[chapter.status]} size={20} color={STATUS_COLORS[chapter.status]} />
                    <Text style={styles.chapterName}>{chapter.name}</Text>
                    <TouchableOpacity onPress={() => openDeadlineModal(i)} style={styles.deadlineBtn}>
                      <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.deadlineBtnText}>
                        {chapter.deadline ? new Date(chapter.deadline).toLocaleDateString() : 'Set deadline'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {dl && (
                    <Text style={[styles.deadlineCountdown, { color: dl.color }]}>{dl.label}</Text>
                  )}
                  <View style={styles.statusRow}>
                    {STATUSES.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, chapter.status === s && { backgroundColor: STATUS_COLORS[s] }]}
                        onPress={() => updateChapterStatus(i, s)}
                      >
                        <Text style={[styles.statusBtnText, chapter.status === s && styles.statusBtnTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Revision status */}
                  {(() => {
                    const revStatus = chapter.revisionStatus || 'None';
                    const revColor = REVISION_COLORS[revStatus];
                    return (
                      <TouchableOpacity style={styles.revisionRow} onPress={() => cycleRevisionStatus(i)}>
                        <Ionicons name="refresh-circle-outline" size={14} color={revColor || COLORS.textLight} />
                        <Text style={[styles.revisionLabel, revColor && { color: revColor }]}>
                          {revStatus === 'None' ? 'No revisions' : revStatus}
                        </Text>
                        <Ionicons name="chevron-forward" size={12} color={revColor || COLORS.textLight} />
                      </TouchableOpacity>
                    );
                  })()}

                  {/* Tasks toggle */}
                  <TouchableOpacity style={styles.tasksToggle} onPress={() => toggleChapterExpand(i)}>
                    <Ionicons name="list-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.tasksToggleText}>
                      Tasks {chapterTasks.length > 0 ? `(${doneTasks}/${chapterTasks.length})` : ''}
                    </Text>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.primary} />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.tasksList}>
                      {chapterTasks.length === 0 && (
                        <Text style={styles.noTasksText}>No tasks yet. Add one below.</Text>
                      )}
                      {chapterTasks.map((task, ti) => (
                        <View key={ti} style={styles.taskItem}>
                          <TouchableOpacity onPress={() => toggleChapterTask(i, ti)}>
                            <Ionicons
                              name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={task.done ? COLORS.success : COLORS.textLight}
                            />
                          </TouchableOpacity>
                          <Text style={[styles.taskItemName, task.done && styles.taskItemDone]}>{task.name}</Text>
                          <TouchableOpacity onPress={() => deleteChapterTask(i, ti)}>
                            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addTaskBtn} onPress={() => openTaskModal(i)}>
                        <Ionicons name="add" size={15} color={COLORS.primary} />
                        <Text style={styles.addTaskBtnText}>Add Task</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'feedback' && (
          <>
            <TouchableOpacity style={styles.addFeedbackBtn} onPress={() => setFeedbackModal(true)}>
              <Ionicons name="add" size={18} color={COLORS.white} />
              <Text style={styles.addFeedbackText}>Add Adviser Feedback</Text>
            </TouchableOpacity>

            {(project.feedbackLog || []).length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No feedback logged yet</Text>
              </View>
            ) : (
              [...(project.feedbackLog || [])].reverse().map((fb, i) => {
                const isPanelRevision = fb.type === 'panel_revision';
                const originalIdx = (project.feedbackLog.length - 1) - i;
                return (
                  <View key={i} style={[styles.feedbackCard, isPanelRevision && styles.panelRevisionCard]}>
                    <View style={styles.feedbackCardHeader}>
                      <View style={{ flex: 1 }}>
                        {isPanelRevision && (
                          <View style={styles.panelBadgeRow}>
                            <View style={styles.panelBadge}>
                              <Ionicons name="shield-checkmark" size={11} color="#fff" />
                              <Text style={styles.panelBadgeText}>Panel Review</Text>
                            </View>
                            {fb.verdict ? (
                              <View style={[styles.verdictBadge, fb.verdict === 'Passed' ? styles.vBadgePassed : fb.verdict === 'Failed' ? styles.vBadgeFailed : styles.vBadgeRevisions]}>
                                <Text style={styles.verdictBadgeText}>{fb.verdict}</Text>
                              </View>
                            ) : null}
                          </View>
                        )}
                        <Text style={[styles.feedbackChapter, isPanelRevision && { color: '#7C3AED' }]}>
                          {fb.chapter || 'General'}
                          {isPanelRevision && fb.panelSession ? ` — ${fb.panelSession}` : ''}
                        </Text>
                        <Text style={styles.feedbackDate}>{new Date(fb.date).toLocaleDateString()}</Text>
                      </View>
                      {!isPanelRevision && (
                        <TouchableOpacity onPress={() => deleteFeedback(originalIdx)}>
                          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.feedbackText}>{fb.text}</Text>
                  </View>
                );
              })
            )}
          </>
        )}

        {activeTab === 'members' && (
          <>
            <TouchableOpacity style={styles.addFeedbackBtn} onPress={() => setInviteModal(true)}>
              <Ionicons name="person-add-outline" size={18} color={COLORS.white} />
              <Text style={styles.addFeedbackText}>Invite Member</Text>
            </TouchableOpacity>

            {(project.members || []).length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No members yet</Text>
              </View>
            ) : (
              (project.members || []).map((member, i) => (
                <View key={i} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{(member.name || member.email)[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                  {project.ownerId === user?.uid && (
                    <TouchableOpacity onPress={() => removeMember(member.uid)}>
                      <Ionicons name="remove-circle-outline" size={22} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Deadline Modal */}
      <Modal visible={deadlineModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set Deadline</Text>
            {deadlineChapterIdx !== null && (
              <Text style={styles.deadlineChapterName}>{project.chapters[deadlineChapterIdx]?.name}</Text>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD (e.g. 2025-12-31)"
              value={deadlineValue}
              onChangeText={setDeadlineValue}
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeadlineModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              {deadlineValue ? (
                <TouchableOpacity style={[styles.modalCancel, { borderColor: COLORS.danger }]} onPress={() => { setDeadlineValue(''); saveDeadline(); }}>
                  <Text style={[styles.modalCancelText, { color: COLORS.danger }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.modalSave} onPress={saveDeadline}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Project Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Project</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Project Title *"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name"
              value={editGroup}
              onChangeText={setEditGroup}
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Adviser Name"
              value={editAdviser}
              onChangeText={setEditAdviser}
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveEdit} disabled={savingEdit}>
                {savingEdit ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Member Modal */}
      <Modal visible={inviteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter email address"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setInviteModal(false); setInviteEmail(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={inviteMember} disabled={inviting}>
                {inviting ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.modalSaveText}>Invite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={taskModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Add Task{taskChapterIdx !== null ? ` — ${project.chapters[taskChapterIdx]?.name}` : ''}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Write introduction paragraph"
              value={newTaskName}
              onChangeText={setNewTaskName}
              placeholderTextColor={COLORS.textLight}
              onSubmitEditing={addChapterTask}
              returnKeyType="done"
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setTaskModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addChapterTask}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal visible={feedbackModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Log Adviser Feedback</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Chapter (optional)"
              value={feedbackChapter}
              onChangeText={setFeedbackChapter}
              placeholderTextColor={COLORS.textLight}
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Write feedback here..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setFeedbackModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={addFeedback} disabled={savingFeedback}>
                {savingFeedback ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.modalSaveText}>Save</Text>}
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
    backgroundColor: COLORS.primary, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerBtn: { padding: 4, marginLeft: 8 },
  progressBarOuter: { height: 4, backgroundColor: COLORS.primaryDark },
  progressBarInner: { height: 4, backgroundColor: COLORS.secondaryLight },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, fontWeight: '500' },
  chapterCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOWS.small },
  chapterCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  chapterName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  statusBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  statusBtnTextActive: { color: COLORS.white },
  deadlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  deadlineBtnText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  deadlineCountdown: { fontSize: 11, fontWeight: '700', marginBottom: 8, marginLeft: 30 },
  deadlineChapterName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  tasksToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  tasksToggleText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.primary },
  tasksList: { marginTop: 8 },
  noTasksText: { fontSize: 12, color: COLORS.textLight, fontStyle: 'italic', marginBottom: 8 },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  taskItemName: { flex: 1, fontSize: 13, color: COLORS.text },
  taskItemDone: { textDecorationLine: 'line-through', color: COLORS.textLight },
  addTaskBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingVertical: 6,
  },
  addTaskBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  revisionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  revisionLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textLight },
  panelRevisionCard: { borderLeftWidth: 3, borderLeftColor: '#7C3AED' },
  panelBadgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 4 },
  panelBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#7C3AED', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  panelBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  verdictBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  verdictBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  vBadgePassed: { backgroundColor: COLORS.success },
  vBadgeFailed: { backgroundColor: COLORS.danger },
  vBadgeRevisions: { backgroundColor: '#F59E0B' },
  addFeedbackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16, justifyContent: 'center',
  },
  addFeedbackText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: COLORS.textLight, marginTop: 8 },
  feedbackCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOWS.small },
  feedbackCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  feedbackChapter: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  feedbackDate: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  feedbackText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.text, marginBottom: 12,
  },
  modalTextarea: { height: 100 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', color: COLORS.textSecondary },
  modalSave: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalSaveText: { fontWeight: '700', color: COLORS.white },
  memberCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12, ...SHADOWS.small,
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  memberAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  memberEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
