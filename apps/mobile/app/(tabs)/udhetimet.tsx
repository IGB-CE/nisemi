import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { ErrorScreen, EmptyState } from '../../components/States';
import VerifiedBadge from '../../components/VerifiedBadge';
import { formatDistanceKm, formatDurationMin } from '../../lib/directions';

interface Trip {
  id: string;
  originCity?: { name: string } | null;
  destCity?: { name: string } | null;
  originLabel?: string | null;
  destLabel?: string | null;
  departureAt: string;
  createdAt: string;
  pricePerSeat: string;
  seatsAvailable: number;
  totalSeats: number;
  routeDistanceM?: number | null;
  routeDurationS?: number | null;
  tripType?: 'INTERCITY' | 'INTRACITY' | null;
  genderRestriction?: 'ANY' | 'FEMALE_ONLY' | 'MALE_ONLY';
  boostedUntil?: string | null;
  driver?: { driverProfile?: { verificationStatus?: string } | null } | null;
}

type SortKey = 'time' | 'newest' | 'price' | 'seats';
type TypeFilter = 'ANY' | 'INTERCITY' | 'INTRACITY';
type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK';
type GenderFilter = 'ANY' | 'FEMALE_ONLY' | 'MALE_ONLY';

const SORT_LABELS: Record<SortKey, string> = {
  time: 'Ora e nisjes',
  newest: 'Më të rejat',
  price: 'Çmimi',
  seats: 'Vendet',
};

const TYPE_LABELS: Record<TypeFilter, string> = {
  ANY: 'Të gjitha',
  INTERCITY: 'Mes qyteteve',
  INTRACITY: 'Brenda qytetit',
};

const DATE_LABELS: Record<DateFilter, string> = {
  ALL: 'Të gjitha',
  TODAY: 'Sot',
  TOMORROW: 'Nesër',
  WEEK: 'Këtë javë',
};

const GENDER_LABELS: Record<GenderFilter, string> = {
  ANY: 'Të gjitha',
  FEMALE_ONLY: 'Vetëm femra',
  MALE_ONLY: 'Vetëm meshkuj',
};

function tripOriginText(t: Trip): string {
  return t.originLabel ?? t.originCity?.name ?? '?';
}
function tripDestText(t: Trip): string {
  return t.destLabel ?? t.destCity?.name ?? '?';
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function matchesDateFilter(departureAt: string, filter: DateFilter): boolean {
  if (filter === 'ALL') return true;
  const dep = new Date(departureAt);
  const now = new Date();
  if (filter === 'TODAY') return isSameDay(dep, now);
  if (filter === 'TOMORROW') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(dep, tomorrow);
  }
  // WEEK — within the next 7 days
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return dep >= now && dep <= weekEnd;
}

