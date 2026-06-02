import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SHADOWS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { sendInstantNotification } from '../../utils/notifications';

export default function ProfileScreen() {
  const { user, userProfile } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const [name, setName] = useState(userProfile?.name || '');
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow access to photos.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploadingPhoto(true);
      try {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        await updateProfile(auth.currentUser, { photoURL: url });
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        setPhotoURL(url);
        Alert.alert('Success', 'Profile photo updated!');
      } catch (e) {
        Alert.alert('Error', 'Failed to upload photo.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Name cannot be empty.');
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: name.trim() });
      await sendInstantNotification('Profile Updated', 'Your profile has been saved successfully.');
      Alert.alert('Saved!', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return Alert.alert('Error', 'Passwords do not match.');
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (e) {
      Alert.alert('Error', e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : e.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const s = makeStyles(colors);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.headerTitle}>My Profile</Text>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={s.avatarWrapper}>
          {uploadingPhoto ? (
            <View style={s.avatar}><ActivityIndicator color={colors.white} /></View>
          ) : photoURL ? (
            <Image source={{ uri: photoURL }} style={s.avatar} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarInitial}>{(userProfile?.name || 'U')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={s.cameraBtn}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
        </TouchableOpacity>
        <Text style={s.avatarHint}>Tap to change photo</Text>
      </View>

      {/* Info Card */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Account Info</Text>

        <View style={s.infoRow}>
          <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
          <Text style={s.infoText}>{user?.email}</Text>
        </View>

        <View style={s.infoRow}>
          <Ionicons name={userProfile?.role === 'panel' ? 'people-outline' : 'book-outline'} size={18} color={colors.textSecondary} />
          <Text style={s.infoText}>{userProfile?.role === 'panel' ? 'Panelist' : 'Student'}</Text>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Display Name</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textLight}
            />
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} size="small" /> : (
            <Text style={s.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Change Password</Text>

        <View style={s.inputGroup}>
          <Text style={s.label}>Current Password</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholderTextColor={colors.textLight}
              placeholder="Enter current password"
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>New Password</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="lock-open-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholderTextColor={colors.textLight}
              placeholder="Min. 6 characters"
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Confirm New Password</Text>
          <View style={s.inputWrapper}>
            <Ionicons name="lock-open-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={s.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={colors.textLight}
              placeholder="Repeat new password"
            />
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={changePassword} disabled={changingPassword}>
          {changingPassword ? <ActivityIndicator color={colors.white} size="small" /> : (
            <Text style={s.saveBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Dark Mode */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>Appearance</Text>
        <View style={s.toggleRow}>
          <View style={s.toggleLeft}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={colors.primary} />
            <Text style={s.toggleLabel}>Dark Mode</Text>
          </View>
          <TouchableOpacity style={[s.toggle, isDark && s.toggleOn]} onPress={toggleTheme}>
            <View style={[s.toggleThumb, isDark && s.toggleThumbOn]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={s.card}>
        <Text style={s.sectionLabel}>About</Text>
        <View style={s.infoRow}>
          <Ionicons name="school-outline" size={18} color={colors.textSecondary} />
          <Text style={s.infoText}>CapstoneGo v1.0.0</Text>
        </View>
        <View style={s.infoRow}>
          <Ionicons name="code-slash-outline" size={18} color={colors.textSecondary} />
          <Text style={s.infoText}>Built with React Native + Expo</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 24, marginTop: 8 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: { fontSize: 36, fontWeight: '800', color: colors.white },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.background,
  },
  avatarHint: { fontSize: 12, color: colors.textLight, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoText: { fontSize: 14, color: colors.text },
  inputGroup: { marginTop: 12, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 15, color: colors.text },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  toggle: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: colors.border, justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white },
  toggleThumbOn: { alignSelf: 'flex-end' },
});
