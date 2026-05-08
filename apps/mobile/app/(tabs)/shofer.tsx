import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function Shofer() {
  const { token, user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get<any[]>('/api/v1/trips/my', token ?? undefined)
      .then(setTrips)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]));

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Paneli i Shoferit</Text>
        <TouchableOpacity style={s.publishBtn} onPress={() => router.push('/driver/publiko')}>
          <Text style={s.publishBtnText}>+ Publiko udhëtim</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {trips.length === 0 ? (
          <Text style={s.empty}>Nuk keni udhëtime të publikuara</Text>
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
              <Text style={s.metaText}>💰 {Number(trip.pricePerSeat).toFixed(0)} €/vend</Text>
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
  header: { backgroundColor: colors.primary, padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  publishBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  publishBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: colors.subtle, marginTop: 60, fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: 8, color: colors.primary, fontSize: 16 },
  date: { color: colors.subtle, fontSize: 13, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaText: { color: colors.subtle, fontSize: 13 },
});
