import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { colors, typography } from '../../lib/colors';
import { ErrorScreen, EmptyState } from '../../components/States';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { showRewardedAd } from '../../lib/ads';

export default function Shofer() {
  const { token } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boostingId, setBoostingId] = useState<string | null>(null);

  const boostTrip = useCallback(
    async (tripId: string) => {
      const ok = await dialog.confirm(
        'Promovo udhëtimin',
        'Shiko një reklamë të shkurtër për ta vendosur udhëtimin tuaj në krye të kërkimeve për 12 orë.',
        'Vazhdo',
      );
      if (!ok) return;
      setBoostingId(tripId);
      try {
        const earned = await showRewardedAd();
        if (!earned) {
          await dialog.alert('Reklama nuk u përfundua', 'Udhëtimi nuk u promovua. Provo përsëri më vonë.');
          return;
        }
        await api.post(`/api/v1/trips/${tripId}/boost`, {}, token ?? undefined);
        await dialog.alert('U promovua', 'Udhëtimi do të shfaqet në krye të kërkimeve për 12 orë.');
        const updated = await api.get<any[]>('/api/v1/trips/my', token ?? undefined);
        setTrips(updated);
      } catch (e: any) {
        await dialog.alert('Gabim', e.message);
      } finally {
        setBoostingId(null);
      }
    },
    [dialog, token],
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<any[]>('/api/v1/trips/my', token ?? undefined)
      .then(setTrips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  const now = Date.now();
  const upcoming = trips.filter((t) => new Date(t.departureAt).getTime() > now && t.status === 'SCHEDULED');
  const totalEarnings = trips.reduce((sum, t) => {
    const accepted = (t.reservations ?? []).filter((r: any) => r.status === 'ACCEPTED');
    return sum + accepted.reduce((s: number, r: any) => s + r.seats * Number(t.pricePerSeat), 0);
  }, 0);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Paneli i Shoferit</Text>
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Totale</Text>
            <Text style={s.statValue}>{trips.length}</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Të ardhshme</Text>
            <Text style={s.statValue}>{upcoming.length}</Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Të ardhura</Text>
            <Text style={s.statValue}>{totalEarnings > 0 ? `${totalEarnings.toFixed(0)}L` : '—'}</Text>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <PrimaryButton label="Publiko udhëtim" icon="+" onPress={() => router.push('/driver/publiko')} />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Udhëtimet e mia</Text>
          <Text style={s.sectionMeta}>{trips.length} totale</Text>
        </View>

        {trips.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon="🚗"
              title="Nuk keni udhëtime të publikuara"
              subtitle="Shtypni butonin sipër për të publikuar udhëtimin tuaj të parë."
            />
          </View>
        ) : (
          trips.map((trip) => {
            const pendingCount = (trip.reservations ?? []).filter((r: any) => r.status === 'PENDING').length;
            const statusColor =
              trip.status === 'SCHEDULED'
                ? colors.success
                : trip.status === 'CANCELLED'
                  ? colors.danger
                  : colors.subtle;
            const isBoosted = trip.boostedUntil && new Date(trip.boostedUntil).getTime() > now;
            const isUpcoming = new Date(trip.departureAt).getTime() > now && trip.status === 'SCHEDULED';
            const canBoost = isUpcoming && !isBoosted;
            return (
              <TouchableOpacity
                key={trip.id}
                style={[s.card, isBoosted && s.cardBoosted]}
                onPress={() => router.push(`/driver/rezervimet/${trip.id}` as any)}
                activeOpacity={0.85}
              >
                {isBoosted && (
                  <View style={s.boostPill}>
                    <Text style={s.boostPillText}>
                      ⚡ Promovuar deri{' '}
                      {new Date(trip.boostedUntil).toLocaleTimeString('sq-AL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
                <View style={s.cardTop}>
                  <View style={s.routeDots}>
                    <View style={s.dotPrimary} />
                    <View style={s.dotLine} />
                    <View style={s.dotEnd} />
                  </View>
                  <View style={s.routeBody}>
                    <Text style={s.city} numberOfLines={1}>{trip.originLabel ?? trip.originCity?.name ?? '?'}</Text>
                    <Text style={s.cityDest} numberOfLines={1}>{trip.destLabel ?? trip.destCity?.name ?? '?'}</Text>
                  </View>
                  <View style={s.priceWrap}>
                    <Text style={s.price}>
                      {Number(trip.pricePerSeat).toFixed(0)}
                      <Text style={s.priceUnit}>L</Text>
                    </Text>
                    {pendingCount > 0 && (
                      <View style={s.pendingBadge}>
                        <Text style={s.pendingBadgeText}>{pendingCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={s.metaRow}>
                  <Text style={s.metaItem}>
                    📅{' '}
                    {new Date(trip.departureAt).toLocaleDateString('sq-AL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaItem}>
                    💺 {trip.seatsAvailable}/{trip.totalSeats}
                  </Text>
                  <Text style={s.metaDot}>·</Text>
                  <Text style={s.metaItem}>📋 {trip.reservations?.length ?? 0}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                </View>
                {canBoost && (
                  <TouchableOpacity
                    style={s.boostButton}
                    disabled={boostingId === trip.id}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      boostTrip(trip.id);
                    }}
                  >
                    <Text style={s.boostButtonText}>
                      {boostingId === trip.id ? 'Po ngarkohet…' : '⚡ Promovo udhëtimin 12h'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },

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

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: { ...typography.h2 },
  sectionMeta: { ...typography.caption, color: colors.textDim },

  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDots: { alignItems: 'center', width: 12 },
  dotPrimary: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotLine: { width: 2, height: 26, backgroundColor: colors.borderStrong, marginVertical: 2 },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  routeBody: { flex: 1, justifyContent: 'space-between', height: 50 },
  city: { ...typography.h3, fontSize: 16 },
  cityDest: { ...typography.h3, fontSize: 16, color: colors.textDim },

  priceWrap: { alignItems: 'flex-end', gap: 4 },
  price: { ...typography.h2, color: colors.primary, fontSize: 22 },
  priceUnit: { fontSize: 13, color: colors.textDim, fontWeight: '700' },
  pendingBadge: {
    backgroundColor: colors.warning,
    borderRadius: 999,
    paddingHorizontal: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  pendingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: { ...typography.caption, color: colors.textDim, fontSize: 12 },
  metaDot: { color: colors.subtle, fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  cardBoosted: { borderColor: colors.primary },
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
});
