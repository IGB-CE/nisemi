import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io, type Socket } from 'socket.io-client';
import { BASE } from '../lib/api';
import { useColors, useThemedStyles, type Theme } from '../lib/theme';

interface Position {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  ts: number;
}

interface Props {
  tripId: string;
  token: string;
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  onTripEnded?: () => void;
}

const STALE_MS = 15_000;

export default function LiveTripMap({ tripId, token, origin, destination, onTripEnded }: Props) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [position, setPosition] = useState<Position | null>(null);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const [, setNow] = useState(0);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    const socket: Socket = io(BASE, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinTrip', tripId, (res: { ok: boolean; error?: string }) => {
        if (!res.ok) console.log('[live-map] joinTrip failed', res.error);
      });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('location', (loc: Position) => {
      setPosition(loc);
      lastTickRef.current = Date.now();
      setStale(false);
    });
    socket.on('trip:ended', () => {
      onTripEnded?.();
    });

    return () => {
      socket.disconnect();
    };
  }, [tripId, token, onTripEnded]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      if (lastTickRef.current && Date.now() - lastTickRef.current > STALE_MS) {
        setStale(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = lastTickRef.current ? Math.floor((Date.now() - lastTickRef.current) / 1000) : null;

  return (
    <View style={s.wrap}>
      <MapView
        style={s.map}
        initialRegion={{
          latitude: (origin.lat + destination.lat) / 2,
          longitude: (origin.lng + destination.lng) / 2,
          latitudeDelta: Math.abs(origin.lat - destination.lat) * 2 + 0.5,
          longitudeDelta: Math.abs(origin.lng - destination.lng) * 2 + 0.5,
        }}
      >
        <Marker
          coordinate={{ latitude: origin.lat, longitude: origin.lng }}
          title={origin.name}
          pinColor={colors.success}
        />
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title={destination.name}
          pinColor={colors.primary}
        />
        <Polyline
          coordinates={[
            { latitude: origin.lat, longitude: origin.lng },
            { latitude: destination.lat, longitude: destination.lng },
          ]}
          strokeColor={colors.primary}
          strokeWidth={3}
        />
        {position && (
          <Marker
            coordinate={{ latitude: position.lat, longitude: position.lng }}
            title="Shoferi"
            opacity={stale ? 0.4 : 1}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[s.driverMarker, stale && s.driverMarkerStale]}>
              <Text style={s.driverEmoji}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapView>
      <View style={s.caption}>
        {!connected ? (
          <Text style={s.captionStale}>Pa lidhje</Text>
        ) : !position ? (
          <Text style={s.captionDim}>Duke pritur vendndodhjen e shoferit…</Text>
        ) : stale ? (
          <Text style={s.captionStale}>Pa lidhje — vendndodhja e fundit para {elapsed}s</Text>
        ) : (
          <View style={s.captionRow}>
            <View style={s.liveDot} />
            <Text style={s.captionText}>Përditësuar para {elapsed}s</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  wrap: { width: '100%' },
  map: { height: 220, width: '100%' },
  driverMarker: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarkerStale: { opacity: 0.5 },
  driverEmoji: { fontSize: 16 },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated,
  },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  captionText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  captionDim: { ...typography.caption, color: colors.textDim },
  captionStale: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
});
