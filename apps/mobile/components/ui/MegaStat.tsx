import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles, type Theme } from '../../lib/theme';

interface Props {
  value: string | number;
  unit: string;
}

export default function MegaStat({ value, unit }: Props) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.wrap}>
      <Text style={s.value}>{value}</Text>
      <Text style={s.unit}>{unit}</Text>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    value: { ...typography.display, lineHeight: 44 },
    unit: { ...typography.label, color: colors.textDim, fontSize: 12 },
  });