export default function Udhetimet() {
  const { token } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortAsc, setSortAsc] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ANY');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ANY');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Trip[]>('/api/v1/trips', token ?? undefined)
      .then(setTrips)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  const visible = useMemo(() => {
    const now = Date.now();
    const filtered = trips.filter((t) => {
      if (onlyAvailable && t.seatsAvailable <= 0) return false;
      if (typeFilter !== 'ANY' && t.tripType !== typeFilter) return false;
      if (genderFilter !== 'ANY' && (t.genderRestriction ?? 'ANY') !== genderFilter) return false;
      if (!matchesDateFilter(t.departureAt, dateFilter)) return false;
      return true;
    });

    const dir = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'price':
          return dir * (Number(a.pricePerSeat) - Number(b.pricePerSeat));
        case 'seats':
          return dir * (a.seatsAvailable - b.seatsAvailable);
        case 'newest':
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case 'time':
        default:
          return dir * (new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime());
      }
    });
  }, [trips, onlyAvailable, typeFilter, genderFilter, dateFilter, sortKey, sortAsc]);

  const openTrip = (trip: Trip) => {
    router.push({ pathname: '/udhetime/[id]', params: { id: trip.id } });
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Udhëtimet</Text>
        </View>

        {/* Sort */}
        <Text style={[s.fieldLabel, { marginHorizontal: 24, marginTop: 18 }]}>Rendit sipas</Text>
        <View style={s.sortRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <TouchableOpacity
                key={k}
                style={[s.chip, sortKey === k && s.chipActive]}
                onPress={() => setSortKey(k)}
              >
                <Text style={[s.chipText, sortKey === k && s.chipTextActive]}>{SORT_LABELS[k]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={s.dirBtn} onPress={() => setSortAsc((v) => !v)}>
            <Text style={s.dirBtnText}>{sortAsc ? '↑' : '↓'}</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <Text style={[s.fieldLabel, { marginHorizontal: 24, marginTop: 18 }]}>Vendet</Text>
        <View style={s.chipWrap}>
          <TouchableOpacity
            style={[s.chip, onlyAvailable && s.chipActive]}
            onPress={() => setOnlyAvailable((v) => !v)}
          >
            <Text style={[s.chipText, onlyAvailable && s.chipTextActive]}>Vetëm me vende të lira</Text>
          </TouchableOpacity>
        </View>

        <Text style={[s.fieldLabel, { marginHorizontal: 24, marginTop: 18 }]}>Lloji</Text>
        <View style={s.chipWrap}>
          {(Object.keys(TYPE_LABELS) as TypeFilter[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.chip, typeFilter === t && s.chipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[s.chipText, typeFilter === t && s.chipTextActive]}>{TYPE_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.fieldLabel, { marginHorizontal: 24, marginTop: 18 }]}>Data</Text>
        <View style={s.chipWrap}>
          {(Object.keys(DATE_LABELS) as DateFilter[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[s.chip, dateFilter === d && s.chipActive]}
              onPress={() => setDateFilter(d)}
            >
              <Text style={[s.chipText, dateFilter === d && s.chipTextActive]}>{DATE_LABELS[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[s.fieldLabel, { marginHorizontal: 24, marginTop: 18 }]}>Gjinia</Text>
        <View style={s.chipWrap}>
          {(Object.keys(GENDER_LABELS) as GenderFilter[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[s.chip, genderFilter === g && s.chipActive]}
              onPress={() => setGenderFilter(g)}
            >
              <Text style={[s.chipText, genderFilter === g && s.chipTextActive]}>{GENDER_LABELS[g]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Programi</Text>
          <Text style={s.sectionMeta}>{visible.length} udhëtime</Text>
        </View>

        {visible.length === 0 ? (
          <View style={{ marginTop: 12 }}>
            <EmptyState
              icon="🚗"
              title="Nuk u gjetën udhëtime"
              subtitle="Provo të heqësh disa filtra."
            />
          </View>
        ) : (
          visible.map((trip) => {
            const boosted = trip.boostedUntil != null && new Date(trip.boostedUntil).getTime() > Date.now();
            const gender = trip.genderRestriction ?? 'ANY';
            return (
              <TouchableOpacity key={trip.id} style={s.tripCard} onPress={() => openTrip(trip)} activeOpacity={0.85}>
                <View style={s.tripLeft}>
                  <View style={s.routeDots}>
                    <View style={s.dotPrimary} />
                    <View style={s.dotLine} />
                    <View style={s.dotEnd} />
                  </View>
                  <View style={s.tripRoute}>
                    <Text style={s.tripCity} numberOfLines={1}>
                      {tripOriginText(trip)}
                    </Text>
                    <Text style={s.tripCityDest} numberOfLines={1}>
                      {tripDestText(trip)}
                    </Text>
                    <View style={s.badgeRow}>
                      {trip.driver?.driverProfile?.verificationStatus === 'APPROVED' && (
                        <VerifiedBadge size={13} label="Shofer i verifikuar" />
                      )}
                      {boosted && (
                        <View style={[s.badge, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}>
                          <Text style={[s.badgeText, { color: colors.primary }]}>Promovuar</Text>
                        </View>
                      )}
                      {gender !== 'ANY' && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{GENDER_LABELS[gender]}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={s.tripRight}>
                  <Text style={s.tripPrice}>
                    {Number(trip.pricePerSeat).toFixed(0)}
                    <Text style={s.tripPriceUnit}>L</Text>
                  </Text>
                  <Text style={s.tripTime}>
                    {new Date(trip.departureAt).toLocaleDateString('sq-AL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={s.tripSeats}>
                    💺 {trip.seatsAvailable}/{trip.totalSeats}
                    {trip.routeDistanceM != null && trip.routeDurationS != null
                      ? ` · ${formatDistanceKm(trip.routeDistanceM)} · ${formatDurationMin(trip.routeDurationS)}`
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
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

    fieldLabel: { ...typography.label, marginBottom: 8 },

    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
    dirBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dirBtnText: { fontSize: 18, color: colors.text, fontWeight: '700' },

    chipWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16 },
    chip: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.text, fontWeight: '600' },
    chipTextActive: { color: '#fff' },

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

    tripCard: {
      marginHorizontal: 16,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tripLeft: { flexDirection: 'row', flex: 1, alignItems: 'center', gap: 12 },
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
    tripRoute: { flex: 1, justifyContent: 'space-between' },
    tripCity: { ...typography.h3, fontSize: 16 },
    tripCityDest: { ...typography.h3, fontSize: 16, color: colors.textDim },
    badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, color: colors.textDim },

    tripRight: { alignItems: 'flex-end', maxWidth: '40%' },
    tripPrice: { ...typography.h2, color: colors.primary, fontSize: 22 },
    tripPriceUnit: { fontSize: 13, color: colors.textDim, fontWeight: '700' },
    tripTime: { ...typography.caption, marginTop: 2, color: colors.textDim },
    tripSeats: { ...typography.caption, marginTop: 2, fontSize: 11, textAlign: 'right' },
  });
