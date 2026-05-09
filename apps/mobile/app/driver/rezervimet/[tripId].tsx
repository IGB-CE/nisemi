import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { colors, gradient } from '../../../lib/colors';
import { ErrorScreen, EmptyState } from '../../../components/States';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Në pritje', color: colors.warning },
  ACCEPTED: { label: 'Pranuar', color: colors.success },
  REJECTED: { label: 'Refuzuar', color: colors.danger },
  CANCELLED: { label: 'Anuluar', color: colors.subtle },
};

export default function TripReservations() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { token } = useAuth();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<any>(`/api/v1/trips/${tripId}`, token ?? undefined)
      .then(setTrip)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tripId, token]);

  useEffect(load, [load]);

  const action = async (reservationId: string, act: 'accept' | 'reject') => {
    try {
      await api.patch(`/api/v1/reservations/${reservationId}/${act}`, {}, token ?? undefined);
      load();
    } catch (e: any) { Alert.alert('Gabim', e.message); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!trip) return <ErrorScreen message="Ky udhëtim nuk u gjet." />;

  const reservations = trip.reservations ?? [];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={gradient.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
        <View style={s.route}>
          <Text style={s.city}>{trip.originCity.name}</Text>
          <Text style={s.arrow}>→</Text>
          <Text style={s.city}>{trip.destCity.name}</Text>
        </View>
        <Text style={s.date}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        <Text style={s.seats}>💺 {trip.seatsAvailable}/{trip.totalSeats} vende të lira</Text>
      </LinearGradient>

      <Text style={s.sectionTitle}>Rezervimet ({reservations.length})</Text>

      {reservations.length === 0 ? (
        <EmptyState icon="👥" title="Nuk ka rezervime ende" subtitle="Pasagjerët do të shfaqen këtu sapo të rezervojnë." />
      ) : reservations.map((r: any) => {
        const st = statusMap[r.status] ?? { label: r.status, color: colors.subtle };
        return (
          <View key={r.id} style={s.card}>
            <View style={s.passengerRow}>
              <View style={s.avatar}><Text style={s.avatarText}>{r.passenger.firstName[0]}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.passengerName}>{r.passenger.firstName} {r.passenger.lastName}</Text>
                <Text style={s.passengerSeats}>Kërkon {r.seats} vend{r.seats > 1 ? 'e' : ''}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: st.color + '22' }]}>
                <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            {r.status === 'PENDING' && (
              <View style={s.actions}>
                <TouchableOpacity style={s.acceptBtn} onPress={() => action(r.id, 'accept')}>
                  <Text style={s.acceptText}>✓ Prano</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.rejectBtn} onPress={() => action(r.id, 'reject')}>
                  <Text style={s.rejectText}>✕ Refuzo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60 },
  back: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  city: { fontSize: 22, fontWeight: '800', color: '#fff' },
  arrow: { marginHorizontal: 8, color: 'rgba(255,255,255,0.5)', fontSize: 20 },
  date: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 2 },
  seats: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, margin: 16, marginBottom: 8 },
  card: { margin: 16, marginTop: 0, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  passengerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  passengerSeats: { color: colors.subtle, fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  acceptBtn: { flex: 1, backgroundColor: colors.success, borderRadius: 10, padding: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, padding: 12, alignItems: 'center' },
  rejectText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
