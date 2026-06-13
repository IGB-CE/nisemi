import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type Theme } from '../lib/theme';
import Icon, { type IconName } from './ui/Icon';

export function ErrorScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const s = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={s.fullCenter}>
      <Icon name="warning" size={44} color={colors.subtle} style={{ marginBottom: 12 }} />
      <Text style={s.title}>Diçka shkoi keq</Text>
      <Text style={s.subtitle}>{message ?? 'Kontrollo lidhjen dhe provo përsëri.'}</Text>
      {onRetry && (
        <TouchableOpacity style={s.btn} onPress={onRetry}>
          <Text style={s.btnText}>Provo përsëri</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  const s = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={s.inlineCenter}>
      <Icon name={icon} size={44} color={colors.subtle} style={{ marginBottom: 12 }} />
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    inlineCenter: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.subtle, textAlign: 'center', lineHeight: 20 },
    btn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 24 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  });
