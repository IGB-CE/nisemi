import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import GradientHeader from '../../components/GradientHeader';
import CityMapPicker, { type City } from '../../components/CityMapPicker';
import DateTimeField from '../../components/DateTimeField';

export default function Publiko() {
  const { token } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({ originCityId: '', destCityId: '', pricePerSeat: '', totalSeats: '3', notes: '' });
  const [departureAt, setDepartureAt] = useState<Date | null>(null);
  const [originCity, setOriginCity] = useState<City | null>(null);
  const [destCity, setDestCity] = useState<City | null>(null);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get<City[]>('/api/v1/cities').then(setCities).catch(() => {}); }, []);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const publish = async () => {
    if (!form.originCityId || !form.destCityId || !departureAt || !form.pricePerSeat) {
      Alert.alert('Gabim', 'Plotëso të gjitha fushat e detyrueshme'); return;
    }
    setSaving(true);
    try {
      await api.post('/api/v1/trips', {
        originCityId: form.originCityId,
        destCityId: form.destCityId,
        departureAt: departureAt!.toISOString(),
        pricePerSeat: Number(form.pricePerSeat),
        totalSeats: Number(form.totalSeats),
        notes: form.notes || undefined,
      }, token ?? undefined);
      Alert.alert('Sukses! 🎉', 'Udhëtimi u publikua me sukses.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) { Alert.alert('Gabim', e.message); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CityMapPicker visible={showFrom} cities={cities} onSelect={c => { setOriginCity(c); setForm(f => ({ ...f, originCityId: c.id })); }} onClose={() => setShowFrom(false)} title="Zgjidhni qytetin e nisjes" />
      <CityMapPicker visible={showTo} cities={cities} onSelect={c => { setDestCity(c); setForm(f => ({ ...f, destCityId: c.id })); }} onClose={() => setShowTo(false)} title="Zgjidhni destinacionin" />
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <GradientHeader>
          <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Kthehu</Text></TouchableOpacity>
          <Text style={s.title}>Publiko udhëtim</Text>
        </GradientHeader>
        <View style={s.form}>
          <Text style={s.label}>Nga *</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowFrom(true)}>
            <Text style={originCity ? s.pickerValue : s.pickerPlaceholder}>{originCity?.name ?? 'Zgjidhni qytetin e nisjes'}</Text>
          </TouchableOpacity>

          <Text style={s.label}>Deri *</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowTo(true)}>
            <Text style={destCity ? s.pickerValue : s.pickerPlaceholder}>{destCity?.name ?? 'Zgjidhni destinacionin'}</Text>
          </TouchableOpacity>

          <Text style={s.label}>Data dhe ora e nisjes *</Text>
          <DateTimeField value={departureAt} onChange={setDepartureAt} mode="datetime" placeholder="Zgjidhni datën dhe orën" />

          <Text style={s.label}>Çmimi për vend (L) *</Text>
          <TextInput style={s.input} placeholder="1000" value={form.pricePerSeat} onChangeText={set('pricePerSeat')} keyboardType="numeric" placeholderTextColor={colors.subtle} />

          <Text style={s.label}>Numri i vendeve</Text>
          <View style={s.seatRow}>
            {['1','2','3','4','5','6','7','8'].map(n => (
              <TouchableOpacity key={n} style={[s.seatBtn, form.totalSeats === n && s.seatBtnActive]} onPress={() => set('totalSeats')(n)}>
                <Text style={[s.seatBtnText, form.totalSeats === n && s.seatBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Shënime (opsionale)</Text>
          <TextInput style={[s.input, { height: 80 }]} placeholder="Çdo informacion shtesë..." value={form.notes} onChangeText={set('notes')} multiline={true} placeholderTextColor={colors.subtle} />

          <TouchableOpacity style={[s.btn, saving && { opacity: 0.6 }]} onPress={publish} disabled={saving}>
            <Text style={s.btnText}>{saving ? 'Duke publikuar...' : '🚗 Publiko udhëtimin'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  back: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  form: { padding: 16 },
  label: { fontSize: 12, color: colors.subtle, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  picker: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14 },
  pickerValue: { color: colors.text, fontSize: 15 },
  pickerPlaceholder: { color: colors.subtle, fontSize: 15 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.text },
  seatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seatBtn: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  seatBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  seatBtnText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  seatBtnTextActive: { color: '#fff' },
  btn: { backgroundColor: colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 32 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
