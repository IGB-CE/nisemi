import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Në pritje', color: colors.warning },
  ACCEPTED: { label: 'Pranuar', color: colors.success },
  REJECTED: { label: 'Refuzuar', color: colors.danger },
  CANCELLED: { label: 'Anuluar', color: colors.subtle },
};

export default function Rezervimet() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get<any[]>('/api/v1/reservations/my', token ?? undefined)
      .then(setReservations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]));

  const cancel = async (id: string) => {
    Alert.alert('Konfirmo', 'Dëshiron të anulosh këtë rezervim?', [
      { text: 'Jo' },
      { text: 'Po, anulo', style: 'destructive', onPress: async () => {
        try {
          await api.patch(`/api/v1/reservations/${id}/cancel`, {}, token ?? undefined);
          setReservations(r => r.map(x => x.id === id ? { ...x, status: 'CANCELLED' } : x));
        } catch (e: any) { Alert.alert('Gabim', e.message); }
      }},
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.headerTitle}>Rezervimet e mia</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {reservations.length === 0 ? (
          <Text style={s.empty}>Nuk keni rezervime</Text>
        ) : reservations.map(r => {
          const st = statusMap[r.status] ?? { label: r.status, color: colors.subtle };
          return (
            <View key={r.id} style={s.card}>
              <TouchableOpacity onPress={() => router.push(`/udhetime/${r.trip.id}`)}>
                <View style={s.route}>
                  <Text style={s.city}>{r.trip.originCity.name}</Text>
                  <Text style={s.arrow}>→</Text>
                  <Text style={s.city}>{r.trip.destCity.name}</Text>
                </View>
                <Text style={s.date}>{new Date(r.trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={s.driver}>Shofer: {r.trip.driver.firstName} {r.trip.driver.lastName}</Text>
                <Text style={s.seats}>Vende: {r.seats}</Text>
              </TouchableOpacity>
              <View style={s.footer}>
                <View style={[s.badge, { backgroundColor: st.color + '22' }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                {['PENDING', 'ACCEPTED'].includes(r.status) && (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => cancel(r.id)}>
                    <Text style={s.cancelText}>Anulo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: colors.primary, padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  empty: { textAlign: 'center', color: colors.subtle, marginTop: 60, fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: 8, color: colors.primary, fontSize: 16 },
  date: { color: colors.subtle, fontSize: 13, marginBottom: 4 },
  driver: { color: colors.subtle, fontSize: 13, marginBottom: 4 },
  seats: { color: colors.subtle, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.danger, borderRadius: 20 },
  cancelText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
});
