import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDialog } from '../lib/dialog';
import { useColors, useThemedStyles, type Theme } from '../lib/theme';

interface Props {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
}

export default function CarPhotoUploader({ currentUrl, onUploaded }: Props) {
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
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              aspect: [4, 3],
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
              aspect: [4, 3],
            });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const compressed = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1280 } }], {
        compress: 0.7,
        format: SaveFormat.JPEG,
        base64: true,
      });

      const base64 = compressed.base64;
      if (!base64) throw new Error('Encoding failed');

      const updated = await api.post<any>(
        '/api/v1/drivers/me/car-photo',
        { base64, mimeType: 'image/jpeg' },
        token ?? undefined,
      );
      onUploaded(updated.carPhotoUrl);
    } catch (e: any) {
      await dialog.alert('Gabim', e.message ?? 'Ngarkimi dështoi');
    } finally {
      setUploading(false);
    }
  };

  const showSourceMenu = () => {
    dialog.show({
      title: 'Foto e makinës',
      message: 'Zgjidh nga ku të marrësh foton',
      buttons: [
        { label: 'Bëj foto', variant: 'primary', onPress: () => pickAndUpload('camera') },
        { label: 'Zgjidh nga galeria', variant: 'primary', onPress: () => pickAndUpload('gallery') },
        { label: 'Anulo', variant: 'cancel' },
      ],
    });
  };

  return (
    <View style={s.wrap}>
      {currentUrl ? (
        <TouchableOpacity activeOpacity={0.85} onPress={showSourceMenu} disabled={uploading}>
          <Image source={{ uri: currentUrl }} style={s.image} />
          <View style={s.overlay}>
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={s.overlayText}>Ndrysho foton</Text>}
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={s.placeholder} onPress={showSourceMenu} disabled={uploading} activeOpacity={0.85}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={s.placeholderIcon}>📷</Text>
              <Text style={s.placeholderText}>Shto foton e makinës</Text>
              <Text style={s.placeholderHint}>Pasagjerët e shikojnë para rezervimit</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  wrap: { marginTop: 4 },
  image: { width: '100%', height: 180, borderRadius: 14, backgroundColor: colors.surfaceElevated },
  overlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  overlayText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  placeholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholderIcon: { fontSize: 32, marginBottom: 8 },
  placeholderText: { ...typography.h3, color: colors.text },
  placeholderHint: { ...typography.caption, marginTop: 4 },
});
