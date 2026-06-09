import { View, Text, StyleSheet } from 'react-native';

// Trust "blue check" — fixed brand-independent blue, not part of the theme palette.
export const VERIFIED_BLUE = '#1D9BF0';

interface Props {
  size?: number;
  label?: string;
}

export default function VerifiedBadge({ size = 16, label }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.check, { fontSize: size * 0.6, lineHeight: size }]}>✓</Text>
      </View>
      {label ? <Text style={[styles.label, { fontSize: Math.max(11, size * 0.72) }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  badge: { backgroundColor: VERIFIED_BLUE, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#fff', fontWeight: '900', textAlign: 'center' },
  label: { color: VERIFIED_BLUE, fontWeight: '800', letterSpacing: 0.2 },
});
