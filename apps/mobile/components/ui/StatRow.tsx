import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../lib/colors';

interface Props {
  icon: string;
  value: string | number;
  label: string;
}

export default function StatRow({ icon, value, label }: Props) {
  return (
    <View style={s.row}>
      <View style={s.iconWrap}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <View style={s.body}>
        <Text style={s.value}>{value}</Text>
        <Text style={s.label}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  iconWrap: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 20, color: colors.primary },
  body: { flex: 1 },
  value: { ...typography.h2, lineHeight: 28 },
  label: { ...typography.caption, marginTop: -2 },
});
