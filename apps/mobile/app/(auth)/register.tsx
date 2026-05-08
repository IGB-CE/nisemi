import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

export default function Register() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert('Gabim', 'Plotëso fushat e detyrueshme'); return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/register', form);
      await signIn(res.token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Gabim', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Krijo llogari</Text>
        <Text style={s.subtitle}>Regjistrohu në Albania Rides</Text>

        {[
          { key: 'firstName', label: 'Emri *' },
          { key: 'lastName', label: 'Mbiemri *' },
          { key: 'email', label: 'Email *', keyboard: 'email-address' as const },
          { key: 'phone', label: 'Telefoni' },
          { key: 'password', label: 'Fjalëkalimi *', secure: true },
        ].map(({ key, label, keyboard, secure }) => (
          <View key={key}>
            <Text style={s.label}>{label}</Text>
            <TextInput
              style={s.input}
              value={form[key as keyof typeof form]}
              onChangeText={set(key as keyof typeof form)}
              autoCapitalize={key === 'email' ? 'none' : 'words'}
              keyboardType={keyboard}
              secureTextEntry={secure}
              placeholderTextColor={colors.subtle}
              placeholder={label.replace(' *', '')}
            />
          </View>
        ))}

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
          <Text style={s.btnText}>{loading ? 'Duke u regjistruar...' : 'Regjistrohu'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={s.link}>
            <Text style={s.linkText}>Ke llogari? <Text style={s.linkBold}>Hyr</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.subtle, marginBottom: 32 },
  label: { fontSize: 13, color: colors.subtle, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 24, alignItems: 'center', marginBottom: 40 },
  linkText: { color: colors.subtle, fontSize: 14 },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
