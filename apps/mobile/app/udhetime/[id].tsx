import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get<any>(`/api/v1/trips/${id}`).then(setTrip).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

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
  if (!trip) return <View style={s.center}><Text>Udhëtimi nuk u gjet</Text></View>;

  const isOwnTrip = trip.driver.id === user?.id;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>← Kthehu</Text>
        </TouchableOpacity>
        <View style={s.route}>
          <Text style={s.city}>{trip.originCity.name}</Text>
          <Text style={s.arrow}>→</Text>
          <Text style={s.city}>{trip.destCity.name}</Text>
        </View>
        <Text style={s.date}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Detajet e udhëtimit</Text>
        <Row label="Çmimi" value={`${Number(trip.pricePerSeat).toFixed(0)} € / vend`} />
        <Row label="Vende të lira" value={`${trip.seatsAvailable} nga ${trip.totalSeats}`} />
        {trip.notes && <Row label="Shënime" value={trip.notes} />}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Shoferi</Text>
        <View style={s.driverRow}>
          <View style={s.driverAvatar}><Text style={s.driverAvatarText}>{trip.driver.firstName[0]}</Text></View>
          <View>
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
      </View>

      {!isOwnTrip && trip.status === 'SCHEDULED' && trip.seatsAvailable > 0 && (
        <TouchableOpacity style={[s.bookBtn, booking && { opacity: 0.6 }]} onPress={book} disabled={booking}>
          <Text style={s.bookBtnText}>{booking ? 'Duke rezervuar...' : '🎫 Rezervo vendin'}</Text>
        </TouchableOpacity>
      )}

      {trip.seatsAvailable === 0 && (
        <View style={s.fullBanner}><Text style={s.fullBannerText}>Ky udhëtim është plotësisht i zënë</Text></View>
      )}
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
  header: { backgroundColor: colors.primary, padding: 24, paddingTop: 60 },
  back: { marginBottom: 12 },
  backText: { color: '#BFDBFE', fontSize: 14 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 24, fontWeight: '800', color: '#fff' },
  arrow: { marginHorizontal: 10, color: '#BFDBFE', fontSize: 22 },
  date: { color: '#BFDBFE', fontSize: 13 },
  card: { margin: 16, marginBottom: 0, backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.subtle, fontSize: 14 },
  rowValue: { color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  driverAvatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  driverName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
  driverMeta: { color: colors.subtle, fontSize: 13, marginTop: 2 },
  bookBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  fullBanner: { margin: 16, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, alignItems: 'center' },
  fullBannerText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
