import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../lib/colors';

interface Props {
  value: string | number;
  unit: string;
}

export default function MegaStat({ value, unit }: Props) {
  return (
    <View style={s.wrap}>
      <Text style={s.value}>{value}</Text>
      <Text style={s.unit}>{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  value: { ...typography.display, lineHeight: 44 },
  unit: { ...typography.label, color: colors.textDim, fontSize: 12 },
});
