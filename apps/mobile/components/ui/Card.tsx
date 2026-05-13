import { View, type ViewStyle, type ViewProps } from 'react-native';
import { colors } from '../../lib/colors';

interface Props extends ViewProps {
  variant?: 'default' | 'elevated' | 'flat';
  padding?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function Card({ variant = 'default', padding = 16, style, children, ...rest }: Props) {
  const bg = variant === 'elevated' ? colors.surfaceElevated : variant === 'flat' ? 'transparent' : colors.surface;
  const borderColor = variant === 'flat' ? 'transparent' : colors.border;
  return (
    <View {...rest} style={[{ backgroundColor: bg, borderRadius: 18, padding, borderWidth: 1, borderColor }, style]}>
      {children}
    </View>
  );
}
