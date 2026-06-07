import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { rideAlerts, type RideAlert } from '../../lib/ride-alerts';
import { ErrorScreen, EmptyState } from '../../components/States';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';
import PlacesAutocomplete from '../../components/PlacesAutocomplete';
import DateTimeField from '../../components/DateTimeField';
import type { PlaceDetail } from '../../lib/places';

const RADIUS_OPTIONS = [
  { value: 100, label: '100 m' },
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
];

export default function RideAlertsScreen() {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const prefill = useLocalSearchParams<{
    originLat?: string;
    originLng?: string;
    originLabel?: string;
    destLat?: string;
    destLng?: string;
    destLabel?: string;
    date?: string;
    searchRadiusM?: string;
  }>();
  const prefillAppliedRef = useRef(false);
  const [alerts, setAlerts] = useState<RideAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [origin, setOrigin] = useState<PlaceDetail | null>(null);
  const [dest, setDest] = useState<PlaceDetail | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [searchRadiusM, setSearchRadiusM] = useState(500);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    rideAlerts
      .list(token)
      .then(setAlerts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (prefill.originLat && prefill.originLng && prefill.originLabel && prefill.destLat && prefill.destLng && prefill.destLabel) {
      setOrigin({
        lat: Number(prefill.originLat),
        lng: Number(prefill.originLng),
        label: prefill.originLabel,
        cityName: null,
      });
      setDest({
        lat: Number(prefill.destLat),
        lng: Number(prefill.destLng),
        label: prefill.destLabel,
        cityName: null,
      });
      if (prefill.date) setDate(new Date(prefill.date));
      if (prefill.searchRadiusM) setSearchRadiusM(Number(prefill.searchRadiusM));
      setShowCreate(true);
      prefillAppliedRef.current = true;
    }
  }, [prefill]);

  const resetForm = () => {
    setOrigin(null);
    setDest(null);
    setDate(null);
    setSearchRadiusM(500);
  };

  const create = async () => {
    if (!origin || !dest || !token) {
      await dialog.alert('Gabim', 'Plotëso adresat');
      return;
    }
    setCreating(true);
    try {
      await rideAlerts.create(
        {
          originLat: origin.lat,
          originLng: origin.lng,
          originLabel: origin.label,
          destLat: dest.lat,
          destLng: dest.lng,
          destLabel: dest.label,
          date: date?.toISOString(),
          searchRadiusM,
        },
        token,
      );
      setShowCreate(false);
      resetForm();
      load();
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleAlert = async (alert: RideAlert) => {
    if (!token) return;
    try {
      const updated = await rideAlerts.setActive(alert.id, !alert.active, token);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  const deleteAlert = async (alert: RideAlert) => {
    const ok = await dialog.confirm('Fshi njoftimin?', 'Nuk do të merrni më njoftime për këtë rrugë.', 'Fshi');
    if (!ok || !token) return;
    try {
      await rideAlerts.remove(alert.id, token);
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}>
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Njoftimet e mia</Text>
          <Text style={s.subtitle}>Ju njoftojmë kur publikohet një udhëtim që përshtatet</Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <PrimaryButton label="Shto njoftim" icon="+" onPress={() => setShowCreate(true)} />
        </View>

        {alerts.length === 0 ? (
          <View style={{ marginTop: 30 }}>
            <EmptyState
              icon="🔔"
              title="Nuk keni njoftime aktive"
              subtitle="Shto një njoftim për t&apos;u lajmëruar kur publikohet një udhëtim."
            />
          </View>
        ) : (
          alerts.map((a) => {
            const expired = new Date(a.expiresAt).getTime() < Date.now();
            return (
              <Card key={a.id} style={s.card}>
                <View style={s.alertHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.alertRoute} numberOfLines={1}>
                      {a.originLabel}
                    </Text>
                    <Text style={s.alertArrow}>↓</Text>
                    <Text style={s.alertRoute} numberOfLines={1}>
                      {a.destLabel}
                    </Text>
                  </View>
                  <Switch
                    value={a.active && !expired}
                    onValueChange={() => toggleAlert(a)}
                    disabled={expired}
                    thumbColor={a.active ? colors.primary : colors.subtle}
                    trackColor={{ false: colors.border, true: colors.primary + '55' }}
                  />
                </View>
                <Text style={s.alertMeta}>
                  {a.date
                    ? `📅 ${new Date(a.date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : '📅 Çdo datë'}{' '}
                  · 📏 {a.searchRadiusM} m
                </Text>
                <Text style={s.alertExpiry}>
                  {expired
                    ? 'Skadoi'
                    : `Skadon: ${new Date(a.expiresAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })}`}
                </Text>
                <TouchableOpacity onPress={() => deleteAlert(a)} style={s.deleteBtn}>
                  <Text style={s.deleteText}>Fshi</Text>
                </TouchableOpacity>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>Njoftim i ri</Text>

            <Text style={s.fieldLabel}>Nga *</Text>
            <PlacesAutocomplete
              value={origin}
              onChange={setOrigin}
              placeholder="Adresa e nisjes"
              token={token ?? undefined}
              showCurrentLocation
              onError={(m) => dialog.alert('Vendndodhja', m)}
            />

            <Text style={s.fieldLabel}>Deri *</Text>
            <PlacesAutocomplete
              value={dest}
              onChange={setDest}
              placeholder="Adresa e destinacionit"
              token={token ?? undefined}
            />

            <Text style={s.fieldLabel}>Data (opsionale)</Text>
            <DateTimeField value={date} onChange={setDate} mode="date" placeholder="Çdo datë" />

            <Text style={s.fieldLabel}>Sa larg pranoj të eci?</Text>
            <View style={s.radiusRow}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.radiusBtn, searchRadiusM === opt.value && s.radiusBtnActive]}
                  onPress={() => setSearchRadiusM(opt.value)}
                >
                  <Text style={[s.radiusBtnText, searchRadiusM === opt.value && s.radiusBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalBtns}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Anulo"
                  onPress={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  variant="ghost"
                />
              </View>
              <View style={{ flex: 2 }}>
                <PrimaryButton label="Ruaj" onPress={create} loading={creating} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  back: { marginBottom: 8 },
  backText: { color: colors.textDim, fontSize: 14 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },
  subtitle: { ...typography.bodyDim, marginTop: 6 },

  card: { marginHorizontal: 16, marginTop: 12 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertRoute: { ...typography.body, fontWeight: '600' },
  alertArrow: { ...typography.caption, color: colors.subtle, marginVertical: 2 },
  alertMeta: { ...typography.caption, marginTop: 10 },
  alertExpiry: { ...typography.caption, marginTop: 4, color: colors.subtle, fontSize: 11 },
  deleteBtn: { marginTop: 10, alignSelf: 'flex-end' },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  modalTitle: { ...typography.h1, marginBottom: 18 },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 14 },

  radiusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  radiusBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radiusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusBtnText: { fontSize: 13, color: colors.text, fontWeight: '700' },
  radiusBtnTextActive: { color: '#fff' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 28 },
});
