import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../lib/colors';

interface Props {
  data: { label: string; value: number }[];
  height?: number;
}

export default function BarChart({ data, height = 120 }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={s.wrap}>
      <View style={[s.bars, { height }]}>
        {data.map((d, i) => {
          const h = (d.value / max) * height;
          return (
            <View key={i} style={s.col}>
              <View
                style={[
                  s.bar,
                  { height: Math.max(h, 2), backgroundColor: d.value > 0 ? colors.primary : colors.borderStrong },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={s.labels}>
        {data.map((d, i) => (
          <View key={i} style={s.col}>
            <Text style={s.label}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  labels: { flexDirection: 'row', gap: 4 },
  label: { ...typography.caption, fontSize: 9, color: colors.subtle },
});
