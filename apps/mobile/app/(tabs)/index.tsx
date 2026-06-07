import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { EmptyState } from '../../components/States';
import DateTimeField from '../../components/DateTimeField';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';
import PlacesAutocomplete from '../../components/PlacesAutocomplete';
import type { PlaceDetail } from '../../lib/places';
import { formatDistanceKm, formatDurationMin } from '../../lib/directions';

interface Trip {
  id: string;
  originCity?: { name: string } | null;
  destCity?: { name: string } | null;
  originLabel?: string | null;
  destLabel?: string | null;
  departureAt: string;
  pricePerSeat: string;
  seatsAvailable: number;
  totalSeats: number;
  routeDistanceM?: number | null;
  routeDurationS?: number | null;
  tripType?: 'INTERCITY' | 'INTRACITY' | null;
  driver: { firstName: string; lastName: string; driverProfile: { rating: number } | null };
}

type TripTypeFilter = 'ANY' | 'INTERCITY' | 'INTRACITY';

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

export default function Search() {
  const { token } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [from, setFrom] = useState<PlaceDetail | null>(null);
  const [to, setTo] = useState<PlaceDetail | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [tripTypeFilter, setTripTypeFilter] = useState<TripTypeFilter>('ANY');
  const [searchRadiusM, setSearchRadiusM] = useState(500);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Trip[]>('/api/v1/trips')
      .then(setAllTrips)
      .catch(() => {});
  }, []);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (from && to) {
        params.set('originLat', String(from.lat));
        params.set('originLng', String(from.lng));
        params.set('destLat', String(to.lat));
        params.set('destLng', String(to.lng));
        params.set('searchRadiusM', String(searchRadiusM));
      }
      if (tripTypeFilter !== 'ANY') params.set('tripType', tripTypeFilter);
      if (date) params.set('date', date.toISOString().split('T')[0]);
      const data = await api.get<Trip[]>(`/api/v1/trips?${params}`, token ?? undefined);
      setTrips(data);
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setLoading(false);
    }
  };

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

  const tripsToday = allTrips.filter((t) => new Date(t.departureAt).toDateString() === new Date().toDateString()).length;
  const lowestPrice = allTrips.length ? Math.min(...allTrips.map((t) => Number(t.pricePerSeat))) : 0;

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Kërko</Text>
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Sot</Text>
            <Text style={s.statValue}>{tripsToday}</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Aktive</Text>
            <Text style={s.statValue}>{allTrips.length}</Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Nga</Text>
            <Text style={s.statValue}>{lowestPrice > 0 ? `${lowestPrice}L` : '—'}</Text>
          </View>
        </View>

        <Card style={s.filterCard}>
          <Text style={s.cardLabel}>Filtro</Text>
          <View style={{ marginTop: 14 }}>
            <Text style={s.fieldLabel}>Nga</Text>
            <PlacesAutocomplete
              value={from}
              onChange={setFrom}
              placeholder="Adresa e nisjes"
              token={token ?? undefined}
              showCurrentLocation
            />

            <Text style={s.fieldLabel}>Deri</Text>
            <PlacesAutocomplete
              value={to}
              onChange={setTo}
              placeholder="Adresa e destinacionit"
              token={token ?? undefined}
            />

            <Text style={s.fieldLabel}>Data</Text>
            <DateTimeField value={date} onChange={setDate} placeholder="Zgjidh datën (opsionale)" />

            <Text style={s.fieldLabel}>Lloji</Text>
            <View style={s.typeRow}>
              {(['ANY', 'INTERCITY', 'INTRACITY'] as TripTypeFilter[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.typeBtn, tripTypeFilter === t && s.typeBtnActive]}
                  onPress={() => setTripTypeFilter(t)}
                >
                  <Text style={[s.typeBtnText, tripTypeFilter === t && s.typeBtnTextActive]}>
                    {t === 'ANY' ? 'Të gjitha' : t === 'INTERCITY' ? 'Mes qyteteve' : 'Brenda qytetit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {from && to && (
              <>
                <Text style={s.fieldLabel}>Sa larg pranoj të eci?</Text>
                <View style={s.radiusRow}>
                  {RADIUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.radiusBtn, searchRadiusM === opt.value && s.radiusBtnActive]}
                      onPress={() => setSearchRadiusM(opt.value)}
                    >
                      <Text
                        style={[s.radiusBtnText, searchRadiusM === opt.value && s.radiusBtnTextActive]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
          <View style={{ marginTop: 18 }}>
            <PrimaryButton label="Kërko udhëtime" icon="🔍" onPress={search} loading={loading} />
          </View>
        </Card>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{searched ? 'Rezultatet' : 'Programi'}</Text>
          <Text style={s.sectionMeta}>{searched ? `${trips.length} udhëtime` : `${allTrips.length} aktive`}</Text>
        </View>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

        {!loading && (searched ? trips : allTrips.slice(0, 8)).length === 0 && (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon={searched ? '🔍' : '🚗'}
              title={searchError ? 'Kërkimi dështoi' : searched ? 'Nuk u gjetën udhëtime' : 'Nuk ka udhëtime aktive'}
              subtitle={searchError ?? (searched ? 'Provo me adresë ose rreze tjetër.' : 'Provo më vonë.')}
            />
            {searched && !searchError && from && to && token && (
              <View style={{ marginHorizontal: 16, marginTop: 10 }}>
                <PrimaryButton
                  label="Më njofto kur publikohet"
                  icon="🔔"
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
                    if (date) qp.date = date.toISOString();
                    router.push({ pathname: '/njoftimet' as any, params: qp });
                  }}
                  variant="outline"
                />
              </View>
            )}
          </View>
        )}

        {!loading &&
          (searched ? trips : allTrips.slice(0, 8)).map((trip) => (
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
          ))}
      </ScrollView>
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

  filterCard: { marginHorizontal: 16, marginTop: 14 },
  cardLabel: { ...typography.label },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 14 },

  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  typeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },

  radiusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  radiusBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radiusBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusBtnText: { fontSize: 13, color: colors.text, fontWeight: '700' },
  radiusBtnTextActive: { color: '#fff' },

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
  tripRoute: { flex: 1, justifyContent: 'space-between', height: 50 },
  tripCity: { ...typography.h3, fontSize: 16 },
  tripCityDest: { ...typography.h3, fontSize: 16, color: colors.textDim },

  tripRight: { alignItems: 'flex-end', maxWidth: '40%' },
  tripPrice: { ...typography.h2, color: colors.primary, fontSize: 22 },
  tripPriceUnit: { fontSize: 13, color: colors.textDim, fontWeight: '700' },
  tripTime: { ...typography.caption, marginTop: 2, color: colors.textDim },
  tripSeats: { ...typography.caption, marginTop: 2, fontSize: 11, textAlign: 'right' },
});
