import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { colors, typography } from '../lib/colors';
import { formatDistanceKm, formatDurationMin, type RouteAlt } from '../lib/directions';

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
  routes: RouteAlt[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

interface DecodedRoute {
  coords: { latitude: number; longitude: number }[];
  distanceM: number;
  durationS: number;
  summary: string;
}

export default function RoutePicker({ origin, dest, routes, selectedIndex, onSelect }: Props) {
  const decoded: DecodedRoute[] = useMemo(
    () =>
      routes.map((r) => ({
        coords: polyline.decode(r.polyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng })),
        distanceM: r.distanceM,
        durationS: r.durationS,
        summary: r.summary,
      })),
    [routes],
  );

  const region = useMemo(() => {
    const lats = [origin.lat, dest.lat, ...decoded.flatMap((r) => r.coords.map((c) => c.latitude))];
    const lngs = [origin.lng, dest.lng, ...decoded.flatMap((r) => r.coords.map((c) => c.longitude))];
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = Math.max((maxLat - minLat) * 0.2, 0.005);
    const padLng = Math.max((maxLng - minLng) * 0.2, 0.005);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: maxLat - minLat + padLat * 2,
      longitudeDelta: maxLng - minLng + padLng * 2,
    };
  }, [origin, dest, decoded]);

  return (
    <View style={s.wrap}>
      <View style={s.mapWrap}>
        <MapView provider={PROVIDER_GOOGLE} style={s.map} region={region}>
          {decoded.map((r, i) => (
            <Polyline
              key={i}
              coordinates={r.coords}
              strokeColor={i === selectedIndex ? colors.primary : colors.subtle}
              strokeWidth={i === selectedIndex ? 6 : 3}
              tappable
              onPress={() => onSelect(i)}
            />
          ))}
          <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} pinColor="green" />
          <Marker coordinate={{ latitude: dest.lat, longitude: dest.lng }} pinColor="red" />
        </MapView>
      </View>
      <View style={s.list}>
        {decoded.map((r, i) => (
          <TouchableOpacity
            key={i}
            style={[s.row, i === selectedIndex && s.rowActive]}
            onPress={() => onSelect(i)}
            activeOpacity={0.85}
          >
            <View style={[s.dot, i === selectedIndex && s.dotActive]} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, i === selectedIndex && s.rowTitleActive]} numberOfLines={1}>
                {r.summary || `Opsioni ${i + 1}`}
              </Text>
              <Text style={s.rowMeta}>
                {formatDistanceKm(r.distanceM)} · {formatDurationMin(r.durationS)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 12 },
  mapWrap: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  list: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.subtle,
  },
  dotActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  rowTitle: { ...typography.body, fontWeight: '600' },
  rowTitleActive: { color: colors.primary },
  rowMeta: { ...typography.caption, marginTop: 2 },
});
