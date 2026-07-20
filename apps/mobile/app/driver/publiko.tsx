import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import DateTimeField from '../../components/DateTimeField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Icon from '../../components/ui/Icon';
import Card from '../../components/ui/Card';
import PlacesAutocomplete from '../../components/PlacesAutocomplete';
import RoutePicker from '../../components/RoutePicker';
import { fetchDirections, formatDistanceKm, formatDurationMin, type RouteAlt } from '../../lib/directions';
import type { PlaceDetail } from '../../lib/places';
import { showInterstitialAfterPublish } from '../../lib/ads';
import { scheduleTripStartReminder } from '../../lib/tripReminders';
import { getAutoStartDefault } from '../../lib/autoStart';

const DETOUR_OPTIONS = [
  { value: 100, label: '100 m' },
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
];

export default function Publiko() {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const isEditing = !!editId;
  const [loadingTrip, setLoadingTrip] = useState(isEditing);
  // When prefilling for an edit we must not let the trip-type effect reset the
  // saved detour, and we must restore the saved route once routes reload.
  const skipDetourResetRef = useRef(false);
  const pendingRouteIndexRef = useRef<number | null>(null);

  const [origin, setOrigin] = useState<PlaceDetail | null>(null);
  const [dest, setDest] = useState<PlaceDetail | null>(null);
  const [waypoints, setWaypoints] = useState<PlaceDetail[]>([]);
  const [showAddWaypoint, setShowAddWaypoint] = useState(false);
  const [pendingWaypoint, setPendingWaypoint] = useState<PlaceDetail | null>(null);
  const [routes, setRoutes] = useState<RouteAlt[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);

  const tripType = useMemo<'INTRACITY' | 'INTERCITY'>(() => {
    if (origin?.cityName && dest?.cityName && origin.cityName === dest.cityName) return 'INTRACITY';
    return 'INTERCITY';
  }, [origin, dest]);

  const [maxDetourM, setMaxDetourM] = useState(500);

  useEffect(() => {
    if (skipDetourResetRef.current) {
      skipDetourResetRef.current = false;
      return;
    }
    setMaxDetourM(tripType === 'INTRACITY' ? 200 : 500);
  }, [tripType]);

  useEffect(() => {
    if (!origin || !dest) {
      setRoutes([]);
      setRoutesError(null);
      return;
    }
    let cancelled = false;
    setRoutesLoading(true);
    setRoutesError(null);
    fetchDirections(
      { lat: origin.lat, lng: origin.lng },
      { lat: dest.lat, lng: dest.lng },
      token ?? undefined,
      waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
    )
      .then((r) => {
        if (cancelled) return;
        setRoutes(r);
        const pending = pendingRouteIndexRef.current;
        if (pending != null) {
          setSelectedRouteIndex(pending < r.length ? pending : 0);
          pendingRouteIndexRef.current = null;
        } else {
          setSelectedRouteIndex(0);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setRoutesError(e.message ?? 'Nuk u gjet rrugë');
        setRoutes([]);
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin, dest, token, waypoints]);

  const [departureAt, setDepartureAt] = useState<Date | null>(null);
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [totalSeats, setTotalSeats] = useState('3');
  const [notes, setNotes] = useState('');
  const [genderRestriction, setGenderRestriction] = useState<'ANY' | 'FEMALE_ONLY' | 'MALE_ONLY'>('ANY');
  const [autoStart, setAutoStart] = useState(false);

  // New trips inherit the driver's global auto-start default; edits keep the
  // trip's own saved value (set in the prefill effect below).
  useEffect(() => {
    if (isEditing) return;
    getAutoStartDefault().then(setAutoStart);
  }, [isEditing]);

  // Prefill the form when editing an existing trip.
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    api
      .get<any>(`/api/v1/trips/${editId}`, token ?? undefined)
      .then((t) => {
        if (cancelled) return;
        skipDetourResetRef.current = true;
        pendingRouteIndexRef.current = t.routeAltIndex ?? 0;
        if (t.originLat != null && t.originLng != null) {
          setOrigin({
            lat: t.originLat,
            lng: t.originLng,
            label: t.originLabel ?? t.originCity?.name ?? 'Nisja',
            cityName: t.originCity?.name ?? null,
          });
        }
        if (t.destLat != null && t.destLng != null) {
          setDest({
            lat: t.destLat,
            lng: t.destLng,
            label: t.destLabel ?? t.destCity?.name ?? 'Destinacioni',
            cityName: t.destCity?.name ?? null,
          });
        }
        setDepartureAt(new Date(t.departureAt));
        setPricePerSeat(String(Number(t.pricePerSeat)));
        setTotalSeats(String(t.totalSeats));
        setNotes(t.notes ?? '');
        setGenderRestriction(t.genderRestriction ?? 'ANY');
        setMaxDetourM(t.maxDetourM ?? 500);
        setAutoStart(t.autoStart ?? false);
      })
      .catch((e) => {
        if (!cancelled) dialog.alert('Gabim', e.message ?? 'Nuk u ngarkua udhëtimi');
      })
      .finally(() => {
        if (!cancelled) setLoadingTrip(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);
  const [saving, setSaving] = useState(false);

  const selectedRoute = routes[selectedRouteIndex];

  const publish = async () => {
    if (!origin || !dest) {
      await dialog.alert('Gabim', 'Zgjidhni adresën e nisjes dhe destinacionin');
      return;
    }
    if (!selectedRoute) {
      await dialog.alert('Gabim', 'Zgjidhni një rrugë');
      return;
    }
    if (!departureAt || !pricePerSeat) {
      await dialog.alert('Gabim', 'Plotëso datën dhe çmimin');
      return;
    }
    if (departureAt.getTime() - Date.now() < 60 * 60 * 1000) {
      await dialog.alert('Gabim', 'Ora e nisjes duhet të jetë të paktën 1 orë nga tani');
      return;
    }
    setSaving(true);
    const body = {
      originLat: origin.lat,
      originLng: origin.lng,
      originLabel: origin.label,
      destLat: dest.lat,
      destLng: dest.lng,
      destLabel: dest.label,
      routePolyline: selectedRoute.polyline,
      routeDistanceM: selectedRoute.distanceM,
      routeDurationS: selectedRoute.durationS,
      routeAltIndex: selectedRouteIndex,
      tripType,
      maxDetourM,
      genderRestriction,
      departureAt: departureAt.toISOString(),
      pricePerSeat: Number(pricePerSeat),
      totalSeats: Number(totalSeats),
      notes: notes || undefined,
      autoStart,
    };
    try {
      const reminderTrip = { departureAt: body.departureAt, originLabel: origin.label, destLabel: dest.label };
      if (isEditing) {
        await api.patch(`/api/v1/trips/${editId}`, body, token ?? undefined);
        await scheduleTripStartReminder({ id: editId!, ...reminderTrip });
        await dialog.alert('Sukses', 'Udhëtimi u përditësua.');
      } else {
        const created = await api.post<{ id: string }>('/api/v1/trips', body, token ?? undefined);
        await scheduleTripStartReminder({ id: created.id, ...reminderTrip });
        await dialog.alert('Sukses', 'Udhëtimi u publikua.');
        showInterstitialAfterPublish();
      }
      router.back();
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingTrip) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>{isEditing ? 'Modifiko' : 'Publiko'}</Text>
        </View>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Adresat</Text>
          <Text style={s.fieldLabel}>Nga *</Text>
          <PlacesAutocomplete
            value={origin}
            onChange={setOrigin}
            placeholder="Adresa e nisjes"
            token={token ?? undefined}
            showCurrentLocation
            onError={(msg) => dialog.alert('Vendndodhja', msg)}
          />

          <Text style={s.fieldLabel}>Deri *</Text>
          <PlacesAutocomplete
            value={dest}
            onChange={setDest}
            placeholder="Adresa e destinacionit"
            token={token ?? undefined}
            onError={(msg) => dialog.alert('Adresa', msg)}
          />

          {origin && dest && (
            <View style={s.typePill}>
              <Text style={s.typePillText}>
                <Icon
                  name={tripType === 'INTRACITY' ? 'city' : 'intercity'}
                  size={13}
                  color={colors.textDim}
                />{' '}
                {tripType === 'INTRACITY' ? 'Brenda qytetit' : 'Mes qyteteve'}
              </Text>
            </View>
          )}
        </Card>

        {origin && dest && (
          <Card style={s.card}>
            <Text style={s.cardLabel}>Rruga</Text>
            {routesLoading ? (
              <View style={s.center}>
                <ActivityIndicator color={colors.primary} />
                <Text style={s.hint}>Po ngarkohen rrugët…</Text>
              </View>
            ) : routesError ? (
              <Text style={s.error}>{routesError}</Text>
            ) : routes.length === 0 ? (
              <Text style={s.hint}>Nuk u gjet rrugë midis këtyre dy pikave.</Text>
            ) : (
              <RoutePicker
                origin={{ lat: origin.lat, lng: origin.lng }}
                dest={{ lat: dest.lat, lng: dest.lng }}
                routes={routes}
                selectedIndex={selectedRouteIndex}
                onSelect={setSelectedRouteIndex}
              />
            )}

            {routes.length > 0 && (
              <View style={s.waypointBlock}>
                <Text style={s.hint}>
                  {waypoints.length === 0
                    ? 'Nëse dëshironi që rruga të kalojë nga një rrugë e caktuar, shtoni një pikë.'
                    : `${waypoints.length} pikë në rrugë`}
                </Text>
                {waypoints.map((w, i) => (
                  <View key={i} style={s.waypointChip}>
                    <Text style={s.waypointChipText} numberOfLines={1}>
                      <Icon name="location" size={13} color={colors.textDim} /> {w.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setWaypoints((prev) => prev.filter((_, idx) => idx !== i))}
                      hitSlop={10}
                    >
                      <Text style={s.waypointChipRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {showAddWaypoint ? (
                  <View style={{ marginTop: 10 }}>
                    <PlacesAutocomplete
                      value={pendingWaypoint}
                      onChange={(detail) => {
                        if (detail) {
                          setWaypoints((prev) => [...prev, detail]);
                          setPendingWaypoint(null);
                          setShowAddWaypoint(false);
                        }
                      }}
                      placeholder="Rruga ose vendi nga ku do të kaloni"
                      token={token ?? undefined}
                      onError={(msg) => dialog.alert('Adresa', msg)}
                    />
                    <TouchableOpacity
                      style={s.waypointCancel}
                      onPress={() => {
                        setShowAddWaypoint(false);
                        setPendingWaypoint(null);
                      }}
                    >
                      <Text style={s.waypointCancelText}>Anulo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  waypoints.length < 5 && (
                    <TouchableOpacity style={s.addWaypointBtn} onPress={() => setShowAddWaypoint(true)}>
                      <Text style={s.addWaypointText}>+ Shto pikë në rrugë</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </Card>
        )}

        {origin && dest && routes.length > 0 && (
          <Card style={s.card}>
            <Text style={s.cardLabel}>Sa larg pranoj pasagjerë?</Text>
            <Text style={s.hint}>Sa larg nga rruga jeni gati të devijoni për t&apos;i marrë pasagjerët.</Text>
            <View style={s.detourRow}>
              {DETOUR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.detourBtn, maxDetourM === opt.value && s.detourBtnActive]}
                  onPress={() => setMaxDetourM(opt.value)}
                >
                  <Text style={[s.detourBtnText, maxDetourM === opt.value && s.detourBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        <Card style={s.card}>
          <Text style={s.cardLabel}>Ora dhe çmimi</Text>
          <Text style={s.fieldLabel}>Data dhe ora *</Text>
          <DateTimeField
            value={departureAt}
            onChange={setDepartureAt}
            mode="datetime"
            placeholder="Zgjidhni datën dhe orën"
            minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
          />

          <Text style={s.fieldLabel}>Çmimi për vend (L) *</Text>
          <TextInput
            style={s.input}
            placeholder="1000"
            value={pricePerSeat}
            onChangeText={setPricePerSeat}
            keyboardType="numeric"
            placeholderTextColor={colors.subtle}
          />
          {selectedRoute && (
            <Text style={s.hint}>
              Distanca: {formatDistanceKm(selectedRoute.distanceM)} · Kohë: {formatDurationMin(selectedRoute.durationS)}
            </Text>
          )}
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Vende të disponueshme</Text>
          <View style={s.seatRow}>
            {['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => (
              <TouchableOpacity
                key={n}
                style={[s.seatBtn, totalSeats === n && s.seatBtnActive]}
                onPress={() => setTotalSeats(n)}
              >
                <Text style={[s.seatBtnText, totalSeats === n && s.seatBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Kufizimi i gjinisë</Text>
          <View style={s.detourRow}>
            {(
              [
                { value: 'ANY', label: 'Të gjithë' },
                { value: 'FEMALE_ONLY', label: '♀ Vetëm femra' },
                { value: 'MALE_ONLY', label: '♂ Vetëm meshkuj' },
              ] as const
            ).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.detourBtn, genderRestriction === opt.value && s.detourBtnActive]}
                onPress={() => setGenderRestriction(opt.value)}
              >
                <Text
                  style={[s.detourBtnText, genderRestriction === opt.value && s.detourBtnTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={s.card}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.cardLabel}>Fillim automatik</Text>
              <Text style={s.hint}>
                Kur ora e nisjes mbërrin dhe aplikacioni është i hapur, udhëtimi fillon vetë (me një
                numërim mbrapsht për ta anuluar).
              </Text>
            </View>
            <Switch
              value={autoStart}
              onValueChange={setAutoStart}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Shënime</Text>
          <TextInput
            style={[s.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="P.sh. takimi te stacioni, bagazh i kufizuar..."
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor={colors.subtle}
          />
        </Card>

        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <PrimaryButton
            label={isEditing ? 'Ruaj ndryshimet' : 'Publiko udhëtimin'}
            icon="car"
            onPress={publish}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  back: { marginBottom: 12 },
  backText: { color: colors.textDim, fontSize: 14 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },

  card: { marginHorizontal: 16, marginTop: 14 },
  cardLabel: { ...typography.label },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    marginTop: 6,
  },
  hint: { ...typography.caption, marginTop: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  error: { ...typography.caption, color: colors.danger, marginTop: 8 },
  center: { alignItems: 'center', paddingVertical: 16 },

  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  typePillText: { ...typography.caption, color: colors.text, fontWeight: '600' },

  detourRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12 },
  detourBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detourBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  detourBtnText: { fontSize: 14, color: colors.text, fontWeight: '700' },
  detourBtnTextActive: { color: '#fff' },

  waypointBlock: { marginTop: 14, gap: 8 },
  waypointChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  waypointChipText: { flex: 1, ...typography.body, fontSize: 13 },
  waypointChipRemove: { color: colors.subtle, fontSize: 20, fontWeight: '300', paddingHorizontal: 6 },
  addWaypointBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addWaypointText: { color: colors.subtle, fontSize: 13, fontWeight: '600' },
  waypointCancel: { marginTop: 8, alignItems: 'center' },
  waypointCancelText: { color: colors.subtle, fontSize: 12 },

  seatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  seatBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  seatBtnText: { fontSize: 15, color: colors.text, fontWeight: '700' },
  seatBtnTextActive: { color: '#fff' },
});
