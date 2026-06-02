import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';

const CHAPTERS = ['Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5'];
const STATUS_COLORS = {
  'Not Started': COLORS.notStarted,
  'In Progress': COLORS.inProgress,
  'For Review': COLORS.forReview,
  'Done': COLORS.done,
};

const getCountdownLabel = (deadline) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: COLORS.danger };
  if (diff === 0) return { label: 'Due today!', color: COLORS.warning };
  if (diff === 1) return { label: 'Due tomorrow', color: COLORS.warning };
  return { label: `${diff} days left`, color: COLORS.success };
};

export default function DashboardScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const getOverallProgress = (project) => {
    if (!project.chapters) return 0;
    const done = project.chapters.filter((c) => c.status === 'Done').length;
    return Math.round((done / CHAPTERS.length) * 100);
  };

  const upcomingDeadlines = projects
    .flatMap((p) =>
      (p.chapters || [])
        .filter((c) => c.deadline && c.status !== 'Done')
        .map((c) => ({ ...c, projectTitle: p.title }))
    )
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userProfile?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subtitle}>Track your capstone progress</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.textLight}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="folder-open" size={24} color={COLORS.white} />
          <Text style={styles.statNum}>{projects.length}</Text>
          <Text style={styles.statLabel}>Projects</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.secondary }]}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
          <Text style={styles.statNum}>
            {projects.reduce((acc, p) => acc + (p.chapters?.filter((c) => c.status === 'Done').length || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Chapters Done</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: COLORS.accent }]}>
          <Ionicons name="time" size={24} color={COLORS.white} />
          <Text style={styles.statNum}>{upcomingDeadlines.length}</Text>
          <Text style={styles.statLabel}>Deadlines</Text>
        </View>
      </View>

      {/* Chapter Progress Chart */}
      {projects.length > 0 && (() => {
        const allChapters = projects.flatMap((p) => p.chapters || []);
        const counts = {
          'Not Started': allChapters.filter((c) => c.status === 'Not Started').length,
          'In Progress': allChapters.filter((c) => c.status === 'In Progress').length,
          'For Review': allChapters.filter((c) => c.status === 'For Review').length,
          'Done': allChapters.filter((c) => c.status === 'Done').length,
        };
        const chartData = [
          { value: counts['Not Started'], label: 'Not\nStarted', frontColor: COLORS.notStarted },
          { value: counts['In Progress'], label: 'In\nProgress', frontColor: COLORS.inProgress },
          { value: counts['For Review'], label: 'For\nReview', frontColor: COLORS.forReview },
          { value: counts['Done'], label: 'Done', frontColor: COLORS.done },
        ];
        return (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Chapter Progress Overview</Text>
            <BarChart
              data={chartData}
              barWidth={44}
              spacing={18}
              roundedTop
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 10, textAlign: 'center' }}
              noOfSections={Math.max(1, Math.max(...chartData.map((d) => d.value)))}
              maxValue={Math.max(1, Math.max(...chartData.map((d) => d.value)))}
              isAnimated
            />
          </View>
        );
      })()}

      {/* Projects */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Projects</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewProject')}>
          <View style={styles.addBtn}>
            <Ionicons name="add" size={18} color={COLORS.white} />
            <Text style={styles.addBtnText}>New</Text>
          </View>
        </TouchableOpacity>
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No projects yet</Text>
          <Text style={styles.emptySubText}>Tap "New" to create your first project</Text>
        </View>
      ) : (
        projects.filter((p) =>
          p.title?.toLowerCase().includes(search.toLowerCase()) ||
          p.groupName?.toLowerCase().includes(search.toLowerCase())
        ).map((project) => {
          const progress = getOverallProgress(project);
          return (
            <TouchableOpacity
              key={project.id}
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
            >
              <View style={styles.projectCardHeader}>
                <View style={styles.projectIcon}>
                  <Ionicons name="document-text" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <Text style={styles.projectGroup}>{project.groupName || 'No group set'}</Text>
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <View style={styles.chapterPills}>
                {(project.chapters || []).map((c, i) => (
                  <View key={i} style={[styles.pill, { backgroundColor: STATUS_COLORS[c.status] || COLORS.notStarted }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>Upcoming Deadlines</Text>
          {upcomingDeadlines.map((item, i) => (
            <View key={i} style={styles.deadlineCard}>
              <View style={[styles.deadlineDot, { backgroundColor: getCountdownLabel(item.deadline).color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deadlineChapter}>{item.name}</Text>
                <Text style={styles.deadlineProject}>{item.projectTitle}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.deadlineDate}>{new Date(item.deadline).toLocaleDateString()}</Text>
                <Text style={[styles.deadlineCountdown, { color: getCountdownLabel(item.deadline).color }]}>
                  {getCountdownLabel(item.deadline).label}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 4, ...SHADOWS.small,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  addBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  projectCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 12, ...SHADOWS.small,
  },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  projectIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  projectInfo: { flex: 1 },
  projectTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  projectGroup: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  progressText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  progressBar: {
    height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginBottom: 10, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  chapterPills: { flexDirection: 'row', gap: 6 },
  pill: { width: 28, height: 8, borderRadius: 4 },
  deadlineCard: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, ...SHADOWS.small,
  },
  deadlineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.warning, marginRight: 12,
  },
  deadlineChapter: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  deadlineProject: { fontSize: 12, color: COLORS.textSecondary },
  deadlineDate: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  deadlineCountdown: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  chartCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 24, ...SHADOWS.small,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 20, borderWidth: 1.5, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
});
