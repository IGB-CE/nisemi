import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { colors } from '../../lib/colors';
import { useAuth } from '../../lib/auth';
import { EmptyState } from '../../components/States';
import GradientHeader from '../../components/GradientHeader';
import CityMapPicker, { type City } from '../../components/CityMapPicker';

interface Trip {
  id: string;
  originCity: City;
  destCity: City;
  departureAt: string;
  pricePerSeat: string;
  seatsAvailable: number;
  driver: { firstName: string; lastName: string; driverProfile: { rating: number } | null };
}

export default function Search() {
  const { token } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo] = useState<City | null>(null);
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState(false);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  useEffect(() => {
    api.get<City[]>('/api/v1/cities').then(setCities).catch(() => setCitiesError(true));
  }, []);

  const search = async () => {
    setLoading(true);
    setSearched(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from.id);
      if (to) params.set('to', to.id);
      if (date) params.set('date', date);
      const data = await api.get<Trip[]>(`/api/v1/trips?${params}`, token ?? undefined);
      setTrips(data);
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <CityMapPicker visible={showFrom} cities={cities} onSelect={setFrom} onClose={() => setShowFrom(false)} title="Zgjidhni qytetin e nisjes" />
      <CityMapPicker visible={showTo} cities={cities} onSelect={setTo} onClose={() => setShowTo(false)} title="Zgjidhni destinacionin" />

      <GradientHeader>
        <Text style={s.headerTitle}>Ikim</Text>
        <Text style={s.headerSub}>Gjej udhëtimin tënd</Text>
      </GradientHeader>

      {citiesError && (
        <View style={s.citiesError}>
          <Text style={s.citiesErrorText}>⚠️ Nuk u ngarkuan qytetet. Kontrollo lidhjen.</Text>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.fieldLabel}>Nga</Text>
        <TouchableOpacity style={s.picker} onPress={() => setShowFrom(true)}>
          <Text style={from ? s.pickerValue : s.pickerPlaceholder}>{from?.name ?? 'Zgjidhni qytetin e nisjes'}</Text>
        </TouchableOpacity>

        <Text style={s.fieldLabel}>Deri</Text>
        <TouchableOpacity style={s.picker} onPress={() => setShowTo(true)}>
          <Text style={to ? s.pickerValue : s.pickerPlaceholder}>{to?.name ?? 'Zgjidhni qytetin e destinacionit'}</Text>
        </TouchableOpacity>

        <Text style={s.fieldLabel}>Data (opsionale)</Text>
        <TextInput style={s.input} placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} placeholderTextColor={colors.subtle} />

        <TouchableOpacity style={s.btn} onPress={search}>
          <Text style={s.btnText}>🔍  Kërko udhëtime</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />}

      {searched && !loading && (
        <ScrollView style={s.results} contentContainerStyle={{ paddingBottom: 20 }}>
          {searchError ? (
            <EmptyState icon="⚠️" title="Kërkimi dështoi" subtitle={searchError} />
          ) : trips.length === 0 ? (
            <EmptyState icon="🔍" title="Nuk u gjetën udhëtime" subtitle="Provo me data ose qytete të ndryshme." />
          ) : (
            trips.map(trip => (
              <TouchableOpacity key={trip.id} style={s.tripCard} onPress={() => router.push(`/udhetime/${trip.id}`)}>
                <View style={s.tripRoute}>
                  <Text style={s.tripCity}>{trip.originCity.name}</Text>
                  <Text style={s.arrow}>→</Text>
                  <Text style={s.tripCity}>{trip.destCity.name}</Text>
                </View>
                <View style={s.tripMeta}>
                  <Text style={s.tripDate}>{new Date(trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={s.tripPrice}>{Number(trip.pricePerSeat).toFixed(0)} €</Text>
                </View>
                <View style={s.tripFooter}>
                  <Text style={s.tripDriver}>👤 {trip.driver.firstName} {trip.driver.lastName}</Text>
                  {trip.driver.driverProfile && <Text style={s.tripRating}>⭐ {trip.driver.driverProfile.rating.toFixed(1)}</Text>}
                  <Text style={s.tripSeats}>💺 {trip.seatsAvailable} vende</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  citiesError: { marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 10, padding: 12 },
  citiesErrorText: { color: colors.warning, fontSize: 13, textAlign: 'center' },
  card: { margin: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  fieldLabel: { fontSize: 12, color: colors.subtle, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  picker: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  pickerValue: { color: colors.text, fontSize: 15 },
  pickerPlaceholder: { color: colors.subtle, fontSize: 15 },
  input: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  results: { flex: 1, paddingHorizontal: 16 },
  tripCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  tripRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tripCity: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: 8, color: colors.primary, fontSize: 18 },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tripDate: { color: colors.subtle, fontSize: 13 },
  tripPrice: { color: colors.primary, fontSize: 17, fontWeight: '700' },
  tripFooter: { flexDirection: 'row', gap: 12 },
  tripDriver: { color: colors.subtle, fontSize: 13 },
  tripRating: { color: colors.subtle, fontSize: 13 },
  tripSeats: { color: colors.subtle, fontSize: 13 },
});
