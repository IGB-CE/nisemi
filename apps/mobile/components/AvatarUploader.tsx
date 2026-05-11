import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDialog } from '../lib/dialog';
import { colors } from '../lib/colors';

interface Props {
  currentUrl?: string | null;
  initials: string;
  onUploaded: (url: string) => void;
}

export default function AvatarUploader({ currentUrl, initials, onUploaded }: Props) {
  const { token } = useAuth();
  const dialog = useDialog();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (source: 'gallery' | 'camera') => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await dialog.alert('Leje e refuzuar', 'Nuk mund të hapim galerinë/kamerën.');
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, aspect: [1, 1] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85, aspect: [1, 1] });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const compressed = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true },
      );
      if (!compressed.base64) throw new Error('Encoding failed');

      const updated = await api.post<any>(
        '/api/v1/users/me/avatar',
        { base64: compressed.base64, mimeType: 'image/jpeg' },
        token ?? undefined,
      );
      onUploaded(updated.avatarUrl);
    } catch (e: any) {
      await dialog.alert('Gabim', e.message ?? 'Ngarkimi dështoi');
    } finally {
      setUploading(false);
    }
  };

  const showMenu = () => {
    dialog.show({
      title: 'Foto e profilit',
      message: 'Zgjidh nga ku të marrësh foton',
      buttons: [
        { label: 'Bëj foto', variant: 'primary', onPress: () => pickAndUpload('camera') },
        { label: 'Galeria', variant: 'primary', onPress: () => pickAndUpload('gallery') },
        { label: 'Anulo', variant: 'cancel' },
      ],
    });
  };

  return (
    <TouchableOpacity onPress={showMenu} disabled={uploading} activeOpacity={0.85} style={s.touch}>
      {/* Warm outer halo - largest, faintest, yellow/orange */}
      <LinearGradient
        colors={['rgba(255,184,0,0.0)', 'rgba(255,184,0,0.35)', 'rgba(225,6,0,0.0)']}
        start={{ x: 0.15, y: 0.15 }}
        end={{ x: 0.85, y: 0.85 }}
        style={s.haloFar}
        pointerEvents="none"
      />
      {/* Hot spot - yellow/orange peaking behind upper-left of avatar */}
      <LinearGradient
        colors={['rgba(255,200,0,0.85)', 'rgba(255,100,0,0.65)', 'rgba(225,6,0,0.35)', 'rgba(0,0,0,0)']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.95, y: 0.95 }}
        style={s.haloHot}
        pointerEvents="none"
      />
      {/* Avatar */}
      <View style={s.avatar}>
        {currentUrl ? (
          <Image source={{ uri: currentUrl }} style={s.image} />
        ) : (
          <Text style={s.initials}>{initials}</Text>
        )}
        {uploading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
      <View style={s.editBadge}>
        <Text style={s.editBadgeText}>📷</Text>
      </View>
    </TouchableOpacity>
  );
}

const RING = 150;
const AVATAR = 116;

const s = StyleSheet.create({
  touch: { width: RING, height: RING, justifyContent: 'center', alignItems: 'center' },
  haloFar: { position: 'absolute', width: RING + 24, height: RING + 24, borderRadius: (RING + 24) / 2 },
  haloHot: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { fontSize: 38, fontWeight: '900', color: colors.text },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.background },
  editBadgeText: { fontSize: 14 },
});
