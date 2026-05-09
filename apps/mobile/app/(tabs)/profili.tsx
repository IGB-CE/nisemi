import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { ErrorScreen } from '../../components/States';
import GradientHeader from '../../components/GradientHeader';

export default function Profili() {
  const { token, user, signOut, signIn } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [driverForm, setDriverForm] = useState({ carModel: '', carColor: '', carPlate: '' });
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<any>('/api/v1/users/me', token ?? undefined)
      .then(p => { setProfile(p); setEditForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' }); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  const handleLogout = () => {
    Alert.alert('Dil', 'Dëshiron të dalësh?', [
      { text: 'Jo' },
      { text: 'Po, dil', style: 'destructive', onPress: signOut },
    ]);
  };

  const saveProfile = async () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      Alert.alert('Gabim', 'Emri dhe mbiemri janë të detyrueshme'); return;
    }
    setSaving(true);
    try {
      const body: any = { firstName: editForm.firstName.trim(), lastName: editForm.lastName.trim() };
      if (editForm.phone.trim()) body.phone = editForm.phone.trim();
      const updated = await api.patch<any>('/api/v1/users/me', body, token ?? undefined);
      setProfile((p: any) => ({ ...p, ...updated }));
      await signIn(token!, { ...user!, firstName: updated.firstName, lastName: updated.lastName });
      setEditMode(false);
      Alert.alert('Sukses', 'Profili u përditësua!');
    } catch (e: any) {
      Alert.alert('Gabim', e.message);
    } finally {
      setSaving(false);
    }
  };

  const createDriverProfile = async () => {
    if (!driverForm.carModel || !driverForm.carColor || !driverForm.carPlate) {
      Alert.alert('Gabim', 'Plotëso të gjitha fushat'); return;
    }
    setSaving(true);
    try {
      await api.post('/api/v1/drivers', driverForm, token ?? undefined);
      const updated = await api.get<any>('/api/v1/users/me', token ?? undefined);
      setProfile(updated);
      await signIn(token!, { ...user!, role: 'DRIVER' });
      setShowDriverForm(false);
      Alert.alert('Sukses', 'Profili i shoferit u krijua!');
    } catch (e: any) { Alert.alert('Gabim', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <GradientHeader style={s.header}>
        <View style={s.avatar}><Text style={s.avatarText}>{profile?.firstName?.[0]}{profile?.lastName?.[0]}</Text></View>
        <Text style={s.name}>{profile?.firstName} {profile?.lastName}</Text>
        <Text style={s.email}>{profile?.email}</Text>
        {profile?.phone && <Text style={s.email}>📞 {profile.phone}</Text>}
        <View style={s.roleBadge}>
          <Text style={s.roleText}>{profile?.role === 'DRIVER' ? '🚗 Shofer' : '🧳 Pasagjer'}</Text>
        </View>
        <TouchableOpacity style={s.editHeaderBtn} onPress={() => setEditMode(v => !v)}>
          <Text style={s.editHeaderBtnText}>{editMode ? 'Anulo' : '✏️ Ndrysho'}</Text>
        </TouchableOpacity>
      </GradientHeader>

      {editMode && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ndrysho profilin</Text>
          {[
            { key: 'firstName', label: 'Emri' },
            { key: 'lastName', label: 'Mbiemri' },
            { key: 'phone', label: 'Telefoni (opsional)' },
          ].map(({ key, label }) => (
            <View key={key}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={editForm[key as keyof typeof editForm]}
                onChangeText={v => setEditForm(f => ({ ...f, [key]: v }))}
                placeholder={label}
                placeholderTextColor={colors.subtle}
                autoCapitalize={key === 'phone' ? 'none' : 'words'}
                keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
              />
            </View>
          ))}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'Duke ruajtur...' : 'Ruaj ndryshimet'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {profile?.driverProfile && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Makina ime</Text>
          <Text style={s.infoRow}>🚘 {profile.driverProfile.carModel} — {profile.driverProfile.carColor}</Text>
          <Text style={s.infoRow}>🔢 {profile.driverProfile.carPlate}</Text>
          <Text style={s.infoRow}>⭐ {profile.driverProfile.rating.toFixed(1)} vlerësim</Text>
          <Text style={s.infoRow}>🛣️ {profile.driverProfile.totalTrips} udhëtime</Text>
        </View>
      )}

      {!profile?.driverProfile && !showDriverForm && (
        <TouchableOpacity style={s.driverBtn} onPress={() => setShowDriverForm(true)}>
          <Text style={s.driverBtnText}>🚗 Bëhu shofer</Text>
        </TouchableOpacity>
      )}

      {showDriverForm && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Regjistrohu si shofer</Text>
          {[
            { key: 'carModel', label: 'Modeli i makinës' },
            { key: 'carColor', label: 'Ngjyra' },
            { key: 'carPlate', label: 'Targa' },
          ].map(({ key, label }) => (
            <View key={key}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                value={driverForm[key as keyof typeof driverForm]}
                onChangeText={v => setDriverForm(f => ({ ...f, [key]: v }))}
                autoCapitalize="characters"
                placeholderTextColor={colors.subtle}
                placeholder={label}
              />
            </View>
          ))}
          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={createDriverProfile} disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'Duke ruajtur...' : 'Krijo profilin'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelLink} onPress={() => setShowDriverForm(false)}>
            <Text style={s.cancelLinkText}>Anulo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Dil nga llogaria</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  roleBadge: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  roleText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  editHeaderBtn: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  editHeaderBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: { margin: 16, backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  infoRow: { color: colors.text, fontSize: 14, marginBottom: 6 },
  driverBtn: { margin: 16, backgroundColor: colors.primaryLight, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  driverBtnText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  label: { fontSize: 12, color: colors.subtle, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, marginBottom: 4 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelLink: { alignItems: 'center', marginTop: 12 },
  cancelLinkText: { color: colors.subtle, fontSize: 14 },
  logoutBtn: { margin: 16, marginTop: 8, borderWidth: 1, borderColor: colors.danger, borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
