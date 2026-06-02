import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert,
  TextInput, Modal,
} from 'react-native';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS, SHADOWS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BarChart } from 'react-native-gifted-charts';

export default function SessionResultsScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedPresenters, setEditedPresenters] = useState(null);
  const [revisionModal, setRevisionModal] = useState(false);
  const [revisionPresenter, setRevisionPresenter] = useState(null);
  const [revisionPresenterIdx, setRevisionPresenterIdx] = useState(null);
  const [revisionChapter, setRevisionChapter] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [postingRevision, setPostingRevision] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'defenseSessions', sessionId), (d) => {
      if (d.exists()) setSession({ id: d.id, ...d.data() });
    });
    return unsub;
  }, [sessionId]);

  const verdictColor = (v) => v === 'Passed' ? '#16A34A' : v === 'Failed' ? '#DC2626' : v === 'Passed with Revisions' ? '#D97706' : '#6B7280';
  const sharedStyles = `
    body { font-family: Arial, sans-serif; padding: 28px; color: #1E293B; }
    h1 { color: #4F46E5; font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #1E293B; margin-bottom: 2px; }
    h3 { font-size: 15px; margin-bottom: 4px; color: #1E293B; }
    p { color: #64748B; font-size: 13px; margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 14px; }
    th, td { border: 1px solid #E2E8F0; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #F8FAFC; font-weight: 700; }
    .presenter { border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
    .verdict { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #fff; margin: 6px 0 10px; }
    .note-box { background: #F8FAFC; border-left: 3px solid #4F46E5; padding: 8px 12px; margin: 8px 0; border-radius: 0 6px 6px 0; font-size: 12px; }
    .revision-box { background: #FFF7ED; border-left: 3px solid #D97706; padding: 8px 12px; margin: 8px 0; border-radius: 0 6px 6px 0; font-size: 12px; }
    .criterion-note { font-size: 11px; color: #64748B; font-style: italic; padding: 2px 0 2px 8px; }
  `;

  const exportPDF = async () => {
    if (!session) return;
    const rows = session.presenters.map((p) => {
      const total = p.scores?.reduce((a, s) => a + (s.score || 0), 0) || 0;
      const max = p.scores?.reduce((a, s) => a + s.maxScore, 0) || 100;
      const scoreRows = p.scores?.map((s, i) => {
        const note = p.criterionNotes?.[i];
        return `<tr>
          <td>${s.criterion}${note ? `<div class="criterion-note">Note: ${note}</div>` : ''}</td>
          <td style="text-align:center;font-weight:700">${s.score}/${s.maxScore}</td>
        </tr>`;
      }).join('');
      const verdictHtml = p.verdict ? `<div class="verdict" style="background:${verdictColor(p.verdict)}">${p.verdict}</div>` : '';
      return `
        <div class="presenter">
          <h3>${p.name} — <span style="color:#4F46E5">${total}/${max} pts</span></h3>
          ${p.groupName ? `<p><em>${p.groupName}</em></p>` : ''}
          ${verdictHtml}
          <table><tr><th>Criterion</th><th style="text-align:center">Score</th></tr>${scoreRows}</table>
          ${p.notes ? `<div class="note-box"><strong>Judge Notes:</strong> ${p.notes}</div>` : ''}
        </div>`;
    }).join('');

    const html = `<html><head><style>${sharedStyles}</style></head><body>
      <h1>CapstoneGo — Defense Results</h1>
      <h2>${session.title}</h2>
      <p>Date: ${new Date(session.createdAt).toLocaleDateString()}</p><br/>
      ${rows}
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  const exportRevisionsPDF = async () => {
    if (!session) return;
    const hasAnyRevisionContent = session.presenters.some(
      (p) => p.verdict || p.notes || (p.criterionNotes && Object.values(p.criterionNotes).some(Boolean))
    );
    if (!hasAnyRevisionContent) {
      return Alert.alert('No Revision Data', 'Add verdicts or notes during the session first.');
    }
    const rows = session.presenters.map((p) => {
      const verdictHtml = p.verdict
        ? `<div class="verdict" style="background:${verdictColor(p.verdict)}">${p.verdict}</div>`
        : '<div class="verdict" style="background:#94A3B8">No Verdict</div>';
      const criterionNoteRows = p.scores?.map((s, i) => {
        const note = p.criterionNotes?.[i];
        if (!note) return '';
        return `<tr><td>${s.criterion}</td><td>${note}</td></tr>`;
      }).filter(Boolean).join('') || '';
      return `
        <div class="presenter">
          <h3>${p.name}</h3>
          ${p.groupName ? `<p><em>${p.groupName}</em></p>` : ''}
          ${verdictHtml}
          ${criterionNoteRows ? `
            <p style="font-weight:700;margin-top:10px">Criterion Notes:</p>
            <table><tr><th>Criterion</th><th>Note</th></tr>${criterionNoteRows}</table>
          ` : ''}
          ${p.notes ? `<div class="revision-box"><strong>General Notes:</strong><br/>${p.notes}</div>` : ''}
          ${!criterionNoteRows && !p.notes ? '<p style="color:#94A3B8;font-style:italic">No notes recorded.</p>' : ''}
        </div>`;
    }).join('');

    const html = `<html><head><style>${sharedStyles}</style></head><body>
      <h1>CapstoneGo — Panel Revision Report</h1>
      <h2>${session.title}</h2>
      <p>Date: ${new Date(session.createdAt).toLocaleDateString()}</p>
      <p>Panelist: ${session.createdByName || ''}</p><br/>
      ${rows}
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  const toggleEditMode = () => {
    if (!editMode) {
      setEditedPresenters(JSON.parse(JSON.stringify(session.presenters || [])));
    }
    setEditMode(!editMode);
  };

  const adjustScore = (presenterIdx, scoreIdx, delta) => {
    const updated = JSON.parse(JSON.stringify(editedPresenters));
    const s = updated[presenterIdx].scores[scoreIdx];
    const newScore = Math.max(0, Math.min(s.maxScore, (s.score || 0) + delta));
    updated[presenterIdx].scores[scoreIdx].score = newScore;
    setEditedPresenters(updated);
  };

  const updateVerdict = async (presenterIdx, verdict) => {
    const updated = JSON.parse(JSON.stringify(session.presenters || []));
    updated[presenterIdx].verdict = verdict;
    await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: updated });
  };

  const openRevisionModal = (presenter, idx) => {
    setRevisionPresenter(presenter);
    setRevisionPresenterIdx(idx);
    setRevisionChapter('');
    setRevisionNotes('');
    setRevisionModal(true);
  };

  const postRevisionToProject = async () => {
    if (!revisionNotes.trim()) return Alert.alert('Error', 'Please enter revision notes.');
    setPostingRevision(true);
    try {
      const searchTitle = revisionPresenter.groupName || revisionPresenter.name;
      const q = query(collection(db, 'projects'), where('title', '==', searchTitle));
      const snap = await getDocs(q);
      if (snap.empty) {
        Alert.alert('Project Not Found', `No project found with title "${searchTitle}". Make sure the presenter's project title in this session matches exactly.`);
        setPostingRevision(false);
        return;
      }
      const projectDoc = snap.docs[0];
      const projectData = projectDoc.data();
      const newEntry = {
        text: revisionNotes.trim(),
        chapter: revisionChapter.trim(),
        date: new Date().toISOString(),
        type: 'panel_revision',
        panelSession: session.title,
        verdict: revisionPresenter.verdict || '',
      };
      const updated = [...(projectData.feedbackLog || []), newEntry];
      await updateDoc(doc(db, 'projects', projectDoc.id), { feedbackLog: updated });
      Alert.alert('Sent!', 'Revision notes posted to the student project.');
      setRevisionModal(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setPostingRevision(false);
    }
  };

  const saveEdits = async () => {
    try {
      await updateDoc(doc(db, 'defenseSessions', sessionId), { presenters: editedPresenters });
      setEditMode(false);
      Alert.alert('Saved', 'Scores updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const exportIndividualPDF = async (presenter) => {
    const total = presenter.scores?.reduce((a, s) => a + (s.score || 0), 0) || 0;
    const max = presenter.scores?.reduce((a, s) => a + s.maxScore, 0) || 100;
    const scoreRows = presenter.scores?.map((s, i) => {
      const note = presenter.criterionNotes?.[i];
      return `<tr>
        <td>${s.criterion}${note ? `<div class="criterion-note">Note: ${note}</div>` : ''}</td>
        <td style="text-align:center;font-weight:700">${s.score}/${s.maxScore}</td>
      </tr>`;
    }).join('') || '';
    const verdictHtml = presenter.verdict
      ? `<div class="verdict" style="background:${verdictColor(presenter.verdict)}">${presenter.verdict}</div>`
      : '';
    const html = `<html><head><style>${sharedStyles}</style></head><body>
      <h1>CapstoneGo — Individual Scorecard</h1>
      <h2>${presenter.name}</h2>
      ${presenter.groupName ? `<p>${presenter.groupName}</p>` : ''}
      <p>Session: ${session.title}</p>
      <p>Date: ${new Date(session.createdAt).toLocaleDateString()}</p>
      ${verdictHtml}
      <table>
        <tr><th>Criterion</th><th style="text-align:center">Score</th></tr>
        ${scoreRows}
      </table>
      <p style="font-size:16px;font-weight:700;color:#4F46E5">Total: ${total} / ${max}</p>
      ${presenter.notes ? `<div class="note-box"><strong>Judge Notes:</strong> ${presenter.notes}</div>` : ''}
    </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Error', 'Could not generate PDF.');
    }
  };

  if (!session) return <View style={styles.loader}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const displayPresenters = editMode ? editedPresenters : session.presenters;

  const sorted = [...(displayPresenters || [])].sort((a, b) => {
    const aTotal = a.scores?.reduce((acc, s) => acc + (s.score || 0), 0) || 0;
    const bTotal = b.scores?.reduce((acc, s) => acc + (s.score || 0), 0) || 0;
    return bTotal - aTotal;
  });

  const maxTotal = (session.criteria || []).reduce((a, c) => a + c.maxScore, 0) || 100;

  const chartData = (displayPresenters || []).map((p) => ({
    value: p.scores?.reduce((a, s) => a + (s.score || 0), 0) || 0,
    label: (p.name || '').substring(0, 8),
    frontColor: COLORS.primary,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Results</Text>
          <Text style={styles.headerSub}>{session.title}</Text>
        </View>
        <TouchableOpacity onPress={toggleEditMode} style={[styles.exportBtn, editMode && styles.exportBtnActive]}>
          <Ionicons name={editMode ? 'close-outline' : 'pencil-outline'} size={20} color={COLORS.white} />
          <Text style={styles.exportText}>{editMode ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
        {editMode ? (
          <TouchableOpacity onPress={saveEdits} style={[styles.exportBtn, { backgroundColor: COLORS.secondary }]}>
            <Ionicons name="checkmark-outline" size={20} color={COLORS.white} />
            <Text style={styles.exportText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity onPress={exportRevisionsPDF} style={[styles.exportBtn, { backgroundColor: '#7C3AED' }]}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.white} />
              <Text style={styles.exportText}>Rev.</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={exportPDF} style={styles.exportBtn}>
              <Ionicons name="download-outline" size={20} color={COLORS.white} />
              <Text style={styles.exportText}>PDF</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Score Comparison Chart */}
        {chartData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Score Comparison</Text>
            <BarChart
              data={chartData}
              barWidth={Math.max(28, Math.min(48, 200 / chartData.length))}
              spacing={14}
              roundedTop
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: COLORS.textLight, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9, textAlign: 'center' }}
              maxValue={maxTotal}
              noOfSections={4}
              referenceLine1Position={maxTotal}
              referenceLine1Config={{ color: COLORS.accent, dashWidth: 4, dashGap: 4, thickness: 1.5 }}
              isAnimated
            />
          </View>
        )}

        {/* Leaderboard */}
        {sorted.map((presenter, i) => {
          const origIdx = editMode
            ? editedPresenters?.findIndex((p) => p.name === presenter.name)
            : session.presenters?.findIndex((p) => p.name === presenter.name) ?? i;
          const total = presenter.scores?.reduce((a, s) => a + (s.score || 0), 0) || 0;
          const pct = Math.round((total / maxTotal) * 100);
          const medals = ['🥇', '🥈', '🥉'];
          const verdict = presenter.verdict || '';
          const verdictStyle = verdict === 'Passed' ? styles.verdictPassed : verdict === 'Failed' ? styles.verdictFailed : verdict === 'Passed with Revisions' ? styles.verdictRevisions : null;
          return (
            <View key={i} style={[styles.resultCard, i === 0 && styles.topCard]}>
              <View style={styles.resultRank}>
                <Text style={styles.rankText}>{medals[i] || `#${i + 1}`}</Text>
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{presenter.name}</Text>
                {presenter.groupName ? <Text style={styles.resultProject}>{presenter.groupName}</Text> : null}
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: i === 0 ? COLORS.accent : COLORS.primary }]} />
                </View>
                {editMode && origIdx !== undefined && origIdx !== -1 ? (
                  <View style={styles.editScoresContainer}>
                    {presenter.scores?.map((s, si) => (
                      <View key={si} style={styles.editScoreRow}>
                        <Text style={styles.editCriterion} numberOfLines={1}>{s.criterion}</Text>
                        <TouchableOpacity style={styles.scoreAdjBtn} onPress={() => adjustScore(origIdx, si, -1)}>
                          <Ionicons name="remove" size={14} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text style={styles.editScoreVal}>{s.score}/{s.maxScore}</Text>
                        <TouchableOpacity style={[styles.scoreAdjBtn, { backgroundColor: COLORS.secondary }]} onPress={() => adjustScore(origIdx, si, 1)}>
                          <Ionicons name="add" size={14} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.scoreBreakdown}>
                    {presenter.scores?.map((s) => `${s.score}/${s.maxScore}`).join(' · ')}
                  </Text>
                )}

                {/* Verdict selector */}
                {!editMode && (
                  <View style={styles.verdictRow}>
                    {['Passed', 'Passed with Revisions', 'Failed'].map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={[styles.verdictBtn, presenter.verdict === v && (v === 'Passed' ? styles.verdictPassed : v === 'Failed' ? styles.verdictFailed : styles.verdictRevisions)]}
                        onPress={() => updateVerdict(origIdx, presenter.verdict === v ? '' : v)}
                      >
                        <Text style={[styles.verdictBtnText, presenter.verdict === v && { color: COLORS.white }]}>
                          {v === 'Passed' ? 'Passed' : v === 'Failed' ? 'Failed' : 'Revisions'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Send revision notes */}
                {!editMode && (
                  <TouchableOpacity style={styles.sendRevisionBtn} onPress={() => openRevisionModal(presenter, origIdx)}>
                    <Ionicons name="send-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.sendRevisionText}>Send Revision Notes to Project</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ alignItems: 'center', gap: 6 }}>
                <View style={styles.resultScore}>
                  <Text style={[styles.resultTotal, i === 0 && { color: COLORS.accent }]}>{total}</Text>
                  <Text style={styles.resultMax}>/{maxTotal}</Text>
                </View>
                {!editMode && (
                  <TouchableOpacity onPress={() => exportIndividualPDF(presenter)} style={styles.printBtn}>
                    <Ionicons name="share-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Criterion Notes Summary */}
        {session.presenters?.some((p) => p.criterionNotes && Object.values(p.criterionNotes).some(Boolean)) && (
          <>
            <Text style={styles.sectionTitle}>Criterion Notes</Text>
            {session.presenters.filter((p) => p.criterionNotes).map((p, pi) => (
              Object.entries(p.criterionNotes).filter(([, v]) => v).map(([idx, note]) => (
                <View key={`${pi}-${idx}`} style={styles.notesCard}>
                  <Text style={styles.notesName}>{p.name} — {p.scores?.[idx]?.criterion || `Criterion ${+idx + 1}`}</Text>
                  <Text style={styles.notesText}>{note}</Text>
                </View>
              ))
            ))}
          </>
        )}

        {/* Notes Summary */}
        {session.presenters?.some((p) => p.notes) && (
          <>
            <Text style={styles.sectionTitle}>Judge Notes</Text>
            {session.presenters.filter((p) => p.notes).map((p, i) => (
              <View key={i} style={styles.notesCard}>
                <Text style={styles.notesName}>{p.name}</Text>
                <Text style={styles.notesText}>{p.notes}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Revision Notes Modal */}
      <Modal visible={revisionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Send Revision Notes</Text>
            {revisionPresenter && (
              <Text style={styles.modalSubtitle}>{revisionPresenter.name}{revisionPresenter.groupName ? ` — ${revisionPresenter.groupName}` : ''}</Text>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder="Chapter (e.g. Chapter 3) — optional"
              value={revisionChapter}
              onChangeText={setRevisionChapter}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              placeholder="Write revision notes here..."
              value={revisionNotes}
              onChangeText={setRevisionNotes}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.modalHint}>
              Note: The project title must match exactly "{revisionPresenter?.groupName || revisionPresenter?.name}" in the student's app.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRevisionModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={postRevisionToProject} disabled={postingRevision}>
                {postingRevision ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalSaveText}>Send</Text>}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  exportText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  resultCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', ...SHADOWS.small },
  topCard: { borderWidth: 2, borderColor: COLORS.accent },
  resultRank: { width: 40, alignItems: 'center', marginRight: 12 },
  rankText: { fontSize: 24 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  resultProject: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 2 },
  scoreBreakdown: { fontSize: 11, color: COLORS.textLight },
  resultScore: { alignItems: 'center', marginLeft: 8 },
  resultTotal: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  resultMax: { fontSize: 12, color: COLORS.textSecondary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 10 },
  notesCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, ...SHADOWS.small },
  notesName: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  notesText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  exportBtnActive: { backgroundColor: COLORS.danger },
  chartCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  chartTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  editScoresContainer: { marginTop: 6, gap: 4 },
  editScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  editCriterion: { flex: 1, fontSize: 11, color: COLORS.textSecondary },
  scoreAdjBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center',
  },
  editScoreVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, minWidth: 32, textAlign: 'center' },
  printBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: `${COLORS.primary}18`, justifyContent: 'center', alignItems: 'center',
  },
  verdictRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  verdictBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  verdictBtnText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  verdictPassed: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  verdictFailed: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  verdictRevisions: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  sendRevisionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8,
  },
  sendRevisionText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1E293B', marginBottom: 12,
  },
  modalTextarea: { height: 120 },
  modalHint: { fontSize: 11, color: '#94A3B8', marginBottom: 16, fontStyle: 'italic' },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', color: '#64748B' },
  modalSave: {
    flex: 1, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  modalSaveText: { fontWeight: '700', color: '#fff' },
});
