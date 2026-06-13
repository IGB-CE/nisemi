import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';
import { useColors } from '../../lib/theme';
import Icon, { type IconName } from './Icon';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}

export default function PrimaryButton({ label, onPress, variant = 'primary', loading, disabled, icon, style }: Props) {
  const colors = useColors();
  const bg = variant === 'primary' ? colors.primary : 'transparent';
  const border = variant === 'outline' ? colors.borderStrong : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'outline' ? colors.text : colors.textDim;
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg, borderColor: border }, (disabled || loading) && { opacity: 0.5 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <Text style={[s.label, { color: fg }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
