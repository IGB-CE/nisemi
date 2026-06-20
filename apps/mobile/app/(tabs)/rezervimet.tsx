import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useDialog } from '../../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../../lib/theme';
import type { Palette } from '../../lib/colors';
import { ErrorScreen, EmptyState } from '../../components/States';
import PrimaryButton from '../../components/ui/PrimaryButton';
import Icon from '../../components/ui/Icon';

const statusMapFor = (colors: Palette): Record<string, { label: string; color: string }> => ({
  PENDING: { label: 'Në pritje', color: colors.warning },
  ACCEPTED: { label: 'Pranuar', color: colors.success },
  REJECTED: { label: 'Refuzuar', color: colors.danger },
  CANCELLED: { label: 'Anuluar', color: colors.subtle },
});

interface RatingTarget {
  tripId: string;
  driverId: string;
  driverName: string;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)}>
          <Text style={[s.star, n <= value && s.starFilled]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function Rezervimet() {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const statusMap = statusMapFor(colors);
  const insets = useSafeAreaInsets();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<RatingTarget | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get<any[]>('/api/v1/reservations/my', token ?? undefined)
      .then(setReservations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useFocusEffect(load);

  const cancel = async (id: string) => {
    const ok = await dialog.confirm('Anulo rezervimin?', 'Ky veprim nuk mund të zhbëhet.', 'Po, anulo', true);
    if (!ok) return;
    try {
      await api.patch(`/api/v1/reservations/${id}/cancel`, {}, token ?? undefined);
      setReservations((r) => r.map((x) => (x.id === id ? { ...x, status: 'CANCELLED' } : x)));
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  const hideFromHistory = async (tripId: string) => {
    const ok = await dialog.confirm(
      'Fshi nga historiku?',
      'Rezervimi do të hiqet nga historiku juaj. Shoferi nuk preket.',
      'Fshi',
      true,
    );
    if (!ok) return;
    try {
      await api.post('/api/v1/trips/hide', { tripIds: [tripId] }, token ?? undefined);
      setReservations((prev) => prev.filter((r) => r.trip.id !== tripId));
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  const clearHistory = async (tripIds: string[]) => {
    if (tripIds.length === 0) return;
    const ok = await dialog.confirm(
      'Pastro historikun?',
      `${tripIds.length} udhëtime do të hiqen nga historiku juaj.`,
      'Pastro',
      true,
    );
    if (!ok) return;
    try {
      await api.post('/api/v1/trips/hide', { tripIds }, token ?? undefined);
      setReservations((prev) => prev.filter((r) => !tripIds.includes(r.trip.id)));
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  const openRating = (r: any) => {
    setStars(5);
    setComment('');
    setRatingTarget({
      tripId: r.trip.id,
      driverId: r.trip.driver.id,
      driverName: `${r.trip.driver.firstName} ${r.trip.driver.lastName}`,
    });
  };

  const submitReview = async () => {
    if (!ratingTarget || stars === 0) return;
    setSubmitting(true);
    try {
      await api.post(
        '/api/v1/reviews',
        {
          tripId: ratingTarget.tripId,
          targetId: ratingTarget.driverId,
          rating: stars,
          comment: comment.trim() || undefined,
        },
        token ?? undefined,
      );
      setReservations((prev) =>
        prev.map((r) =>
          r.trip.id === ratingTarget.tripId ? { ...r, trip: { ...r.trip, reviews: [{ id: 'done' }] } } : r,
        ),
      );
      setRatingTarget(null);
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  const active = reservations.filter((r) => ['PENDING', 'ACCEPTED'].includes(r.status));
  const totalSeats = reservations.reduce((sum, r) => sum + (r.status === 'ACCEPTED' ? r.seats : 0), 0);

  // Current = still-actionable bookings on trips that haven't departed yet.
  // Everything else (past trips, rejected, cancelled) goes to the collapsible
  // history, mirroring the driver dashboard.
  const isCurrent = (r: any) =>
    ['PENDING', 'ACCEPTED'].includes(r.status) && new Date(r.trip.departureAt) >= new Date();
  const current = reservations.filter(isCurrent);
  const history = reservations.filter((r) => !isCurrent(r));

  const renderReservation = (r: any, inHistory = false) => {
    const st = statusMap[r.status] ?? { label: r.status, color: colors.subtle };
    const isPast = new Date(r.trip.departureAt) < new Date();
    const canRate = r.status === 'ACCEPTED' && isPast && r.trip.reviews?.length === 0;
    const hasReview = r.status === 'ACCEPTED' && isPast && r.trip.reviews?.length > 0;
    return (
      <View key={r.id} style={s.card}>
        <TouchableOpacity onPress={() => router.push(`/udhetime/${r.trip.id}` as any)} activeOpacity={0.85}>
          <View style={s.cardTop}>
            <View style={s.routeDots}>
              <View style={s.dotPrimary} />
              <View style={s.dotLine} />
              <View style={s.dotEnd} />
            </View>
            <View style={s.routeBody}>
              <Text style={s.city} numberOfLines={1}>{r.trip.originLabel ?? r.trip.originCity?.name ?? '?'}</Text>
              <Text style={s.cityDest} numberOfLines={1}>{r.trip.destLabel ?? r.trip.destCity?.name ?? '?'}</Text>
            </View>
            <View style={[s.statusPill, { borderColor: st.color, backgroundColor: st.color + '15' }]}>
              <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaItem}>
              <Icon name="calendar" size={12} color={colors.subtle} />{' '}
              {new Date(r.trip.departureAt).toLocaleDateString('sq-AL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaItem}>
              <Icon name="seats" size={12} color={colors.subtle} /> {r.seats}
            </Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.metaItem}>
              {r.trip.driver.firstName} {r.trip.driver.lastName}
            </Text>
          </View>
        </TouchableOpacity>
        {(canRate || hasReview || inHistory || (['PENDING', 'ACCEPTED'].includes(r.status) && !isPast)) && (
          <View style={s.actionRow}>
            {canRate && (
              <TouchableOpacity style={s.rateBtn} onPress={() => openRating(r)}>
                <Text style={s.rateBtnText}>★ Vlerëso</Text>
              </TouchableOpacity>
            )}
            {hasReview && <Text style={s.rated}>★ Vlerësuar</Text>}
            {['PENDING', 'ACCEPTED'].includes(r.status) && !isPast && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => cancel(r.id)}>
                <Text style={s.cancelText}>Anulo</Text>
              </TouchableOpacity>
            )}
            {inHistory && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => hideFromHistory(r.trip.id)}>
                <Text style={s.cancelText}>Fshi nga historiku</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerWrap}>
          <Text style={s.brand}>NISEMI</Text>
          <Text style={s.title}>Rezervimet</Text>
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Totale</Text>
            <Text style={s.statValue}>{reservations.length}</Text>
          </View>
          <View style={s.statCell}>
            <Text style={s.statLabel}>Aktive</Text>
            <Text style={s.statValue}>{active.length}</Text>
          </View>
          <View style={[s.statCell, { borderRightWidth: 0 }]}>
            <Text style={s.statLabel}>Vende</Text>
            <Text style={s.statValue}>{totalSeats}</Text>
          </View>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Rezervimet e mia</Text>
          <Text style={s.sectionMeta}>{current.length} aktive</Text>
        </View>

        {reservations.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="ticket"
              title="Nuk keni rezervime ende"
              subtitle="Kërko një udhëtim dhe rezervo vendin tënd."
            />
          </View>
        ) : current.length === 0 ? (
          <View style={{ marginTop: 20 }}>
            <EmptyState
              icon="ticket"
              title="Nuk keni rezervime aktive"
              subtitle="Rezervimet e kaluara i gjeni te historiku më poshtë."
            />
          </View>
        ) : (
          current.map((r) => renderReservation(r))
        )}

        {history.length > 0 && (
          <>
            <TouchableOpacity style={s.historyToggle} onPress={() => setShowHistory((v) => !v)} activeOpacity={0.7}>
              <Text style={s.historyToggleText}>
                {showHistory ? 'Fshih historikun' : `Shfaq historikun (${history.length})`}
              </Text>
              <Text style={s.historyToggleIcon}>{showHistory ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showHistory && (
              <>
                <TouchableOpacity
                  style={s.clearHistoryBtn}
                  onPress={() => clearHistory([...new Set(history.map((r) => r.trip.id as string))])}
                  activeOpacity={0.7}
                >
                  <Text style={s.clearHistoryText}>Pastro historikun</Text>
                </TouchableOpacity>
                {history.map((r) => renderReservation(r, true))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!ratingTarget} transparent animationType="slide" onRequestClose={() => setRatingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalLabel}>Vlerëso shoferin</Text>
            <Text style={s.modalTitle}>{ratingTarget?.driverName}</Text>
            <View style={{ height: 20 }} />
            <StarPicker value={stars} onChange={setStars} />
            <TextInput
              style={s.commentInput}
              placeholder="Shkruaj një koment (opsional)..."
              placeholderTextColor={colors.subtle}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
            />
            <View style={s.modalBtns}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Anulo" onPress={() => setRatingTarget(null)} variant="ghost" />
              </View>
              <View style={{ flex: 2 }}>
                <PrimaryButton label="Dërgo vlerësimin" onPress={submitReview} loading={submitting} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

  headerWrap: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
  brand: { ...typography.label, color: colors.primary, fontSize: 10 },
  title: { ...typography.h1, marginTop: 4 },

  statGrid: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    alignItems: 'flex-start',
  },
  statLabel: {
    ...typography.caption,
    color: colors.subtle,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: { ...typography.h2, marginTop: 4 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginHorizontal: 24,
    marginTop: 14,
    marginBottom: 12,
  },
  sectionTitle: { ...typography.h2 },
  sectionMeta: { ...typography.caption, color: colors.textDim },

  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  historyToggleText: { ...typography.label, color: colors.textDim },
  historyToggleIcon: { color: colors.textDim, fontSize: 11 },

  clearHistoryBtn: {
    alignSelf: 'flex-end',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  clearHistoryText: { color: colors.danger, fontSize: 12, fontWeight: '700' },

  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeDots: { alignItems: 'center', width: 12 },
  dotPrimary: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  dotLine: { width: 2, height: 26, backgroundColor: colors.borderStrong, marginVertical: 2 },
  dotEnd: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  routeBody: { flex: 1, justifyContent: 'space-between', height: 50 },
  city: { ...typography.h3, fontSize: 16 },
  cityDest: { ...typography.h3, fontSize: 16, color: colors.textDim },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  metaItem: { ...typography.caption, color: colors.textDim, fontSize: 12 },
  metaDot: { color: colors.subtle, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 },
  rateBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 999,
  },
  rateBtnText: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  rated: { color: colors.warning, fontSize: 12, fontWeight: '700' },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 999,
  },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalLabel: { ...typography.label },
  modalTitle: { ...typography.h2, marginTop: 4 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  star: { fontSize: 42, color: colors.borderStrong },
  starFilled: { color: colors.warning },
  commentInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
