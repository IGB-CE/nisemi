import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { normalizeAlbanianMobile } from '../../lib/phone';
import { colors, typography, gradient } from '../../lib/colors';
import PrimaryButton from '../../components/ui/PrimaryButton';

export default function CompleteProfile() {
  const { token, user, updateUser, signOut } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone) {
      await dialog.alert('Gabim', 'Plotëso numrin e telefonit');
      return;
    }
    const normalizedPhone = normalizeAlbanianMobile(phone);
    if (!normalizedPhone) {
      await dialog.alert('Gabim', 'Numri i telefonit nuk është i vlefshëm. Shembull: 069 123 4567');
      return;
    }
    setLoading(true);
    try {
      const updated = await api.patch<any>('/api/v1/users/me', { phone: normalizedPhone }, token ?? undefined);
      await updateUser({ ...user!, ...updated });
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
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Edhe një hap</Text>
          <Text style={s.subtitle}>
            {user?.firstName ? `Përshëndetje ${user.firstName}, ` : ''}
            na duhet numri yt i telefonit për të vazhduar
          </Text>

          <View style={s.form}>
            <Text style={s.fieldLabel}>Numri i telefonit</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.subtle}
            />
            <Text style={s.hint}>Shembull: 069 123 4567</Text>

            <View style={{ marginTop: 24 }}>
              <PrimaryButton label="Vazhdo" onPress={handleSubmit} loading={loading} />
            </View>

            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label="Dil"
                variant="ghost"
                onPress={async () => {
                  await signOut();
                  router.replace('/(auth)/login');
                }}
              />
            </View>
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
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
  },
  hint: { ...typography.bodyDim, fontSize: 12, marginTop: 6 },
});
