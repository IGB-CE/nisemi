import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles, type Theme } from '../../lib/theme';

interface Props {
  icon: string;
  value: string | number;
  label: string;
}

export default function StatRow({ icon, value, label }: Props) {
  const s = useThemedStyles(makeStyles);
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

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
    iconWrap: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    icon: { fontSize: 20, color: colors.primary },
    body: { flex: 1 },
    value: { ...typography.h2, lineHeight: 28 },
    label: { ...typography.caption, marginTop: -2 },
  });
