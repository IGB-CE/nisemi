import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../lib/theme';

interface Props {
  label: string;
  color?: string;
}

export default function Pill({ label, color }: Props) {
  const colors = useColors();
  const resolved = color ?? colors.primary;
  return (
    <View style={[s.pill, { borderColor: resolved, backgroundColor: resolved + '15' }]}>
      <Text style={[s.text, { color: resolved }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
});
