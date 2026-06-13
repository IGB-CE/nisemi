import { View, Text, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import Icon, { type IconName } from './Icon';

interface Props {
  icon: IconName;
  value: string | number;
  label: string;
}

export default function StatRow({ icon, value, label }: Props) {
  const s = useThemedStyles(makeStyles);
  const colors = useColors();
  return (
    <View style={s.row}>
      <View style={s.iconWrap}>
        <Icon name={icon} size={20} color={colors.primary} />
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
    body: { flex: 1 },
    value: { ...typography.h2, lineHeight: 28 },
    label: { ...typography.caption, marginTop: -2 },
  });
