import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../lib/colors';

interface Props {
  label: string;
  color?: string;
}

export default function Pill({ label, color = colors.primary }: Props) {
  return (
    <View style={[s.pill, { borderColor: color, backgroundColor: color + '15' }]}>
      <Text style={[s.text, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
