import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { blocks as blocksApi, type Block } from '../../lib/blocks';
import { ErrorScreen, EmptyState } from '../../components/States';
import Card from '../../components/ui/Card';

export default function BlockedUsersScreen() {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    blocksApi
      .list(token)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unblock = async (b: Block) => {
    const ok = await dialog.confirm(
      'Zhblloko këtë përdorues?',
      `${b.blocked.firstName} ${b.blocked.lastName} do të mund t'ju dërgojë mesazhe sërish.`,
      'Zhblloko',
    );
    if (!ok || !token) return;
    try {
      await blocksApi.remove(b.blockedId, token);
      setItems((prev) => prev.filter((x) => x.blockedId !== b.blockedId));
    } catch (e: any) {
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

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}>
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Përdoruesit e bllokuar</Text>
          <Text style={s.subtitle}>Bllokimi prek vetëm mesazhet. Nuk ndikon rezervimet ose vlerësimet.</Text>
        </View>

        {items.length === 0 ? (
          <View style={{ marginTop: 30 }}>
            <EmptyState icon="🚫" title="Nuk keni bllokuar askënd" />
          </View>
        ) : (
          items.map((b) => (
            <Card key={b.id} style={s.card}>
              <View style={s.row}>
                <View style={s.avatar}>
                  {b.blocked.avatarUrl ? (
                    <Image source={{ uri: b.blocked.avatarUrl }} style={s.avatarImg} />
                  ) : (
                    <Text style={s.avatarText}>
                      {b.blocked.firstName[0]}
                      {b.blocked.lastName[0]}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>
                    {b.blocked.firstName} {b.blocked.lastName}
                  </Text>
                  <Text style={s.since}>
                    Bllokuar më {new Date(b.createdAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity style={s.unblockBtn} onPress={() => unblock(b)}>
                  <Text style={s.unblockText}>Zhblloko</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
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
  back: { marginBottom: 8 },
  backText: { color: colors.textDim, fontSize: 14 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },
  subtitle: { ...typography.bodyDim, marginTop: 6 },

  card: { marginHorizontal: 16, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 14, fontWeight: '800', color: colors.text },
  name: { ...typography.body, fontWeight: '600' },
  since: { ...typography.caption, color: colors.subtle, marginTop: 2 },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  unblockText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
});
