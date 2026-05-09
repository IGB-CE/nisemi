import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradient } from '../lib/colors';

interface Props { children: ReactNode; style?: ViewStyle; }

export default function GradientHeader({ children, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={gradient.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ paddingTop: insets.top + 16, paddingHorizontal: 24, paddingBottom: 20 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
