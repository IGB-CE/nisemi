import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { rideAlerts, type RideAlert, type BrowsedRequest } from '../../lib/ride-alerts';
import { ErrorScreen, EmptyState } from '../../components/States';
import Card from '../../components/ui/Card';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Icon from '../../components/ui/Icon';

function formatDate(iso: string | null): string {
  if (!iso) return 'Çdo datë';
  return new Date(iso).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
}

function formatPrice(price: string | null): string | null {
  if (price == null) return null;
  const n = Number(price);
  if (Number.isNaN(n)) return null;
  return `${n.toLocaleString('sq-AL')} L`;
}

export default function Kerkesat() {
  const { token, user } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const isDriver = user?.role === 'DRIVER' || user?.role === 'ADMIN';

  const [feed, setFeed] = useState<BrowsedRequest[]>([]);
  const [mine, setMine] = useState<RideAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const req = isDriver ? rideAlerts.browse({}, token) : rideAlerts.list(token);
    req
      .then((data) => {
        if (isDriver) setFeed(data as BrowsedRequest[]);
        else setMine(data as RideAlert[]);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, isDriver]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Kërkesat</Text>
          <Text style={s.subtitle}>
            {isDriver
              ? 'Pasagjerë që kërkojnë një udhëtim'
              : 'Publiko udhëtimin që kërkon dhe prit shoferët'}
          </Text>
        </View>

        {!isDriver && (
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <PrimaryButton
              label="Publiko një kërkesë"
              icon="plus"
              onPress={() => router.push('/njoftimet' as any)}
            />
          </View>
        )}

        {isDriver ? (
          feed.length === 0 ? (
            <View style={{ marginTop: 30 }}>
              <EmptyState
                icon="bell"
                title="Asnjë kërkesë aktive"
                subtitle="Kur një pasagjer publikon një kërkesë në rrugën tuaj, do ta shihni këtu."
              />
            </View>
          ) : (
            feed.map((r) => {
              const price = formatPrice(r.pricePerSeat);
              const initials = `${r.passenger.firstName?.[0] ?? ''}${r.passenger.lastName?.[0] ?? ''}`;
              return (
                <Card key={r.id} style={s.card}>
                  <View style={s.cardHead}>
                    <View style={s.avatar}>
                      {r.passenger.avatarUrl ? (
                        <Image source={{ uri: r.passenger.avatarUrl }} style={s.avatarImg} />
                      ) : (
                        <Text style={s.avatarText}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.passengerName} numberOfLines={1}>
                        {r.passenger.firstName} {r.passenger.lastName}
                      </Text>
                      <Text style={s.meta}>
                        <Icon name="calendar" size={12} color={colors.subtle} /> {formatDate(r.date)} ·{' '}
                        <Icon name="seats" size={12} color={colors.subtle} /> {r.seats}
                      </Text>
                    </View>
                    {price && (
                      <View style={s.pricePill}>
                        <Text style={s.priceText}>{price}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.route} numberOfLines={1}>
                    {r.originLabel}
                  </Text>
                  <Text style={s.arrow}>↓</Text>
                  <Text style={s.route} numberOfLines={1}>
                    {r.destLabel}
                  </Text>

                  {r.note ? <Text style={s.note}>{r.note}</Text> : null}

                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton
                      label="Kontakto pasagjerin"
                      icon="chat"
                      onPress={() =>
                        router.push({
                          pathname: '/chat/kerkesa/[requestId]/[userId]',
                          params: { requestId: r.id, userId: r.passenger.id },
                        } as any)
                      }
                    />
                  </View>
                </Card>
              );
            })
          )
        ) : mine.length === 0 ? (
          <View style={{ marginTop: 30 }}>
            <EmptyState
              icon="bell"
              title="Nuk keni kërkesa aktive"
              subtitle="Publiko një kërkesë dhe shoferët në atë rrugë do të njoftohen."
            />
          </View>
        ) : (
          mine.map((r) => {
            const price = formatPrice(r.pricePerSeat);
            const expired = new Date(r.expiresAt).getTime() < Date.now();
            return (
              <TouchableOpacity key={r.id} onPress={() => router.push('/njoftimet' as any)} activeOpacity={0.85}>
                <Card style={s.card}>
                  <View style={s.cardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.route} numberOfLines={1}>
                        {r.originLabel}
                      </Text>
                      <Text style={s.arrow}>↓</Text>
                      <Text style={s.route} numberOfLines={1}>
                        {r.destLabel}
                      </Text>
                    </View>
                    {price && (
                      <View style={s.pricePill}>
                        <Text style={s.priceText}>{price}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.meta}>
                    <Icon name="calendar" size={12} color={colors.subtle} /> {formatDate(r.date)} ·{' '}
                    <Icon name="seats" size={12} color={colors.subtle} /> {r.seats}
                  </Text>
                  <Text style={s.status}>
                    {expired
                      ? 'Skadoi'
                      : !r.active
                        ? 'Joaktive'
                        : r.visibleToDrivers
                          ? 'E dukshme për shoferët'
                          : 'E fshehur nga shoferët'}
                  </Text>
                </Card>
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
    subtitle: { ...typography.bodyDim, marginTop: 6 },

    card: { marginHorizontal: 16, marginTop: 12 },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },

    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: { width: 40, height: 40 },
    avatarText: { ...typography.body, fontWeight: '700', color: colors.textDim },

    passengerName: { ...typography.body, fontWeight: '700' },
    route: { ...typography.body, fontWeight: '600' },
    arrow: { ...typography.caption, color: colors.subtle, marginVertical: 2 },
    meta: { ...typography.caption, marginTop: 4 },
    note: { ...typography.caption, marginTop: 8, color: colors.textDim, fontStyle: 'italic' },
    status: { ...typography.caption, marginTop: 6, color: colors.subtle, fontSize: 11 },

    pricePill: {
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.primary + '18',
      borderWidth: 1,
      borderColor: colors.primary + '55',
    },
    priceText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  });
