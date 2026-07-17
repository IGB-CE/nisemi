import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useUnread } from '../../lib/unread';
import { useDialog } from '../../lib/dialog';
import { ErrorScreen, EmptyState } from '../../components/States';
import AdminBadge from '../../components/AdminBadge';

interface Conversation {
  tripId: string;
  trip: {
    id: string;
    originCity?: { name: string } | null;
    destCity?: { name: string } | null;
    originLabel?: string | null;
    destLabel?: string | null;
    departureAt: string;
  };
  otherUser: { id: string; firstName: string; lastName: string; avatarUrl: string | null; role?: string };
  lastMessage: { content: string; createdAt: string; fromMe: boolean };
  unread: number;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
}

export default function Mesazhet() {
  const { token } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { refresh: refreshUnread } = useUnread();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<Conversation[]>('/api/v1/messages/conversations', token ?? undefined)
      .then(setConversations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshUnread();
    }, [load, refreshUnread]),
  );

  const deleteConversation = async (c: Conversation) => {
    const name = `${c.otherUser.firstName} ${c.otherUser.lastName}`;
    const ok = await dialog.confirm(
      'Fshini bisedën?',
      `Biseda me ${name} do të fshihet vetëm për ju. Nëse ${c.otherUser.firstName} ju shkruan përsëri, biseda do të rishfaqet.`,
      'Fshij',
      true,
    );
    if (!ok) return;
    const prev = conversations;
    setConversations((cs) => cs.filter((x) => !(x.tripId === c.tripId && x.otherUser.id === c.otherUser.id)));
    try {
      await api.delete(`/api/v1/messages/trip/${c.tripId}/with/${c.otherUser.id}`, token ?? undefined);
      refreshUnread();
    } catch (e: any) {
      setConversations(prev);
      await dialog.alert('Gabim', e.message);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <View style={s.titleRow}>
            <Text style={s.title}>Mesazhet</Text>
            {totalUnread > 0 && (
              <View style={s.unreadHero}>
                <Text style={s.unreadHeroText}>{totalUnread}</Text>
              </View>
            )}
          </View>
        </View>

        {conversations.length === 0 ? (
          <View style={{ marginTop: 40 }}>
            <EmptyState icon="chat" title="Nuk keni biseda ende" subtitle="Hap një udhëtim dhe kontakto shoferin." />
          </View>
        ) : (
          <View style={s.list}>
            {conversations.map((c) => {
              const initials = `${c.otherUser.firstName?.[0] ?? ''}${c.otherUser.lastName?.[0] ?? ''}`;
              const isUnread = c.unread > 0 && !c.lastMessage.fromMe;
              return (
                <TouchableOpacity
                  key={`${c.tripId}-${c.otherUser.id}`}
                  style={s.card}
                  onPress={() =>
                    router.push({
                      pathname: '/chat/[tripId]/[userId]',
                      params: { tripId: c.tripId, userId: c.otherUser.id },
                    })
                  }
                  onLongPress={() => deleteConversation(c)}
                  delayLongPress={350}
                  activeOpacity={0.85}
                >
                  <View style={s.avatar}>
                    {c.otherUser.avatarUrl ? (
                      <Image source={{ uri: c.otherUser.avatarUrl }} style={s.avatarImg} />
                    ) : (
                      <Text style={s.avatarText}>{initials}</Text>
                    )}
                  </View>
                  <View style={s.body}>
                    <View style={s.topRow}>
                      <View style={s.nameRow}>
                        <Text style={s.name} numberOfLines={1}>
                          {c.otherUser.firstName} {c.otherUser.lastName}
                        </Text>
                        {c.otherUser.role === 'ADMIN' && <AdminBadge size={14} />}
                      </View>
                      <Text style={[s.time, isUnread && s.timeUnread]}>{formatTime(c.lastMessage.createdAt)}</Text>
                    </View>
                    <Text style={s.route} numberOfLines={1}>
                      {c.trip.originLabel ?? c.trip.originCity?.name ?? '?'} →{' '}
                      {c.trip.destLabel ?? c.trip.destCity?.name ?? '?'}
                    </Text>
                    <View style={s.bottomRow}>
                      <Text style={[s.preview, isUnread && s.previewUnread]} numberOfLines={1}>
                        {c.lastMessage.fromMe ? 'Ti: ' : ''}
                        {c.lastMessage.content}
                      </Text>
                      {isUnread && (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{c.unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  title: { ...typography.h1 },
  unreadHero: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadHeroText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  list: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.text },
  body: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  name: { ...typography.h3, fontSize: 15, flexShrink: 1 },
  time: { ...typography.caption, fontSize: 11 },
  timeUnread: { color: colors.primary, fontWeight: '700' },
  route: { ...typography.caption, marginBottom: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, color: colors.subtle },
  previewUnread: { color: colors.text, fontWeight: '600' },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
