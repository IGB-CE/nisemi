import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { BASE } from '../../lib/api';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import type { Palette } from '../../lib/colors';

const TITLES: Record<string, string> = {
  privacy: 'Politika e Privatësisë',
  terms: 'Kushtet e Përdorimit',
};

export default function PolicyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const mdStyles = makeMdStyles(colors);
  const insets = useSafeAreaInsets();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug !== 'privacy' && slug !== 'terms') {
      setError('Faqe e panjohur');
      return;
    }
    fetch(`${BASE}/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error('Nuk u arrit të ngarkohej politika');
        return r.text();
      })
      .then(setMarkdown)
      .catch((e) => setError(e.message));
  }, [slug]);

  const title = TITLES[slug as string] ?? 'Politika';

  return (
    <View style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {error && (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {!error && !markdown && (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {!error && markdown && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
          <Markdown style={mdStyles}>{markdown}</Markdown>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { ...typography.h2, color: colors.text, marginTop: -2 },
  title: { ...typography.h3, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { ...typography.body, color: colors.danger, textAlign: 'center' },
});

const makeMdStyles = (colors: Palette) => ({
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  heading1: { color: colors.text, fontSize: 24, fontWeight: '800' as const, marginTop: 16, marginBottom: 8 },
  heading2: { color: colors.text, fontSize: 19, fontWeight: '700' as const, marginTop: 24, marginBottom: 6 },
  heading3: { color: colors.text, fontSize: 16, fontWeight: '700' as const, marginTop: 16, marginBottom: 4 },
  paragraph: { color: colors.textDim, marginVertical: 6 },
  strong: { color: colors.text, fontWeight: '700' as const },
  em: { color: colors.subtle, fontStyle: 'italic' as const },
  link: { color: colors.primary },
  list_item: { color: colors.textDim },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  table: { borderColor: colors.border, borderWidth: 1, borderRadius: 8 },
  thead: { backgroundColor: colors.surface },
  th: { color: colors.text, padding: 8, fontWeight: '700' as const },
  td: { color: colors.textDim, padding: 8, borderTopWidth: 1, borderTopColor: colors.border },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 20 },
  code_inline: { backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 6, borderRadius: 4 },
});
