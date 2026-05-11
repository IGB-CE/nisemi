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
    <View style={s.touch} pointerEvents="box-none">
      {/* Large SVG canvas so gradients can fade fully to transparent before
          hitting any rectangular edge. The colored region is concentrated in
          the center via small rx/ry. */}
      <Svg style={s.svg} pointerEvents="none">
        <Defs>
          {/* Hot yellow spotlight, off-center to upper-right */}
          <RadialGradient id="hotSpot" cx="60%" cy="40%" rx="28%" ry="28%" fx="60%" fy="40%">
            <Stop offset="0%" stopColor="#FFD200" stopOpacity="0.95" />
            <Stop offset="35%" stopColor="#FF7A00" stopOpacity="0.7" />
            <Stop offset="65%" stopColor="#E10600" stopOpacity="0.35" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
          {/* Deeper red wash from lower-left for organic shape */}
          <RadialGradient id="warmWash" cx="35%" cy="60%" rx="38%" ry="38%" fx="35%" fy="60%">
            <Stop offset="0%" stopColor="#E10600" stopOpacity="0.55" />
            <Stop offset="55%" stopColor="#7A0303" stopOpacity="0.2" />
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

const CANVAS = 320;
const AVATAR = 140;

const s = StyleSheet.create({
  touch: { width: CANVAS, height: CANVAS, justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute', top: 0, left: 0, width: CANVAS, height: CANVAS },
  avatarTouch: { width: AVATAR, height: AVATAR },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: 'rgba(225,6,0,0.6)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { fontSize: 44, fontWeight: '900', color: colors.text },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 2, right: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.background },
  editBadgeText: { fontSize: 16 },
});
