import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';
import { gradient } from '../lib/colors';

interface Props { children: ReactNode; style?: ViewStyle; }

export default function GradientHeader({ children, style }: Props) {
  return (
    <LinearGradient
      colors={gradient.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: 24, paddingTop: 60 }, style]}
    >
      {children}
    </LinearGradient>
  );
}
