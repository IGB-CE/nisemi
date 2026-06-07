import { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useColors } from '../../lib/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  style?: StyleProp<TextStyle>;
  placeholderTextColor?: string;
};

export default function PasswordInput({ value, onChangeText, style, placeholderTextColor }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={s.wrapper}>
      <TextInput
        style={[style, s.input]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        placeholderTextColor={placeholderTextColor}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        style={s.toggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Fshih fjalëkalimin' : 'Shfaq fjalëkalimin'}
      >
        {visible ? <EyeOff /> : <Eye />}
      </TouchableOpacity>
    </View>
  );
}

function Eye() {
  const colors = useColors();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
        stroke={colors.subtle}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={colors.subtle} strokeWidth={2} />
    </Svg>
  );
}

function EyeOff() {
  const colors = useColors();
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
        stroke={colors.subtle}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={1} y1={1} x2={23} y2={23} stroke={colors.subtle} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const s = StyleSheet.create({
  wrapper: { position: 'relative', justifyContent: 'center' },
  input: { paddingRight: 48 },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
});
