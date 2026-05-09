import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, gradient } from '../../lib/colors';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Gabim', 'Plotëso të gjitha fushat'); return; }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: any }>('/api/v1/auth/login', { email, password });
      await signIn(res.token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Gabim', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0D0D0D', '#1A0000']} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inner}>
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.title}>Albania Rides</Text>
          <Text style={s.subtitle}>Hyr në llogarinë tënde</Text>

          <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address" placeholderTextColor={colors.subtle} />
          <TextInput style={s.input} placeholder="Fjalëkalimi" value={password} onChangeText={setPassword}
            secureTextEntry={true} placeholderTextColor={colors.subtle} />

          <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={gradient.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
              <Text style={s.btnText}>{loading ? 'Duke hyrë...' : 'Hyr'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={s.link}>
              <Text style={s.linkText}>Nuk ke llogari? <Text style={s.linkBold}>Regjistrohu</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  logo: { width: 110, height: 110, alignSelf: 'center', marginBottom: 20, borderRadius: 22 },
  title: { fontSize: 32, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.subtle, textAlign: 'center', marginBottom: 36 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, fontSize: 16, color: colors.text, marginBottom: 14 },
  btn: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 28, alignItems: 'center' },
  linkText: { color: colors.subtle, fontSize: 14 },
  linkBold: { color: colors.primary, fontWeight: '700' },
});
