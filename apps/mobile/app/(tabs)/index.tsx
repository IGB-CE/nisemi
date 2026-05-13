import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { colors, typography } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import { EmptyState } from '../../components/States';
import CityMapPicker, { type City } from '../../components/CityMapPicker';
import DateTimeField from '../../components/DateTimeField';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';

interface Trip {
  id: string;
  originCity: City;
  destCity: City;
  departureAt: string;
  pricePerSeat: string;
  seatsAvailable: number;
  totalSeats: number;
  driver: { firstName: string; lastName: string; driverProfile: { rating: number } | null };
}

export default function Search() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo] = useState<City | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    api
      .get<City[]>('/api/v1/cities')
      .then(setCities)
      .catch(() => setCitiesError(true));
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
      if (from) params.set('from', from.id);
      if (to) params.set('to', to.id);
      if (date) params.set('date', date.toISOString().split('T')[0]);
      const data = await api.get<Trip[]>(`/api/v1/trips?${params}`, token ?? undefined);
      setTrips(data);
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tripsToday = allTrips.filter(
    (t) => new Date(t.departureAt).toDateString() === new Date().toDateString(),
  ).length;
  const lowestPrice = allTrips.length ? Math.min(...allTrips.map((t) => Number(t.pricePerSeat))) : 0;

  return (
    <View style={s.container}>
      <CityMapPicker
        visible={showFrom}
        cities={cities}
        onSelect={setFrom}
        onClose={() => setShowFrom(false)}
        title="Qyteti i nisjes"
      />
      <CityMapPicker
        visible={showTo}
        cities={cities}
        onSelect={setTo}
        onClose={() => setShowTo(false)}
        title="Destinacioni"
      />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>IKIM</Text>
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

        {citiesError && (
          <View style={s.warn}>
            <Text style={s.warnText}>⚠️ Nuk u ngarkuan qytetet. Kontrollo lidhjen.</Text>
          </View>
        )}

        <Card style={s.filterCard}>
          <Text style={s.cardLabel}>Filtro</Text>
          <View style={{ marginTop: 14 }}>
            <Text style={s.fieldLabel}>Nga</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowFrom(true)}>
              <Text style={from ? s.pickerValue : s.pickerPlaceholder}>{from?.name ?? 'Zgjidh qytetin e nisjes'}</Text>
              <Text style={s.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Deri</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowTo(true)}>
              <Text style={to ? s.pickerValue : s.pickerPlaceholder}>{to?.name ?? 'Zgjidh destinacionin'}</Text>
              <Text style={s.pickerArrow}>›</Text>
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Data</Text>
            <DateTimeField value={date} onChange={setDate} placeholder="Zgjidh datën (opsionale)" />
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
              subtitle={searchError ?? (searched ? 'Provo me data ose qytete të ndryshme.' : 'Provo më vonë.')}
            />
          </View>
        )}

        {!loading &&
          (searched ? trips : allTrips.slice(0, 8)).map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={s.tripCard}
              onPress={() => router.push(`/udhetime/${trip.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={s.tripLeft}>
                <View style={s.routeDots}>
                  <View style={s.dotPrimary} />
                  <View style={s.dotLine} />
                  <View style={s.dotEnd} />
                </View>
                <View style={s.tripRoute}>
                  <Text style={s.tripCity}>{trip.originCity.name}</Text>
                  <Text style={s.tripCityDest}>{trip.destCity.name}</Text>
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
                </Text>
              </View>
            </TouchableOpacity>
          ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
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

  warn: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
  },
  warnText: { color: colors.warning, fontSize: 13 },

  filterCard: { marginHorizontal: 16, marginTop: 14 },
  cardLabel: { ...typography.label },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 12 },
  picker: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pickerPlaceholder: { color: colors.subtle, fontSize: 15 },
  pickerArrow: { color: colors.subtle, fontSize: 22, fontWeight: '300' },

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

  tripRight: { alignItems: 'flex-end' },
  tripPrice: { ...typography.h2, color: colors.primary, fontSize: 22 },
  tripPriceUnit: { fontSize: 13, color: colors.textDim, fontWeight: '700' },
  tripTime: { ...typography.caption, marginTop: 2, color: colors.textDim },
  tripSeats: { ...typography.caption, marginTop: 2, fontSize: 11 },
});
