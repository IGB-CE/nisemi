import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { colors, typography, gradient } from '../../lib/colors';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function Register() {
  const { signIn } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      await dialog.alert('Gabim', 'Plotëso fushat e detyrueshme'); return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/register', form);
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
        <ScrollView contentContainerStyle={[s.scroll, { paddingTop: insets.top + 30 }]} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>IKIM</Text>
          <Text style={s.title}>Krijo llogarinë</Text>
          <Text style={s.subtitle}>Filloni në më pak se një minutë</Text>

          <View style={s.form}>
            {[
              { key: 'firstName', label: 'Emri', required: true },
              { key: 'lastName', label: 'Mbiemri', required: true },
              { key: 'email', label: 'Email', required: true, keyboard: 'email-address' as const },
              { key: 'phone', label: 'Telefoni' },
              { key: 'password', label: 'Fjalëkalimi', required: true, secure: true },
            ].map(({ key, label, required, keyboard, secure }) => (
              <View key={key}>
                <Text style={s.fieldLabel}>{label}{required && ' *'}</Text>
                <TextInput
                  style={s.input}
                  value={form[key as keyof typeof form]}
                  onChangeText={set(key as keyof typeof form)}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                  keyboardType={keyboard}
                  secureTextEntry={secure}
                  placeholderTextColor={colors.subtle}
                  placeholder={label}
                />
              </View>
            ))}

            <View style={{ marginTop: 20 }}>
              <PrimaryButton label="Regjistrohu" onPress={handleRegister} loading={loading} />
            </View>

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={s.link}>
                <Text style={s.linkText}>Ke llogari? <Text style={s.linkBold}>Hyr</Text></Text>
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
  logo: { width: 70, height: 70, alignSelf: 'center', marginBottom: 20, borderRadius: 16 },
  brand: { ...typography.label, color: colors.primary, fontSize: 12, textAlign: 'center' },
  title: { ...typography.h1, textAlign: 'center', marginTop: 8 },
  subtitle: { ...typography.bodyDim, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  form: { gap: 2 },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text },
  link: { marginTop: 24, alignItems: 'center', marginBottom: 20 },
  linkText: { color: colors.subtle, fontSize: 14 },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
