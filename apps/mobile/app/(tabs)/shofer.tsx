import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { ErrorScreen, EmptyState } from '../../components/States';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Icon from '../../components/ui/Icon';
import { showRewardedAd } from '../../lib/ads';

export default function Shofer() {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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

  const cancelTrip = useCallback(
    async (tripId: string) => {
      const ok = await dialog.confirm(
        'Anulo udhëtimin?',
        'Pasagjerët me rezervime do të njoftohen. Ky veprim nuk mund të zhbëhet.',
        'Po, anulo',
        true,
      );
      if (!ok) return;
      try {
        await api.patch(`/api/v1/trips/${tripId}/cancel`, {}, token ?? undefined);
        load();
      } catch (e: any) {
        await dialog.alert('Gabim', e.message);
      }
    },
    [dialog, token, load],
  );

  const deleteTrip = useCallback(
    async (tripId: string) => {
      const ok = await dialog.confirm('Fshi udhëtimin?', 'Udhëtimi do të fshihet përfundimisht.', 'Fshi', true);
      if (!ok) return;
      try {
        await api.delete(`/api/v1/trips/${tripId}`, token ?? undefined);
        load();
      } catch (e: any) {
        await dialog.alert('Gabim', e.message);
      }
    },
    [dialog, token, load],
  );

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  const now = Date.now();
  const isActive = (t: any) =>
    t.status === 'IN_PROGRESS' || (new Date(t.departureAt).getTime() > now && t.status === 'SCHEDULED');
  const upcoming = trips.filter((t) => new Date(t.departureAt).getTime() > now && t.status === 'SCHEDULED');
  const active = trips.filter(isActive);
  const history = trips.filter((t) => !isActive(t));

  const renderTrip = (trip: any, past = false) => {
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
    const reservationCount = trip.reservations?.length ?? 0;
    const canModify = isUpcoming && reservationCount === 0;
    const canCancel = isUpcoming && reservationCount > 0;
    return (
      <TouchableOpacity
        key={trip.id}
        style={[s.card, isBoosted && s.cardBoosted, past && s.cardPast]}
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
            <Icon name="calendar" size={12} color={colors.subtle} />{' '}
            {new Date(trip.departureAt).toLocaleDateString('sq-AL', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaItem}>
            <Icon name="seats" size={12} color={colors.subtle} /> {trip.seatsAvailable}/{trip.totalSeats}
          </Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaItem}>
            <Icon name="list" size={12} color={colors.subtle} /> {trip.reservations?.length ?? 0}
          </Text>
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
        {(canModify || canCancel) && (
          <View style={s.tripActions}>
            {canModify && (
              <TouchableOpacity
                style={s.tripActionBtn}
                onPress={(e) => {
                  e.stopPropagation?.();
                  router.push(`/driver/publiko?editId=${trip.id}` as any);
                }}
              >
                <Text style={s.tripActionText}>Modifiko</Text>
              </TouchableOpacity>
            )}
            {canModify && (
              <TouchableOpacity
                style={[s.tripActionBtn, s.tripActionDanger]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  deleteTrip(trip.id);
                }}
              >
                <Text style={[s.tripActionText, s.tripActionDangerText]}>Fshi</Text>
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[s.tripActionBtn, s.tripActionDanger]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  cancelTrip(trip.id);
                }}
              >
                <Text style={[s.tripActionText, s.tripActionDangerText]}>Anulo udhëtimin</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Të ardhshme</Text>
            <Text style={s.statValue}>{upcoming.length}</Text>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 14 }}>
          <PrimaryButton label="Publiko udhëtim" icon="plus" onPress={() => router.push('/driver/publiko')} />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Udhëtimet e mia</Text>
          <Text style={s.sectionMeta}>{active.length} aktive</Text>
        </View>

        {active.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon="car"
              title={trips.length === 0 ? 'Nuk keni udhëtime të publikuara' : 'Nuk keni udhëtime të ardhshme'}
              subtitle={
                trips.length === 0
                  ? 'Shtypni butonin sipër për të publikuar udhëtimin tuaj të parë.'
                  : 'Udhëtimet e kaluara i gjeni te historiku më poshtë.'
              }
            />
          </View>
        ) : (
          active.map((trip) => renderTrip(trip))
        )}

        {history.length > 0 && (
          <>
            <TouchableOpacity style={s.historyToggle} onPress={() => setShowHistory((v) => !v)} activeOpacity={0.7}>
              <Text style={s.historyToggleText}>
                {showHistory ? 'Fshih historikun' : `Shfaq historikun (${history.length})`}
              </Text>
              <Text style={s.historyToggleIcon}>{showHistory ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showHistory && history.map((trip) => renderTrip(trip, true))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
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
  cardPast: { opacity: 0.6 },

  tripActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tripActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripActionText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  tripActionDanger: { borderColor: colors.danger },
  tripActionDangerText: { color: colors.danger },

  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  historyToggleText: { ...typography.label, color: colors.textDim },
  historyToggleIcon: { color: colors.textDim, fontSize: 11 },

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
