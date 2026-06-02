import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

export default function PanelDashboardScreen({ navigation }) {
  const { user, userProfile, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'defenseSessions'), where('createdBy', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const deleteSession = (id) => {
    Alert.alert('Delete Session', 'Permanently delete this session and all scores?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc(db, 'defenseSessions', id)) },
    ]);
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Panel Mode</Text>
          <Text style={styles.subtitle}>Welcome, {userProfile?.name}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Action Cards */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('NewSession')}
        >
          <Ionicons name="add-circle" size={32} color={COLORS.white} />
          <Text style={styles.actionTitle}>New Session</Text>
          <Text style={styles.actionSub}>Start a defense session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: COLORS.secondary }]}
          onPress={() => navigation.navigate('DefenseTimer')}
        >
          <Ionicons name="timer" size={32} color={COLORS.white} />
          <Text style={styles.actionTitle}>Quick Timer</Text>
          <Text style={styles.actionSub}>Standalone timer</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Sessions */}
      {(() => {
        const now = new Date();
        const upcoming = sessions
          .filter((s) => s.scheduledDate && new Date(s.scheduledDate) > now)
          .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        if (upcoming.length === 0) return null;
        return (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            </View>
            {upcoming.map((session) => {
              const d = new Date(session.scheduledDate);
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, styles.upcomingCard]}
                  onPress={() => navigation.navigate('SessionResults', { sessionId: session.id })}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: `${COLORS.secondary}18` }]}>
                    <Ionicons name="calendar" size={20} color={COLORS.secondary} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={[styles.sessionDate, { color: COLORS.secondary }]}>
                      {d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', marginRight: 4 }}>
                    <Text style={[styles.sessionCount, { color: COLORS.secondary }]}>{session.presenters?.length || 0}</Text>
                    <Text style={styles.sessionCountLabel}>groups</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        );
      })()}

      {/* Past Sessions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Past Sessions</Text>
      </View>

      {sessions.filter((s) => !s.scheduledDate || new Date(s.scheduledDate) <= new Date()).length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptySubText}>Create a new session to get started</Text>
        </View>
      ) : (
        sessions
          .filter((s) => !s.scheduledDate || new Date(s.scheduledDate) <= new Date())
          .map((session) => (
            <TouchableOpacity
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionResults', { sessionId: session.id })}
            >
              <View style={styles.sessionIcon}>
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                <Text style={styles.sessionDate}>
                  {session.scheduledDate
                    ? `📅 ${new Date(session.scheduledDate).toLocaleDateString()}`
                    : new Date(session.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginRight: 4 }}>
                <Text style={styles.sessionCount}>{session.presenters?.length || 0}</Text>
                <Text style={styles.sessionCountLabel}>groups</Text>
              </View>
              <TouchableOpacity onPress={() => deleteSession(session.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1, borderRadius: 20, padding: 20, alignItems: 'center', gap: 8, ...SHADOWS.medium,
  },
  actionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.white },
  actionSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  sessionCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, ...SHADOWS.small,
  },
  sessionIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sessionDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sessionCount: { fontSize: 18, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  sessionCountLabel: { fontSize: 11, color: COLORS.textSecondary },
  deleteBtn: { padding: 6, marginLeft: 4 },
  upcomingCard: { borderWidth: 1.5, borderColor: `${COLORS.secondary}40` },
});
