import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { ErrorScreen } from '../../components/States';
import GradientHeader from '../../components/GradientHeader';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<any>(`/api/v1/trips/${id}`)
      .then(setTrip)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const book = async () => {
    if (!token) { router.push('/(auth)/login'); return; }
    setBooking(true);
    try {
      await api.post('/api/v1/reservations', { tripId: id, seats: 1 }, token);
      Alert.alert('Sukses! 🎉', 'Rezervimi u dërgua. Prit konfirmimin e shoferit.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/rezervimet') },
      ]);
    } catch (e: any) { Alert.alert('Gabim', e.message); }
    finally { setBooking(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!trip) return <ErrorScreen message="Ky udhëtim nuk u gjet." />;

  const isOwnTrip = trip.driver.id === user?.id;

  const submitReport = async () => {
    if (reportReason.trim().length < 10) {
      Alert.alert('Gabim', 'Arsyeja duhet të ketë të paktën 10 karaktere.'); return;
    }
    setReporting(true);
    try {
      await api.post('/api/v1/reports', { reportedId: trip.driver.id, reason: reportReason.trim() }, token ?? undefined);
      setShowReport(false);
      setReportReason('');
      Alert.alert('Faleminderit', 'Raporti u dërgua. Do ta shqyrtojmë sa më shpejt.');
    } catch (e: any) { Alert.alert('Gabim', e.message); }
    finally { setReporting(false); }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <GradientHeader>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Kthehu</Text>
        </TouchableOpacity>
        <View style={s.route}>
          <Text style={s.city}>{trip.originCity.name}</Text>
          <Text style={s.arrow}>→</Text>
          <Text style={s.city}>{trip.destCity.name}</Text>
        </View>
        <Text style={s.date}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
      </GradientHeader>

      <View style={s.card}>
        <Text style={s.cardTitle}>Detajet e udhëtimit</Text>
        <Row label="Çmimi" value={`${Number(trip.pricePerSeat).toFixed(0)} L / vend`} />
        <Row label="Vende të lira" value={`${trip.seatsAvailable} nga ${trip.totalSeats}`} />
        {trip.notes && <Row label="Shënime" value={trip.notes} />}
      </View>

      {trip.originCity.lat && trip.originCity.lng && trip.destCity.lat && trip.destCity.lng && (
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          <MapView
            style={s.routeMap}
            initialRegion={{
              latitude: (trip.originCity.lat + trip.destCity.lat) / 2,
              longitude: (trip.originCity.lng + trip.destCity.lng) / 2,
              latitudeDelta: Math.abs(trip.originCity.lat - trip.destCity.lat) * 2 + 0.5,
              longitudeDelta: Math.abs(trip.originCity.lng - trip.destCity.lng) * 2 + 0.5,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={{ latitude: trip.originCity.lat, longitude: trip.originCity.lng }} title={trip.originCity.name} pinColor={colors.success} />
            <Marker coordinate={{ latitude: trip.destCity.lat, longitude: trip.destCity.lng }} title={trip.destCity.name} pinColor={colors.primary} />
            <Polyline
              coordinates={[
                { latitude: trip.originCity.lat, longitude: trip.originCity.lng },
                { latitude: trip.destCity.lat, longitude: trip.destCity.lng },
              ]}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          </MapView>
          <View style={s.mapLabel}>
            <Text style={s.mapLabelText}>🟢 {trip.originCity.name}</Text>
            <Text style={s.mapLabelArrow}>→</Text>
            <Text style={s.mapLabelText}>📍 {trip.destCity.name}</Text>
          </View>
        </View>
      )}

      {trip.driver.driverProfile?.carPhotoUrl && (
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          <Image source={{ uri: trip.driver.driverProfile.carPhotoUrl }} style={s.carPhoto} />
        </View>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>Shoferi</Text>
        <View style={s.driverRow}>
          <View style={s.driverAvatar}><Text style={s.driverAvatarText}>{trip.driver.firstName[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>{trip.driver.firstName} {trip.driver.lastName}</Text>
            {trip.driver.driverProfile && (
              <>
                <Text style={s.driverMeta}>⭐ {trip.driver.driverProfile.rating.toFixed(1)} vlerësim</Text>
                <Text style={s.driverMeta}>🚘 {trip.driver.driverProfile.carModel} — {trip.driver.driverProfile.carColor}</Text>
                <Text style={s.driverMeta}>🔢 {trip.driver.driverProfile.carPlate}</Text>
              </>
            )}
          </View>
        </View>
        {token && !isOwnTrip && (
          <TouchableOpacity style={s.contactBtn} onPress={() => router.push({ pathname: '/chat/[tripId]/[userId]', params: { tripId: trip.id, userId: trip.driver.id } })}>
            <Text style={s.contactBtnText}>💬 Kontakto shoferin</Text>
          </TouchableOpacity>
        )}
        {token && !isOwnTrip && (
          <TouchableOpacity style={s.reportLink} onPress={() => setShowReport(true)}>
            <Text style={s.reportLinkText}>⚠️ Raporto shoferin</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isOwnTrip && trip.status === 'SCHEDULED' && trip.seatsAvailable > 0 && (
        <TouchableOpacity style={[s.bookBtn, booking && { opacity: 0.6 }]} onPress={book} disabled={booking}>
          <Text style={s.bookBtnText}>{booking ? 'Duke rezervuar...' : '🎫 Rezervo vendin'}</Text>
        </TouchableOpacity>
      )}

      {trip.seatsAvailable === 0 && (
        <View style={s.fullBanner}><Text style={s.fullBannerText}>Ky udhëtim është plotësisht i zënë</Text></View>
      )}

      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Raporto shoferin</Text>
            <Text style={s.modalSub}>Shpjego arsyen e raportit (min. 10 karaktere)</Text>
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
              <TouchableOpacity style={s.cancelModalBtn} onPress={() => { setShowReport(false); setReportReason(''); }}>
                <Text style={s.cancelModalText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, reporting && { opacity: 0.6 }]} onPress={submitReport} disabled={reporting}>
                <Text style={s.submitBtnText}>{reporting ? 'Duke dërguar...' : 'Dërgo raportin'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { marginBottom: 12 },
  backText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 24, fontWeight: '800', color: '#fff' },
  arrow: { marginHorizontal: 10, color: 'rgba(255,255,255,0.5)', fontSize: 22 },
  date: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  card: { margin: 16, marginBottom: 0, backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.subtle, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  driverName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  driverMeta: { color: colors.subtle, fontSize: 13, marginTop: 2 },
  routeMap: { height: 180, width: '100%' },
  carPhoto: { width: '100%', height: 200, backgroundColor: colors.surfaceElevated },
  mapLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  mapLabelText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  mapLabelArrow: { color: colors.primary, fontSize: 14 },
  bookBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  fullBanner: { margin: 16, backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.danger },
  fullBannerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  contactBtn: { marginTop: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  contactBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  reportLink: { marginTop: 12, alignItems: 'flex-end' },
  reportLinkText: { color: colors.subtle, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.subtle, marginBottom: 14 },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, minHeight: 100, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelModalBtn: { flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center' },
  cancelModalText: { color: colors.subtle, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, backgroundColor: colors.danger, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
