import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { colors, typography } from '../../lib/colors';
import CityMapPicker, { type City } from '../../components/CityMapPicker';
import DateTimeField from '../../components/DateTimeField';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Card from '../../components/ui/Card';

export default function Publiko() {
  const { token } = useAuth();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
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
      await dialog.alert('Gabim', 'Plotëso të gjitha fushat e detyrueshme'); return;
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
      await dialog.alert('Sukses', 'Udhëtimi u publikua.');
      router.back();
    } catch (e: any) { await dialog.alert('Gabim', e.message); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CityMapPicker visible={showFrom} cities={cities} onSelect={c => { setOriginCity(c); setForm(f => ({ ...f, originCityId: c.id })); }} onClose={() => setShowFrom(false)} title="Qyteti i nisjes" />
      <CityMapPicker visible={showTo} cities={cities} onSelect={c => { setDestCity(c); setForm(f => ({ ...f, destCityId: c.id })); }} onClose={() => setShowTo(false)} title="Destinacioni" />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.headerWrap}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Kthehu</Text>
          </TouchableOpacity>
          <Text style={s.brand}>IKIM</Text>
          <Text style={s.title}>Publiko</Text>
        </View>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Rruga</Text>
          <Text style={s.fieldLabel}>Nga *</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowFrom(true)}>
            <Text style={originCity ? s.pickerValue : s.pickerPlaceholder}>{originCity?.name ?? 'Zgjidhni qytetin e nisjes'}</Text>
            <Text style={s.pickerArrow}>›</Text>
          </TouchableOpacity>

          <Text style={s.fieldLabel}>Deri *</Text>
          <TouchableOpacity style={s.picker} onPress={() => setShowTo(true)}>
            <Text style={destCity ? s.pickerValue : s.pickerPlaceholder}>{destCity?.name ?? 'Zgjidhni destinacionin'}</Text>
            <Text style={s.pickerArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Ora dhe çmimi</Text>
          <Text style={s.fieldLabel}>Data dhe ora *</Text>
          <DateTimeField value={departureAt} onChange={setDepartureAt} mode="datetime" placeholder="Zgjidhni datën dhe orën" />

          <Text style={s.fieldLabel}>Çmimi për vend (L) *</Text>
          <TextInput style={s.input} placeholder="1000" value={form.pricePerSeat} onChangeText={set('pricePerSeat')} keyboardType="numeric" placeholderTextColor={colors.subtle} />
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Vende të disponueshme</Text>
          <View style={s.seatRow}>
            {['1','2','3','4','5','6','7','8'].map(n => (
              <TouchableOpacity
                key={n}
                style={[s.seatBtn, form.totalSeats === n && s.seatBtnActive]}
                onPress={() => set('totalSeats')(n)}
              >
                <Text style={[s.seatBtnText, form.totalSeats === n && s.seatBtnTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={s.card}>
          <Text style={s.cardLabel}>Shënime</Text>
          <TextInput
            style={[s.input, { height: 90, textAlignVertical: 'top' }]}
            placeholder="P.sh. takimi te stacioni, bagazh i kufizuar..."
            value={form.notes}
            onChangeText={set('notes')}
            multiline
            placeholderTextColor={colors.subtle}
          />
        </Card>

        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <PrimaryButton label="Publiko udhëtimin" icon="🚗" onPress={publish} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  back: { marginBottom: 12 },
  backText: { color: colors.textDim, fontSize: 14 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },

  card: { marginHorizontal: 16, marginTop: 14 },
  cardLabel: { ...typography.label },
  fieldLabel: { ...typography.label, marginBottom: 6, marginTop: 14 },
  picker: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pickerPlaceholder: { color: colors.subtle, fontSize: 15 },
  pickerArrow: { color: colors.subtle, fontSize: 22, fontWeight: '300' },
  input: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, marginTop: 6 },

  seatRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  seatBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  seatBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  seatBtnText: { fontSize: 15, color: colors.text, fontWeight: '700' },
  seatBtnTextActive: { color: '#fff' },
});
