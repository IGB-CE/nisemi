import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { ErrorScreen, EmptyState } from '../../components/States';
import GradientHeader from '../../components/GradientHeader';

interface Conversation {
  tripId: string;
  trip: { id: string; originCity: { name: string }; destCity: { name: string }; departureAt: string };
  otherUser: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get<Conversation[]>('/api/v1/messages/conversations', token ?? undefined)
      .then(setConversations)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <View style={s.container}>
      <GradientHeader>
        <Text style={s.headerTitle}>Mesazhet</Text>
      </GradientHeader>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {conversations.length === 0 ? (
          <EmptyState icon="💬" title="Nuk keni biseda ende" subtitle="Hap një udhëtim dhe kontakto shoferin." />
        ) : conversations.map(c => (
          <TouchableOpacity
            key={`${c.tripId}-${c.otherUser.id}`}
            style={s.card}
            onPress={() => router.push({ pathname: '/chat/[tripId]/[userId]', params: { tripId: c.tripId, userId: c.otherUser.id } })}
          >
            <View style={s.avatar}>
              <Text style={s.avatarText}>{c.otherUser.firstName[0]}</Text>
            </View>
            <View style={s.body}>
              <View style={s.topRow}>
                <Text style={s.name} numberOfLines={1}>{c.otherUser.firstName} {c.otherUser.lastName}</Text>
                <Text style={s.time}>{formatTime(c.lastMessage.createdAt)}</Text>
              </View>
              <Text style={s.route} numberOfLines={1}>{c.trip.originCity.name} → {c.trip.destCity.name}</Text>
              <View style={s.bottomRow}>
                <Text style={[s.preview, c.unread > 0 && !c.lastMessage.fromMe && s.previewUnread]} numberOfLines={1}>
                  {c.lastMessage.fromMe ? 'Ti: ' : ''}{c.lastMessage.content}
                </Text>
                {c.unread > 0 && !c.lastMessage.fromMe && (
                  <View style={s.badge}><Text style={s.badgeText}>{c.unread}</Text></View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  body: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  time: { fontSize: 11, color: colors.subtle },
  route: { fontSize: 12, color: colors.subtle, marginBottom: 4 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { flex: 1, fontSize: 13, color: colors.subtle },
  previewUnread: { color: colors.text, fontWeight: '600' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, paddingHorizontal: 7, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
