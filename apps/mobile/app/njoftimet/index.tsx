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
  TextInput,
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
import Icon from '../../components/ui/Icon';
import PlacesAutocomplete from '../../components/PlacesAutocomplete';
import DateTimeField from '../../components/DateTimeField';
import type { PlaceDetail } from '../../lib/places';
import { showInterstitialAfterPublish, showRewardedAd } from '../../lib/ads';

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
  const [boostingId, setBoostingId] = useState<string | null>(null);

  const [origin, setOrigin] = useState<PlaceDetail | null>(null);
  const [dest, setDest] = useState<PlaceDetail | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [searchRadiusM, setSearchRadiusM] = useState(500);
  const [price, setPrice] = useState('');
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');

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
    setPrice('');
    setSeats(1);
    setNote('');
  };

  const create = async () => {
    if (!origin || !dest || !token) {
      await dialog.alert('Gabim', 'Plotëso adresat');
      return;
    }
    const priceValue = price.trim() ? Number(price.trim().replace(',', '.')) : null;
    if (priceValue !== null && (Number.isNaN(priceValue) || priceValue < 0)) {
      await dialog.alert('Gabim', 'Çmimi nuk është i vlefshëm');
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
          pricePerSeat: price.trim() ? Number(price.trim().replace(',', '.')) : undefined,
          seats,
          note: note.trim() || undefined,
        },
        token,
      );
      setShowCreate(false);
      resetForm();
      load();
      showInterstitialAfterPublish();
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setCreating(false);
    }
  };

  const boostAlert = async (alert: RideAlert) => {
    if (!token) return;
    const ok = await dialog.confirm(
      'Promovo kërkesën',
      'Shiko një reklamë të shkurtër për ta vendosur kërkesën tuaj në krye të listës së shoferëve për 12 orë.',
      'Vazhdo',
    );
    if (!ok) return;
    setBoostingId(alert.id);
    try {
      const earned = await showRewardedAd();
      if (!earned) {
        await dialog.alert('Reklama nuk u përfundua', 'Kërkesa nuk u promovua. Provo përsëri më vonë.');
        return;
      }
      const updated = await rideAlerts.boost(alert.id, token);
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? updated : a)));
      await dialog.alert('U promovua', 'Kërkesa do të shfaqet në krye të listës për 12 orë.');
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setBoostingId(null);
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
          <PrimaryButton label="Shto njoftim" icon="plus" onPress={() => setShowCreate(true)} />
        </View>

        {alerts.length === 0 ? (
          <View style={{ marginTop: 30 }}>
            <EmptyState
              icon="bell"
              title="Nuk keni njoftime aktive"
              subtitle="Shto një njoftim për t&apos;u lajmëruar kur publikohet një udhëtim."
            />
          </View>
        ) : (
          alerts.map((a) => {
            const expired = new Date(a.expiresAt).getTime() < Date.now();
            const isBoosted = !!a.boostedUntil && new Date(a.boostedUntil).getTime() > Date.now();
            const canBoost = !expired && a.active && a.visibleToDrivers && !isBoosted;
            return (
              <Card key={a.id} style={s.card}>
                {isBoosted && (
                  <View style={s.boostPill}>
                    <Text style={s.boostPillText}>
                      ⚡ Promovuar deri{' '}
                      {new Date(a.boostedUntil!).toLocaleTimeString('sq-AL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
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
                  <Icon name="calendar" size={12} color={colors.subtle} />{' '}
                  {a.date
                    ? new Date(a.date).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Çdo datë'}{' '}
                  · <Icon name="ruler" size={12} color={colors.subtle} /> {a.searchRadiusM} m
                </Text>
                <Text style={s.alertExpiry}>
                  {expired
                    ? 'Skadoi'
                    : `Skadon: ${new Date(a.expiresAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })}`}
                </Text>
                {canBoost && (
                  <TouchableOpacity
                    style={s.boostButton}
                    disabled={boostingId === a.id}
                    onPress={() => boostAlert(a)}
                  >
                    <Text style={s.boostButtonText}>
                      {boostingId === a.id ? 'Po ngarkohet…' : '⚡ Promovo kërkesën 12h'}
                    </Text>
                  </TouchableOpacity>
                )}
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

            <Text style={s.fieldLabel}>Çmimi për person (opsionale)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="p.sh. 500"
              placeholderTextColor={colors.subtle}
              keyboardType="numeric"
              style={s.input}
            />
            <Text style={s.hint}>Lëre bosh nëse çmimi është i negociueshëm.</Text>

            <Text style={s.fieldLabel}>Sa persona udhëtojnë?</Text>
            <View style={s.radiusRow}>
              {[1, 2, 3, 4].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[s.radiusBtn, seats === n && s.radiusBtnActive]}
                  onPress={() => setSeats(n)}
                >
                  <Text style={[s.radiusBtnText, seats === n && s.radiusBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Shënim për shoferin (opsionale)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="p.sh. kam dy valixhe"
              placeholderTextColor={colors.subtle}
              multiline
              maxLength={500}
              style={[s.input, s.inputMultiline]}
            />

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

  boostPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  boostPillText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  boostButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  boostButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

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

  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  hint: { ...typography.caption, color: colors.subtle, marginTop: 6, fontSize: 11 },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 28 },
});
