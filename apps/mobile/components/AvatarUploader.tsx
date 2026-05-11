import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/colors';

interface Props {
  currentUrl?: string | null;
  initials: string;
  onUploaded: (url: string) => void;
}

export default function AvatarUploader({ currentUrl, initials, onUploaded }: Props) {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async (source: 'gallery' | 'camera') => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Leje e refuzuar', 'Nuk mund të hapim galerinë/kamerën.');
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
      Alert.alert('Gabim', e.message ?? 'Ngarkimi dështoi');
    } finally {
      setUploading(false);
    }
  };

  const showMenu = () => {
    Alert.alert('Foto e profilit', 'Zgjidh nga ku të marrësh foton', [
      { text: 'Bëj foto', onPress: () => pickAndUpload('camera') },
      { text: 'Galeria', onPress: () => pickAndUpload('gallery') },
      { text: 'Anulo', style: 'cancel' },
    ]);
  };

  return (
    <TouchableOpacity onPress={showMenu} disabled={uploading} activeOpacity={0.85} style={s.touch}>
      <LinearGradient
        colors={['rgba(225,6,0,0.0)', 'rgba(225,6,0,0.6)', 'rgba(225,6,0,0.85)']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={s.glow}
      >
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
      </LinearGradient>
      <View style={s.editBadge}>
        <Text style={s.editBadgeText}>📷</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  touch: { width: 140, height: 140 },
  glow: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 128, height: 128, borderRadius: 64, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initials: { fontSize: 42, fontWeight: '900', color: colors.text },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: colors.background },
  editBadgeText: { fontSize: 14 },
});
