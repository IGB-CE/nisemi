import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useDialog } from '../../../lib/dialog';
import { colors, typography } from '../../../lib/colors';
import { ErrorScreen, EmptyState } from '../../../components/States';
import PrimaryButton from '../../../components/ui/PrimaryButton';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Në pritje', color: colors.warning },
  ACCEPTED: { label: 'Pranuar', color: colors.success },
  REJECTED: { label: 'Refuzuar', color: colors.danger },
  CANCELLED: { label: 'Anuluar', color: colors.subtle },
};

export default function TripReservations() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { token } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
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
    } catch (e: any) { await dialog.alert('Gabim', e.message); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;
  if (!trip) return <ErrorScreen message="Ky udhëtim nuk u gjet." />;

  const reservations = trip.reservations ?? [];
  const pending = reservations.filter((r: any) => r.status === 'PENDING').length;
  const accepted = reservations.filter((r: any) => r.status === 'ACCEPTED').length;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>IKIM</Text>
          <View style={s.route}>
            <Text style={s.city}>{trip.originCity.name}</Text>
            <Text style={s.arrow}>→</Text>
            <Text style={s.city}>{trip.destCity.name}</Text>
          </View>
          <Text style={s.date}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Totale</Text>
            <Text style={s.statValue}>{reservations.length}</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Në pritje</Text>
            <Text style={[s.statValue, pending > 0 && { color: colors.warning }]}>{pending}</Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Të lira</Text>
            <Text style={s.statValue}>{trip.seatsAvailable}/{trip.totalSeats}</Text>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Pasagjerët</Text>
          <Text style={s.sectionMeta}>{accepted} të konfirmuar</Text>
        </View>

        {reservations.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState icon="👥" title="Nuk ka rezervime ende" subtitle="Pasagjerët do të shfaqen këtu sapo të rezervojnë." />
          </View>
        ) : reservations.map((r: any) => {
          const st = statusMap[r.status] ?? { label: r.status, color: colors.subtle };
          return (
            <View key={r.id} style={s.card}>
              <View style={s.passengerRow}>
                <View style={s.avatar}>
                  {r.passenger.avatarUrl ? (
                    <Image source={{ uri: r.passenger.avatarUrl }} style={s.avatarImg} />
                  ) : (
                    <Text style={s.avatarText}>{r.passenger.firstName[0]}{r.passenger.lastName[0]}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.passengerName}>{r.passenger.firstName} {r.passenger.lastName}</Text>
                  <Text style={s.passengerSeats}>💺 {r.seats} vend{r.seats > 1 ? 'e' : ''}</Text>
                </View>
                <View style={[s.statusPill, { borderColor: st.color, backgroundColor: st.color + '15' }]}>
                  <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={s.actionRow}>
                {r.status === 'PENDING' && (
                  <>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="✓ Prano" onPress={() => action(r.id, 'accept')} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="✕ Refuzo" onPress={() => action(r.id, 'reject')} variant="outline" />
                    </View>
                  </>
                )}
                {r.status === 'ACCEPTED' && (
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Kontakto"
                      icon="💬"
                      onPress={() => router.push({ pathname: '/chat/[tripId]/[userId]', params: { tripId: trip.id, userId: r.passenger.id } })}
                      variant="outline"
                    />
                  </View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  back: { marginBottom: 8 },
  backText: { color: colors.textDim, fontSize: 14 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  route: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, flexWrap: 'wrap' },
  city: { ...typography.h1, fontSize: 26 },
  arrow: { ...typography.h2, color: colors.primary, marginHorizontal: 10 },
  date: { ...typography.caption, marginTop: 6 },

  statGrid: { flexDirection: 'row', marginTop: 20, marginHorizontal: 16, paddingVertical: 16, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  statCell: { flex: 1, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: colors.border, alignItems: 'flex-start' },
  statLabel: { ...typography.caption, color: colors.subtle, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { ...typography.h2, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 24, marginTop: 28, marginBottom: 12 },
  sectionTitle: { ...typography.h2 },
  sectionMeta: { ...typography.caption, color: colors.textDim },

  card: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 16, fontWeight: '800', color: colors.text },
  passengerName: { ...typography.h3, fontSize: 15 },
  passengerSeats: { ...typography.caption, marginTop: 2 },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
});
