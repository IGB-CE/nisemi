import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useTheme, useThemedStyles, type Theme } from '../../lib/theme';
import { normalizeAlbanianMobile } from '../../lib/phone';
import PrimaryButton from '../../components/ui/PrimaryButton';
import PasswordInput from '../../components/ui/PasswordInput';
import GoogleSignInButton from '../../components/auth/GoogleSignInButton';
import AppleSignInButton from '../../components/auth/AppleSignInButton';

export default function Register() {
  const { signIn } = useAuth();
  const dialog = useDialog();
  const { colors, gradient } = useTheme();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      await dialog.alert('Gabim', 'Plotëso fushat e detyrueshme');
      return;
    }
    // Phone is optional, but if provided it must be a valid Albanian mobile.
    let normalizedPhone: string | undefined;
    if (form.phone.trim()) {
      const n = normalizeAlbanianMobile(form.phone);
      if (!n) {
        await dialog.alert('Gabim', 'Numri i telefonit nuk është i vlefshëm. Shembull: 069 123 4567');
        return;
      }
      normalizedPhone = n;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/register', {
        ...form,
        phone: normalizedPhone,
      });
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
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 30 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Krijo llogarinë</Text>
          <Text style={s.subtitle}>Filloni në më pak se një minutë</Text>

          <View style={s.form}>
            {[
              { key: 'firstName', label: 'Emri', required: true },
              { key: 'lastName', label: 'Mbiemri', required: true },
              { key: 'email', label: 'Email', required: true, keyboard: 'email-address' as const },
              { key: 'phone', label: 'Telefoni (opsional)', required: false, keyboard: 'phone-pad' as const },
              { key: 'password', label: 'Fjalëkalimi', required: true, secure: true },
            ].map(({ key, label, required, keyboard, secure }) => (
              <View key={key}>
                <Text style={s.fieldLabel}>
                  {label}
                  {required && ' *'}
                </Text>
                {secure ? (
                  <PasswordInput
                    style={s.input}
                    value={form[key as keyof typeof form]}
                    onChangeText={set(key as keyof typeof form)}
                    placeholderTextColor={colors.subtle}
                  />
                ) : (
                  <TextInput
                    style={s.input}
                    value={form[key as keyof typeof form]}
                    onChangeText={set(key as keyof typeof form)}
                    autoCapitalize={key === 'email' ? 'none' : 'words'}
                    keyboardType={keyboard}
                    placeholderTextColor={colors.subtle}
                  />
                )}
              </View>
            ))}

            <View style={{ marginTop: 20 }}>
              <PrimaryButton label="Regjistrohu" onPress={handleRegister} loading={loading} />
            </View>

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>ose</Text>
              <View style={s.dividerLine} />
            </View>

            <AppleSignInButton />
            <GoogleSignInButton />

            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={s.link}>
                <Text style={s.linkText}>
                  Ke llogari? <Text style={s.linkBold}>Hyr</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bg: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  scroll: { padding: 28, paddingBottom: 60 },
  logo: { width: 70, height: 70, alignSelf: 'center', marginBottom: 20, borderRadius: 16 },
  brand: { ...typography.label, color: colors.primary, fontSize: 12, textAlign: 'center' },
  title: { ...typography.h1, textAlign: 'center', marginTop: 8 },
  subtitle: { ...typography.bodyDim, textAlign: 'center', marginTop: 6, marginBottom: 24 },
  form: { gap: 2 },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  link: { marginTop: 24, alignItems: 'center', marginBottom: 20 },
  linkText: { color: colors.subtle, fontSize: 14 },
  linkBold: { color: colors.primary, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.subtle, fontSize: 12 },
});
