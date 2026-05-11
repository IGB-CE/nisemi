import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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
    <View style={s.touch}>
      {/* SVG radial-gradient backdrop, larger than the touch area so the gradient
          fades out organically before hitting the page background. */}
      <Svg style={s.svg} pointerEvents="none">
        <Defs>
          {/* Hot yellow blob, offset to upper-right like the F1 portrait spotlight */}
          <RadialGradient id="hotSpot" cx="70%" cy="35%" rx="55%" ry="55%" fx="70%" fy="35%">
            <Stop offset="0%" stopColor="#FFD200" stopOpacity="0.95" />
            <Stop offset="25%" stopColor="#FF8800" stopOpacity="0.75" />
            <Stop offset="55%" stopColor="#E10600" stopOpacity="0.55" />
            <Stop offset="80%" stopColor="#7A0303" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          {/* Deeper red secondary wash from lower-left for organic shape */}
          <RadialGradient id="warmWash" cx="25%" cy="80%" rx="70%" ry="70%" fx="25%" fy="80%">
            <Stop offset="0%" stopColor="#E10600" stopOpacity="0.55" />
            <Stop offset="50%" stopColor="#9A0500" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#warmWash)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#hotSpot)" />
      </Svg>

      <TouchableOpacity onPress={showMenu} disabled={uploading} activeOpacity={0.85} style={s.avatarTouch}>
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
    </View>
  );
}

const WRAP = 180;
const AVATAR = 116;

const s = StyleSheet.create({
  touch: { width: WRAP, height: WRAP, justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute', top: 0, left: 0, width: WRAP, height: WRAP },
  avatarTouch: { width: AVATAR, height: AVATAR },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: 'rgba(225,6,0,0.6)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { fontSize: 38, fontWeight: '900', color: colors.text },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.background },
  editBadgeText: { fontSize: 14 },
});
