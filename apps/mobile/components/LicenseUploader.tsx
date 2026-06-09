import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDialog } from '../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../lib/theme';
import VerifiedBadge from './VerifiedBadge';

export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface LicenseResult {
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

interface Props {
  status: VerificationStatus;
  rejectionReason?: string | null;
  onUpdated: (r: LicenseResult) => void;
}

export default function LicenseUploader({ status, rejectionReason, onUpdated }: Props) {
  const { token } = useAuth();
  const dialog = useDialog();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (source: 'gallery' | 'camera') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await dialog.alert('Leje e refuzuar', 'Nuk mund të hapim galerinë/kamerën.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const compressed = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1600 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });
      const base64 = compressed.base64;
      if (!base64) throw new Error('Encoding failed');

      const updated = await api.post<LicenseResult>(
        '/api/v1/drivers/me/license',
        { base64, mimeType: 'image/jpeg' },
        token ?? undefined,
      );
      onUpdated(updated);
      await dialog.alert('U dërgua', 'Licenca u dërgua për verifikim. Do të njoftoheni pas shqyrtimit.');
    } catch (e: any) {
      await dialog.alert('Gabim', e.message ?? 'Ngarkimi dështoi');
    } finally {
      setUploading(false);
    }
  };

  const showSourceMenu = () => {
    dialog.show({
      title: 'Licenca e drejtimit',
      message: 'Zgjidh nga ku të marrësh foton e licencës',
      buttons: [
        { label: 'Bëj foto', variant: 'primary', onPress: () => pickAndUpload('camera') },
        { label: 'Zgjidh nga galeria', variant: 'primary', onPress: () => pickAndUpload('gallery') },
        { label: 'Anulo', variant: 'cancel' },
      ],
    });
  };

  if (uploading) {
    return (
      <View style={s.statusRow}>
        <ActivityIndicator color={colors.primary} />
        <Text style={s.statusText}>Po ngarkohet…</Text>
      </View>
    );
  }

  const uploadBtn = (label: string) => (
    <TouchableOpacity style={s.button} onPress={showSourceMenu} activeOpacity={0.85}>
      <Text style={s.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  switch (status) {
    case 'APPROVED':
      return (
        <View>
          <VerifiedBadge size={20} label="E verifikuar" />
          <Text style={s.statusHint}>Licenca jote u verifikua nga administratorët.</Text>
        </View>
      );
    case 'PENDING':
      return (
        <View>
          <Text style={[s.statusBadge, { color: colors.warning, borderColor: colors.warning }]}>⏳ Në shqyrtim</Text>
          <Text style={s.statusHint}>Licenca është dërguar dhe po shqyrtohet.</Text>
          {uploadBtn('Ngarko përsëri')}
        </View>
      );
    case 'REJECTED':
      return (
        <View>
          <Text style={[s.statusBadge, { color: colors.danger, borderColor: colors.danger }]}>✕ U refuzua</Text>
          {rejectionReason ? <Text style={[s.statusHint, { color: colors.danger }]}>{rejectionReason}</Text> : null}
          {uploadBtn('Ngarko përsëri')}
        </View>
      );
    default:
      return (
        <View>
          <Text style={s.statusHint}>
            Ngarko foton e licencës së drejtimit për të marrë shenjën e verifikimit. Mund të publikosh udhëtime edhe pa
            u verifikuar.
          </Text>
          {uploadBtn('Ngarko licencën')}
        </View>
      );
  }
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusText: { ...typography.body, color: colors.textDim },
    statusHint: { ...typography.caption, color: colors.textDim, marginTop: 8 },
    statusBadge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 12,
      fontWeight: '800',
    },
    button: {
      marginTop: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
    },
    buttonText: { color: colors.primary, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  });
