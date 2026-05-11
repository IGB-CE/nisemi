import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { ErrorScreen, EmptyState } from '../../components/States';
import GradientHeader from '../../components/GradientHeader';

export default function Shofer() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<any[]>('/api/v1/trips/my', token ?? undefined)
      .then(setTrips)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <View style={s.container}>
      <GradientHeader style={s.header}>
        <Text style={s.headerTitle}>Paneli i Shoferit</Text>
        <TouchableOpacity style={s.publishBtn} onPress={() => router.push('/driver/publiko')}>
          <Text style={s.publishBtnText}>+ Publiko udhëtim</Text>
        </TouchableOpacity>
      </GradientHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {trips.length === 0 ? (
          <EmptyState icon="🚗" title="Nuk keni udhëtime të publikuara" subtitle="Shtypni butonin lart për të publikuar udhëtimin tuaj të parë." />
        ) : trips.map(trip => (
          <TouchableOpacity key={trip.id} style={s.card} onPress={() => router.push(`/driver/rezervimet/${trip.id}`)}>
            <View style={s.route}>
              <Text style={s.city}>{trip.originCity.name}</Text>
              <Text style={s.arrow}>→</Text>
              <Text style={s.city}>{trip.destCity.name}</Text>
            </View>
            <Text style={s.date}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            <View style={s.meta}>
              <Text style={s.metaText}>💺 {trip.seatsAvailable}/{trip.totalSeats} vende</Text>
              <Text style={s.metaText}>💰 {Number(trip.pricePerSeat).toFixed(0)} L/vend</Text>
              <Text style={s.metaText}>📋 {trip.reservations?.length ?? 0} rezervime</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  publishBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  publishBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: 8, color: colors.primary, fontSize: 16 },
  date: { color: colors.subtle, fontSize: 13, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { color: colors.subtle, fontSize: 13 },
});
