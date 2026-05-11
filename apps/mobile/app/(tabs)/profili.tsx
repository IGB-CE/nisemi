import { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, typography } from '../../lib/colors';
import { ErrorScreen } from '../../components/States';
import Card from '../../components/ui/Card';
import StatRow from '../../components/ui/StatRow';
import MegaStat from '../../components/ui/MegaStat';
import PrimaryButton from '../../components/ui/PrimaryButton';
import BarChart from '../../components/ui/BarChart';
import Pill from '../../components/ui/Pill';
import CarPhotoUploader from '../../components/CarPhotoUploader';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'Q', 'K', 'G', 'S', 'T', 'N', 'D'];

export default function Profili() {
  const { token, user, signOut, signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<any>(null);
  const [tripsByMonth, setTripsByMonth] = useState<number[]>(new Array(12).fill(0));
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

  useEffect(() => {
    if (!token) return;
    const isDriver = profile?.role === 'DRIVER' || profile?.role === 'ADMIN';
    const path = isDriver ? '/api/v1/trips/my' : '/api/v1/reservations/my';
    api.get<any[]>(path, token).then(items => {
      const counts = new Array(12).fill(0);
      for (const it of items) {
        const date = new Date(isDriver ? it.departureAt : it.trip?.departureAt);
        if (!isNaN(date.getTime())) counts[date.getMonth()]++;
      }
      setTripsByMonth(counts);
    }).catch(() => {});
  }, [token, profile?.role]);

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
    } catch (e: any) { Alert.alert('Gabim', e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  const isDriver = profile?.role === 'DRIVER' || profile?.role === 'ADMIN';
  const memberYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : new Date().getFullYear();
  const dp = profile?.driverProfile;
  const reviewsCount = dp?.totalTrips ?? 0;
  const rating = dp?.rating ?? 0;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingTop: insets.top + 8 }} showsVerticalScrollIndicator={false}>
        <View style={s.topBar}>
          <View style={{ width: 28 }} />
          <Text style={s.topBarTitle}>Profili</Text>
          <TouchableOpacity onPress={() => setEditMode(v => !v)} style={s.topBarBtn}>
            <Text style={s.topBarBtnText}>{editMode ? '✕' : '⋯'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.firstName} numberOfLines={1}>{profile?.firstName}</Text>
            <Text style={s.lastName} numberOfLines={1}>{profile?.lastName}</Text>
            <Text style={s.memberSince}>Anëtar që nga ({memberYear})</Text>

            <View style={s.bigStats}>
              <View style={s.bigStat}>
                <MegaStat value={isDriver ? (dp?.totalTrips ?? 0) : tripsByMonth.reduce((a, b) => a + b, 0)} unit="Udhëtime" />
              </View>
              <View style={s.bigStat}>
                <MegaStat value={isDriver ? rating.toFixed(1) : reviewsCount} unit={isDriver ? 'Vlerësim' : 'Rezervime'} />
              </View>
            </View>
          </View>

          <View style={s.heroRight}>
            <LinearGradient
              colors={['rgba(225,6,0,0.0)', 'rgba(225,6,0,0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatarGlow}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>{profile?.firstName?.[0]}{profile?.lastName?.[0]}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        <Card style={s.section}>
          <View style={s.sectionHeader}>
            <Pill label={isDriver ? 'Shofer' : 'Pasagjer'} />
            <Text style={s.email}>{profile?.email}</Text>
          </View>
          {profile?.phone && <StatRow icon="📞" value={profile.phone} label="Telefoni" />}
          {isDriver && dp && (
            <>
              <View style={s.divider} />
              <StatRow icon="🏆" value={dp.totalTrips} label="Udhëtime totale" />
              <StatRow icon="⭐" value={rating.toFixed(1)} label="Vlerësim mesatar" />
              <StatRow icon="🚘" value={`${dp.carModel} · ${dp.carColor}`} label="Makina" />
              <StatRow icon="🔢" value={dp.carPlate} label="Targa" />
            </>
          )}
        </Card>

        {isDriver && dp && (
          <Card style={s.section}>
            <Text style={s.cardLabel}>Foto e makinës</Text>
            <View style={{ height: 12 }} />
            <CarPhotoUploader
              currentUrl={dp.carPhotoUrl}
              onUploaded={(url) => setProfile((p: any) => ({ ...p, driverProfile: { ...p.driverProfile, carPhotoUrl: url } }))}
            />
          </Card>
        )}

        <Card style={s.section}>
          <Text style={s.cardLabel}>Aktiviteti — {new Date().getFullYear()}</Text>
          <View style={{ height: 12 }} />
          <BarChart
            data={MONTHS.map((m, i) => ({ label: m, value: tripsByMonth[i] }))}
            height={100}
          />
        </Card>

        {editMode && (
          <Card style={s.section}>
            <Text style={s.cardLabel}>Ndrysho profilin</Text>
            {[
              { key: 'firstName', label: 'Emri' },
              { key: 'lastName', label: 'Mbiemri' },
              { key: 'phone', label: 'Telefoni' },
            ].map(({ key, label }) => (
              <View key={key} style={{ marginTop: 14 }}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={editForm[key as keyof typeof editForm]}
                  onChangeText={v => setEditForm(f => ({ ...f, [key]: v }))}
                  placeholderTextColor={colors.subtle}
                  autoCapitalize={key === 'phone' ? 'none' : 'words'}
                  keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                />
              </View>
            ))}
            <View style={{ marginTop: 18 }}>
              <PrimaryButton label="Ruaj ndryshimet" onPress={saveProfile} loading={saving} />
            </View>
          </Card>
        )}

        {!isDriver && !showDriverForm && (
          <View style={s.section}>
            <PrimaryButton label="Bëhu shofer" icon="🚗" onPress={() => setShowDriverForm(true)} variant="outline" />
          </View>
        )}

        {showDriverForm && (
          <Card style={s.section}>
            <Text style={s.cardLabel}>Regjistrohu si shofer</Text>
            {[
              { key: 'carModel', label: 'Modeli i makinës' },
              { key: 'carColor', label: 'Ngjyra' },
              { key: 'carPlate', label: 'Targa' },
            ].map(({ key, label }) => (
              <View key={key} style={{ marginTop: 14 }}>
                <Text style={s.fieldLabel}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={driverForm[key as keyof typeof driverForm]}
                  onChangeText={v => setDriverForm(f => ({ ...f, [key]: v }))}
                  autoCapitalize="characters"
                  placeholderTextColor={colors.subtle}
                />
              </View>
            ))}
            <View style={{ marginTop: 18, gap: 10 }}>
              <PrimaryButton label="Krijo profilin" onPress={createDriverProfile} loading={saving} />
              <PrimaryButton label="Anulo" onPress={() => setShowDriverForm(false)} variant="ghost" />
            </View>
          </Card>
        )}

        <View style={s.section}>
          <PrimaryButton label="Dil nga llogaria" onPress={handleLogout} variant="ghost" />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  topBarTitle: { ...typography.h3, color: colors.textDim },
  topBarBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  topBarBtnText: { color: colors.text, fontSize: 18, fontWeight: '700' },

  hero: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
  heroLeft: { flex: 1, justifyContent: 'center' },
  firstName: { ...typography.hero, lineHeight: 56 },
  lastName: { ...typography.h1, color: colors.primary, marginTop: -4 },
  memberSince: { ...typography.caption, marginTop: 6, color: colors.textDim },
  bigStats: { marginTop: 20, gap: 6 },
  bigStat: {},

  heroRight: { width: 120, justifyContent: 'center', alignItems: 'center' },
  avatarGlow: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary },
  avatarText: { fontSize: 36, fontWeight: '900', color: colors.text },

  section: { marginHorizontal: 16, marginTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  email: { ...typography.caption, color: colors.textDim },
  cardLabel: { ...typography.label },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  fieldLabel: { ...typography.label, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text },
});
