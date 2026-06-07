import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { ErrorScreen } from '../../components/States';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { maybeShowInterstitialAfterBooking } from '../../lib/ads';
import LiveTripMap from '../../components/LiveTripMap';
import { formatDistanceKm, formatDurationMin } from '../../lib/directions';
import { blocks as blocksApi } from '../../lib/blocks';

export default function TripDetail() {
  const params = useLocalSearchParams<{
    id: string;
    pickupLat?: string;
    pickupLng?: string;
    pickupLabel?: string;
    dropoffLat?: string;
    dropoffLng?: string;
    dropoffLabel?: string;
  }>();
  const { id } = params;
  const { token, user } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const pickup = useMemo(() => {
    if (params.pickupLat && params.pickupLng && params.pickupLabel) {
      return { lat: Number(params.pickupLat), lng: Number(params.pickupLng), label: params.pickupLabel };
    }
    return null;
  }, [params.pickupLat, params.pickupLng, params.pickupLabel]);

  const dropoff = useMemo(() => {
    if (params.dropoffLat && params.dropoffLng && params.dropoffLabel) {
      return { lat: Number(params.dropoffLat), lng: Number(params.dropoffLng), label: params.dropoffLabel };
    }
    return null;
  }, [params.dropoffLat, params.dropoffLng, params.dropoffLabel]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<any>(`/api/v1/trips/${id}`)
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const book = async () => {
    if (!token) {
      router.push('/(auth)/login');
      return;
    }
    setBooking(true);
    try {
      const body: Record<string, unknown> = { tripId: id, seats: 1 };
      if (pickup && dropoff) {
        body.pickupLat = pickup.lat;
        body.pickupLng = pickup.lng;
        body.pickupLabel = pickup.label;
        body.dropoffLat = dropoff.lat;
        body.dropoffLng = dropoff.lng;
        body.dropoffLabel = dropoff.label;
      }
      await api.post('/api/v1/reservations', body, token);
      await dialog.alert('Sukses', 'Rezervimi u dërgua. Prit konfirmimin e shoferit.');
      maybeShowInterstitialAfterBooking();
      router.push('/(tabs)/rezervimet');
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!trip) return <ErrorScreen message="Ky udhëtim nuk u gjet." />;

  const isOwnTrip = trip.driver.id === user?.id;
  const dp = trip.driver.driverProfile;

  const originLat = trip.originLat ?? trip.originCity?.lat ?? null;
  const originLng = trip.originLng ?? trip.originCity?.lng ?? null;
  const destLat = trip.destLat ?? trip.destCity?.lat ?? null;
  const destLng = trip.destLng ?? trip.destCity?.lng ?? null;
  const originText = trip.originLabel ?? trip.originCity?.name ?? '';
  const destText = trip.destLabel ?? trip.destCity?.name ?? '';

  const routeCoords: { latitude: number; longitude: number }[] = trip.routePolyline
    ? polyline.decode(trip.routePolyline).map(([lat, lng]: [number, number]) => ({ latitude: lat, longitude: lng }))
    : [];

  const hasAcceptedReservation =
    user &&
    (trip.reservations ?? []).some(
      (r: any) => r.passenger?.id === user.id && r.status === 'ACCEPTED',
    );
  const isLive =
    trip.status === 'IN_PROGRESS' &&
    !!token &&
    originLat != null &&
    originLng != null &&
    destLat != null &&
    destLng != null &&
    (hasAcceptedReservation || isOwnTrip);

  const statusLabel =
    trip.status === 'SCHEDULED'
      ? 'Aktiv'
      : trip.status === 'IN_PROGRESS'
        ? 'Në rrugë'
        : trip.status === 'CANCELLED'
          ? 'Anulluar'
          : 'Përfunduar';
  const statusColor =
    trip.status === 'SCHEDULED'
      ? colors.success
      : trip.status === 'IN_PROGRESS'
        ? colors.primary
        : trip.status === 'CANCELLED'
          ? colors.danger
          : colors.textDim;

  const submitReport = async () => {
    if (reportReason.trim().length < 10) {
      await dialog.alert('Gabim', 'Arsyeja duhet të ketë të paktën 10 karaktere.');
      return;
    }
    setReporting(true);
    try {
      await api.post(
        '/api/v1/reports',
        { reportedId: trip.driver.id, reason: reportReason.trim() },
        token ?? undefined,
      );
      setShowReport(false);
      setReportReason('');
      await dialog.alert('Faleminderit', 'Raporti u dërgua.');
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setReporting(false);
    }
  };

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>NISEMI</Text>
          <View style={s.route}>
            <Text style={s.city} numberOfLines={2}>
              {originText}
            </Text>
            <Text style={s.arrow}>→</Text>
            <Text style={s.city} numberOfLines={2}>
              {destText}
            </Text>
          </View>
          <Text style={s.date}>
            {new Date(trip.departureAt).toLocaleDateString('sq-AL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {trip.routeDistanceM != null && trip.routeDurationS != null && (
            <Text style={s.routeMeta}>
              {trip.tripType === 'INTRACITY' ? '🏙️ Brenda qytetit' : '🛣️ Mes qyteteve'} ·{' '}
              {formatDistanceKm(trip.routeDistanceM)} · {formatDurationMin(trip.routeDurationS)}
            </Text>
          )}
          {trip.genderRestriction && trip.genderRestriction !== 'ANY' && (
            <Text style={s.routeMeta}>
              {trip.genderRestriction === 'FEMALE_ONLY' ? '♀ Vetëm femra' : '♂ Vetëm meshkuj'}
            </Text>
          )}
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Çmimi</Text>
            <Text style={s.statValue}>
              {Number(trip.pricePerSeat).toFixed(0)}
              <Text style={s.statUnit}>L</Text>
            </Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Vende</Text>
            <Text style={s.statValue}>
              {trip.seatsAvailable}/{trip.totalSeats}
            </Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Status</Text>
            <Text style={[s.statValue, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {trip.notes && (
          <Card style={s.card}>
            <Text style={s.cardLabel}>Shënime</Text>
            <Text style={s.notes}>{trip.notes}</Text>
          </Card>
        )}

        {isLive ? (
          <View style={[s.cardFlush, { overflow: 'hidden' }]}>
            <LiveTripMap
              tripId={trip.id}
              token={token!}
              origin={{ lat: originLat!, lng: originLng!, name: originText }}
              destination={{ lat: destLat!, lng: destLng!, name: destText }}
              onTripEnded={load}
            />
          </View>
        ) : originLat != null && originLng != null && destLat != null && destLng != null ? (
          <View style={[s.cardFlush, { overflow: 'hidden' }]}>
            <MapView
              style={s.routeMap}
              initialRegion={{
                latitude: (originLat + destLat) / 2,
                longitude: (originLng + destLng) / 2,
                latitudeDelta: Math.abs(originLat - destLat) * 2 + 0.05,
                longitudeDelta: Math.abs(originLng - destLng) * 2 + 0.05,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{ latitude: originLat, longitude: originLng }}
                title={originText}
                pinColor={colors.success}
              />
              <Marker
                coordinate={{ latitude: destLat, longitude: destLng }}
                title={destText}
                pinColor={colors.primary}
              />
              {pickup && (
                <Marker
                  coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                  title={`Marrja: ${pickup.label}`}
                  pinColor={colors.warning}
                />
              )}
              {dropoff && (
                <Marker
                  coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}
                  title={`Lëshimi: ${dropoff.label}`}
                  pinColor={colors.warning}
                />
              )}
              <Polyline
                coordinates={
                  routeCoords.length >= 2
                    ? routeCoords
                    : [
                        { latitude: originLat, longitude: originLng },
                        { latitude: destLat, longitude: destLng },
                      ]
                }
                strokeColor={colors.primary}
                strokeWidth={4}
              />
            </MapView>
          </View>
        ) : null}

        {pickup && dropoff && (
          <Card style={s.card}>
            <Text style={s.cardLabel}>Marrja dhe lëshimi</Text>
            <View style={s.pickupRow}>
              <View style={[s.pickupDot, { backgroundColor: colors.warning }]} />
              <Text style={s.pickupLabel} numberOfLines={2}>
                {pickup.label}
              </Text>
            </View>
            <View style={s.pickupRow}>
              <View style={[s.pickupDot, { borderColor: colors.warning, backgroundColor: 'transparent', borderWidth: 2 }]} />
              <Text style={s.pickupLabel} numberOfLines={2}>
                {dropoff.label}
              </Text>
            </View>
          </Card>
        )}

        {dp?.carPhotoUrl && (
          <View style={[s.cardFlush, { overflow: 'hidden' }]}>
            <Image source={{ uri: dp.carPhotoUrl }} style={s.carPhoto} />
          </View>
        )}

        <Card style={s.card}>
          <Text style={s.cardLabel}>Shoferi</Text>
          <View style={s.driverRow}>
            <View style={s.driverAvatar}>
              {trip.driver.avatarUrl ? (
                <Image source={{ uri: trip.driver.avatarUrl }} style={s.driverAvatarImg} />
              ) : (
                <Text style={s.driverAvatarText}>
                  {trip.driver.firstName[0]}
                  {trip.driver.lastName[0]}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.driverName}>
                {trip.driver.firstName} {trip.driver.lastName}
              </Text>
              {dp && (
                <>
                  <Text style={s.driverMeta}>
                    ⭐ {dp.rating.toFixed(1)} · {dp.totalTrips} udhëtime
                  </Text>
                  <Text style={s.driverMeta}>
                    🚘 {dp.carModel} · {dp.carColor} · {dp.carPlate}
                  </Text>
                </>
              )}
            </View>
          </View>
          {token && !isOwnTrip && (
            <View style={{ marginTop: 14 }}>
              <PrimaryButton
                label="Kontakto shoferin"
                icon="💬"
                onPress={() =>
                  router.push({
                    pathname: '/chat/[tripId]/[userId]',
                    params: { tripId: trip.id, userId: trip.driver.id },
                  })
                }
                variant="outline"
              />
            </View>
          )}
          {token && !isOwnTrip && (
            <View style={s.profileActions}>
              <TouchableOpacity
                onPress={async () => {
                  if (!token) return;
                  const ok = await dialog.confirm(
                    `Bllokoni ${trip.driver.firstName} ${trip.driver.lastName}?`,
                    'Nuk do të merrni më mesazhe prej tij. Mund ta zhblloko nga profili.',
                    'Bllokoj',
                    true,
                  );
                  if (!ok) return;
                  try {
                    await blocksApi.create(trip.driver.id, token);
                    await dialog.alert('U bllokua', 'Përdoruesi u bllokua.');
                  } catch (e: any) {
                    await dialog.alert('Gabim', e.message);
                  }
                }}
              >
                <Text style={s.reportLinkText}>🚫 Bllokoj</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReport(true)}>
                <Text style={s.reportLinkText}>⚠️ Raporto shoferin</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {!isOwnTrip && trip.status === 'SCHEDULED' && trip.seatsAvailable > 0 && (
          <View style={{ marginHorizontal: 16, marginTop: 18 }}>
            <PrimaryButton label="Rezervo vendin" icon="🎫" onPress={book} loading={booking} />
          </View>
        )}

        {trip.seatsAvailable === 0 && (
          <View style={s.fullBanner}>
            <Text style={s.fullBannerText}>Ky udhëtim është plotësisht i zënë</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalLabel}>Raporto shoferin</Text>
            <Text style={s.modalSub}>Shpjego arsyen (min. 10 karaktere)</Text>
            <TextInput
              style={s.reasonInput}
              placeholder="P.sh. sjellje e papërshtatshme, mashtrim..."
              placeholderTextColor={colors.subtle}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={s.modalBtns}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  label="Anulo"
                  onPress={() => {
                    setShowReport(false);
                    setReportReason('');
                  }}
                  variant="ghost"
                />
              </View>
              <View style={{ flex: 2 }}>
                <PrimaryButton label="Dërgo raportin" onPress={submitReport} loading={reporting} />
              </View>
            </View>
          </View>
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
  route: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, flexWrap: 'wrap' },
  city: { ...typography.h2, fontSize: 22, lineHeight: 26, flex: 1 },
  arrow: { ...typography.h2, color: colors.primary, marginHorizontal: 8 },
  date: { ...typography.caption, marginTop: 6, color: colors.textDim },
  routeMeta: { ...typography.caption, marginTop: 4, color: colors.textDim },

  statGrid: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'flex-start',
  },
  statLabel: {
    ...typography.caption,
    color: colors.subtle,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { ...typography.h2, marginTop: 4 },
  statUnit: { fontSize: 13, color: colors.textDim, fontWeight: '700' },

  card: { marginHorizontal: 16, marginTop: 14 },
  cardFlush: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardLabel: { ...typography.label, marginBottom: 10 },
  notes: { ...typography.body, color: colors.textDim },

  routeMap: { height: 180, width: '100%' },
  carPhoto: { width: '100%', height: 200, backgroundColor: colors.surfaceElevated },

  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  driverAvatarImg: { width: '100%', height: '100%' },
  driverAvatarText: { fontSize: 18, fontWeight: '900', color: colors.text },
  driverName: { ...typography.h3 },
  driverMeta: { ...typography.caption, marginTop: 4, color: colors.textDim },

  reportLink: { marginTop: 14, alignItems: 'flex-end' },
  reportLinkText: { color: colors.subtle, fontSize: 12 },
  profileActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },

  fullBanner: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  fullBannerText: { color: colors.danger, fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalLabel: { ...typography.label },
  modalSub: { ...typography.caption, marginTop: 4, marginBottom: 14 },
  reasonInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 100,
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },

  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  pickupDot: { width: 10, height: 10, borderRadius: 5 },
  pickupLabel: { ...typography.body, flex: 1 },
});
