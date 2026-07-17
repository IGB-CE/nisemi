import { View, Text, StyleSheet } from 'react-native';

// Official Nisemi staff badge — yellow so it's visually distinct from the blue
// driver-verification checkmark (VerifiedBadge).
export const ADMIN_YELLOW = '#F2B705';

interface Props {
  size?: number;
  label?: string;
}

export default function AdminBadge({ size = 16, label }: Props) {
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
  badge: { backgroundColor: ADMIN_YELLOW, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#fff', fontWeight: '900', textAlign: 'center' },
  label: { color: ADMIN_YELLOW, fontWeight: '800', letterSpacing: 0.2 },
});
