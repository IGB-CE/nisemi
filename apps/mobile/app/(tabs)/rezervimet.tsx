import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

const statusMap: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Në pritje', color: colors.warning },
  ACCEPTED: { label: 'Pranuar', color: colors.success },
  REJECTED: { label: 'Refuzuar', color: colors.danger },
  CANCELLED: { label: 'Anuluar', color: colors.subtle },
};

interface RatingTarget { tripId: string; driverId: string; driverName: string; }

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[s.star, n <= value && s.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Rezervimet() {
  const { token } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    api.get<any[]>('/api/v1/reservations/my', token ?? undefined)
      .then(setReservations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]));

  const cancel = async (id: string) => {
    Alert.alert('Konfirmo', 'Dëshiron të anulosh këtë rezervim?', [
      { text: 'Jo' },
      { text: 'Po, anulo', style: 'destructive', onPress: async () => {
        try {
          await api.patch(`/api/v1/reservations/${id}/cancel`, {}, token ?? undefined);
          setReservations(r => r.map(x => x.id === id ? { ...x, status: 'CANCELLED' } : x));
        } catch (e: any) { Alert.alert('Gabim', e.message); }
      }},
    ]);
  };

  const openRating = (r: any) => {
    setStars(5);
    setComment('');
    setRatingTarget({ tripId: r.trip.id, driverId: r.trip.driver.id, driverName: `${r.trip.driver.firstName} ${r.trip.driver.lastName}` });
  };

  const submitReview = async () => {
    if (!ratingTarget || stars === 0) return;
    setSubmitting(true);
    try {
      await api.post('/api/v1/reviews', { tripId: ratingTarget.tripId, targetId: ratingTarget.driverId, rating: stars, comment: comment.trim() || undefined }, token ?? undefined);
      setReservations(prev => prev.map(r =>
        r.trip.id === ratingTarget.tripId
          ? { ...r, trip: { ...r.trip, reviews: [{ id: 'done' }] } }
          : r
      ));
      setRatingTarget(null);
    } catch (e: any) {
      Alert.alert('Gabim', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.headerTitle}>Rezervimet e mia</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {reservations.length === 0 ? (
          <Text style={s.empty}>Nuk keni rezervime</Text>
        ) : reservations.map(r => {
          const st = statusMap[r.status] ?? { label: r.status, color: colors.subtle };
          const isPast = new Date(r.trip.departureAt) < new Date();
          const canRate = r.status === 'ACCEPTED' && isPast && r.trip.reviews?.length === 0;
          return (
            <View key={r.id} style={s.card}>
              <TouchableOpacity onPress={() => router.push(`/udhetime/${r.trip.id}`)}>
                <View style={s.route}>
                  <Text style={s.city}>{r.trip.originCity.name}</Text>
                  <Text style={s.arrow}>→</Text>
                  <Text style={s.city}>{r.trip.destCity.name}</Text>
                </View>
                <Text style={s.date}>{new Date(r.trip.departureAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={s.driver}>Shofer: {r.trip.driver.firstName} {r.trip.driver.lastName}</Text>
                <Text style={s.seats}>Vende: {r.seats}</Text>
              </TouchableOpacity>
              <View style={s.footer}>
                <View style={[s.badge, { backgroundColor: st.color + '22' }]}>
                  <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
                <View style={s.actions}>
                  {canRate && (
                    <TouchableOpacity style={s.rateBtn} onPress={() => openRating(r)}>
                      <Text style={s.rateBtnText}>★ Vlerëso</Text>
                    </TouchableOpacity>
                  )}
                  {r.status === 'ACCEPTED' && isPast && r.trip.reviews?.length > 0 && (
                    <Text style={s.rated}>★ Vlerësuar</Text>
                  )}
                  {['PENDING', 'ACCEPTED'].includes(r.status) && !isPast && (
                    <TouchableOpacity style={s.cancelBtn} onPress={() => cancel(r.id)}>
                      <Text style={s.cancelText}>Anulo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={!!ratingTarget} transparent animationType="slide" onRequestClose={() => setRatingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Vlerëso shoferin</Text>
            <Text style={s.modalSub}>{ratingTarget?.driverName}</Text>
            <StarPicker value={stars} onChange={setStars} />
            <TextInput
              style={s.commentInput}
              placeholder="Koment (opsional)..."
              placeholderTextColor={colors.subtle}
              value={comment}
              onChangeText={setComment}
              multiline={true}
              maxLength={300}
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.cancelModalBtn} onPress={() => setRatingTarget(null)}>
                <Text style={s.cancelModalText}>Anulo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, submitting && s.submitBtnDisabled]} onPress={submitReview} disabled={submitting}>
                <Text style={s.submitBtnText}>{submitting ? 'Duke dërguar...' : 'Dërgo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: colors.primary, padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  empty: { textAlign: 'center', color: colors.subtle, marginTop: 60, fontSize: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  city: { fontSize: 17, fontWeight: '700', color: colors.text },
  arrow: { marginHorizontal: 8, color: colors.primary, fontSize: 16 },
  date: { color: colors.subtle, fontSize: 13, marginBottom: 4 },
  driver: { color: colors.subtle, fontSize: 13, marginBottom: 4 },
  seats: { color: colors.subtle, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, borderColor: colors.danger, borderRadius: 20 },
  cancelText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  rateBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.warning, borderRadius: 20 },
  rateBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rated: { color: colors.warning, fontSize: 13, fontWeight: '600' },
  // modal
  modalOverlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: colors.subtle, marginBottom: 20 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  star: { fontSize: 42, color: colors.border },
  starFilled: { color: colors.warning },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 15, color: colors.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelModalBtn: { flex: 1, paddingVertical: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center' },
  cancelModalText: { color: colors.subtle, fontWeight: '600', fontSize: 15 },
  submitBtn: { flex: 2, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
