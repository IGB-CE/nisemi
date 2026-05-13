import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { type ViewStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradient, colors } from '../lib/colors';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'flat' | 'glow';
}

export default function GradientHeader({ children, style, variant = 'flat' }: Props) {
  const insets = useSafeAreaInsets();
  if (variant === 'flat') {
    return (
      <View
        style={[
          { paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 16, backgroundColor: colors.background },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <LinearGradient
      colors={gradient.header}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: 28 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
