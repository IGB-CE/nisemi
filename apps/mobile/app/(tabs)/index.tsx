import { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { EmptyState } from '../../components/States';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';
import PlacesAutocomplete from '../../components/PlacesAutocomplete';
import VerifiedBadge from '../../components/VerifiedBadge';
import Icon from '../../components/ui/Icon';
import type { PlaceDetail } from '../../lib/places';
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
  driver?: { driverProfile?: { rating?: number; verificationStatus?: string } | null } | null;
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

const RADIUS_OPTIONS = [
  { value: 100, label: '100 m' },
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km' },
  { value: 2000, label: '2 km' },
];

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

export default function Search() {
  const { token } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  const [from, setFrom] = useState<PlaceDetail | null>(null);
  const [to, setTo] = useState<PlaceDetail | null>(null);
  const [searchRadiusM, setSearchRadiusM] = useState(500);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Filters (all live inside the filter sheet)
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortAsc, setSortAsc] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ANY');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('ANY');

  const loadAll = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Trip[]>('/api/v1/trips', token ?? undefined)
      .then((d) => {
        setTrips(d);
        setSearched(false);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(loadAll);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from && to) {
        params.set('originLat', String(from.lat));
        params.set('originLng', String(from.lng));
        params.set('destLat', String(to.lat));
        params.set('destLng', String(to.lng));
        params.set('searchRadiusM', String(searchRadiusM));
      }
      const data = await api.get<Trip[]>(`/api/v1/trips?${params}`, token ?? undefined);
      setTrips(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const activeFilterCount =
    (onlyAvailable ? 1 : 0) +
    (typeFilter !== 'ANY' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (genderFilter !== 'ANY' ? 1 : 0);

  const resetFilters = () => {
    setOnlyAvailable(false);
    setTypeFilter('ANY');
    setDateFilter('ALL');
    setGenderFilter('ANY');
    setSortKey('time');
    setSortAsc(true);
  };

  const visible = useMemo(() => {
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
    const params: Record<string, string> = {};
    if (from) {
      params.pickupLat = String(from.lat);
      params.pickupLng = String(from.lng);
      params.pickupLabel = from.label;
    }
    if (to) {
      params.dropoffLat = String(to.lat);
      params.dropoffLng = String(to.lng);
      params.dropoffLabel = to.label;
    }
    router.push({ pathname: '/udhetime/[id]', params: { id: trip.id, ...params } });
  };

  const tripsToday = trips.filter((t) => isSameDay(new Date(t.departureAt), new Date())).length;
  const lowestPrice = trips.length ? Math.min(...trips.map((t) => Number(t.pricePerSeat))) : 0;

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Udhëtimet</Text>
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Sot</Text>
            <Text style={s.statValue}>{tripsToday}</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Aktive</Text>
            <Text style={s.statValue}>{trips.length}</Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Nga</Text>
            <Text style={s.statValue}>{lowestPrice > 0 ? `${lowestPrice}L` : '—'}</Text>
          </View>
        </View>

        {/* Compact search */}
        <Card style={s.searchCard}>
          <PlacesAutocomplete
            value={from}
            onChange={setFrom}
            placeholder="Nga"
            token={token ?? undefined}
            showCurrentLocation
          />
          <View style={{ height: 8 }} />
          <PlacesAutocomplete
            value={to}
            onChange={setTo}
            placeholder="Deri"
            token={token ?? undefined}
          />
          <View style={s.searchActions}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Kërko" icon="search" onPress={search} loading={loading} />
            </View>
            <TouchableOpacity style={s.filterBtn} onPress={() => setFilterOpen(true)} activeOpacity={0.85}>
              <Icon name="filter" size={16} color={colors.text} />
              <Text style={s.filterBtnText}>Filtro</Text>
              {activeFilterCount > 0 && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Card>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{searched ? 'Rezultatet' : 'Programi'}</Text>
          <Text style={s.sectionMeta}>{visible.length} udhëtime</Text>
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

        {!loading && visible.length === 0 && (
          <View style={{ marginTop: 12 }}>
            <EmptyState
              icon={searched ? 'search' : 'car'}
              title={error ? 'Kërkimi dështoi' : searched ? 'Nuk u gjetën udhëtime' : 'Nuk ka udhëtime aktive'}
              subtitle={
                error ??
                (searched ? 'Provo me adresë, rreze ose filtra të tjerë.' : 'Provo të heqësh disa filtra.')
              }
            />
            {searched && !error && from && to && token && (
              <View style={{ marginHorizontal: 16, marginTop: 10 }}>
                <PrimaryButton
                  label="Më njofto kur publikohet"
                  icon="bell"
                  onPress={() => {
                    const qp: Record<string, string> = {
                      originLat: String(from.lat),
                      originLng: String(from.lng),
                      originLabel: from.label,
                      destLat: String(to.lat),
                      destLng: String(to.lng),
                      destLabel: to.label,
                      searchRadiusM: String(searchRadiusM),
                    };
                    router.push({ pathname: '/njoftimet' as any, params: qp });
                  }}
                  variant="outline"
                />
              </View>
            )}
          </View>
        )}

        {!loading &&
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
                    <Icon name="seats" size={11} color={colors.subtle} /> {trip.seatsAvailable}/{trip.totalSeats}
                    {trip.routeDistanceM != null && trip.routeDurationS != null
                      ? ` · ${formatDistanceKm(trip.routeDistanceM)} · ${formatDurationMin(trip.routeDurationS)}`
                      : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Filter sheet */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filtro</Text>
              <TouchableOpacity onPress={resetFilters} hitSlop={8}>
                <Text style={s.sheetReset}>Pastro</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Rendit sipas</Text>
              <View style={s.sortRow}>
                <View style={s.chipWrap}>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                    <TouchableOpacity
                      key={k}
                      style={[s.chip, sortKey === k && s.chipActive]}
                      onPress={() => setSortKey(k)}
                    >
                      <Text style={[s.chipText, sortKey === k && s.chipTextActive]}>{SORT_LABELS[k]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={s.dirBtn} onPress={() => setSortAsc((v) => !v)}>
                  <Icon name={sortAsc ? 'arrowUp' : 'arrowDown'} size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>Vendet</Text>
              <View style={s.chipWrap}>
                <TouchableOpacity
                  style={[s.chip, onlyAvailable && s.chipActive]}
                  onPress={() => setOnlyAvailable((v) => !v)}
                >
                  <Text style={[s.chipText, onlyAvailable && s.chipTextActive]}>Vetëm me vende të lira</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>Lloji</Text>
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

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>Data</Text>
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

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>Gjinia</Text>
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

              {from && to && (
                <>
                  <Text style={[s.fieldLabel, { marginTop: 18 }]}>Sa larg pranoj të eci?</Text>
                  <View style={s.chipWrap}>
                    {RADIUS_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.chip, searchRadiusM === opt.value && s.chipActive]}
                        onPress={() => setSearchRadiusM(opt.value)}
                      >
                        <Text style={[s.chipText, searchRadiusM === opt.value && s.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <PrimaryButton label={`Shfaq ${visible.length} udhëtime`} onPress={() => setFilterOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

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

    searchCard: { marginHorizontal: 16, marginTop: 14 },
    searchActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    filterBtnText: { fontSize: 14, color: colors.text, fontWeight: '700' },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

    fieldLabel: { ...typography.label, marginBottom: 8 },

    sortRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
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

    chipWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
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
      marginTop: 24,
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

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 20,
      paddingTop: 16,
      maxHeight: '85%',
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sheetTitle: { ...typography.h2 },
    sheetReset: { ...typography.label, color: colors.primary },
    sheetScroll: { flexGrow: 0 },
  });
