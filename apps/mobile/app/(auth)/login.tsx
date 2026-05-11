import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { colors, typography, gradient } from '../../lib/colors';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function Login() {
  const { signIn } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { await dialog.alert('Gabim', 'Plotëso të gjitha fushat'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/login', { email, password });
      await signIn(res.token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={gradient.hero}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={s.bg}
        pointerEvents="none"
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40 }]} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>IKIM</Text>
          <Text style={s.title}>Mirë se erdhe</Text>
          <Text style={s.subtitle}>Hyr për të vazhduar</Text>

          <View style={s.form}>
            <Text style={s.fieldLabel}>Email</Text>
            <TextInput
              style={s.input}
              placeholder="ti@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.subtle}
            />

            <Text style={s.fieldLabel}>Fjalëkalimi</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.subtle}
            />

            <View style={{ marginTop: 20 }}>
              <PrimaryButton label="Hyr" onPress={handleLogin} loading={loading} />
            </View>

            <Link href="/(auth)/register" asChild>
              <TouchableOpacity style={s.link}>
                <Text style={s.linkText}>Nuk ke llogari? <Text style={s.linkBold}>Regjistrohu</Text></Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  scroll: { padding: 28, paddingBottom: 60 },
  logo: { width: 84, height: 84, alignSelf: 'center', marginBottom: 28, borderRadius: 18 },
  brand: { ...typography.label, color: colors.primary, fontSize: 12, textAlign: 'center' },
  title: { ...typography.display, textAlign: 'center', marginTop: 8 },
  subtitle: { ...typography.bodyDim, textAlign: 'center', marginTop: 8, marginBottom: 36 },
  form: { gap: 4 },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.subtle, fontSize: 14 },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
