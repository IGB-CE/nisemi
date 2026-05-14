import { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, type Region } from 'react-native-maps';
import { colors } from '../lib/colors';

export interface City {
  id: string;
  name: string;
  lat?: number | null;
  lng?: number | null;
}

interface Props {
  visible: boolean;
  cities: City[];
  onSelect: (city: City) => void;
  onClose: () => void;
  title?: string;
}

const ALBANIA: Region = {
  latitude: 41.15,
  longitude: 20.17,
  latitudeDelta: 3.6,
  longitudeDelta: 3.0,
};

export default function CityMapPicker({ visible, cities, onSelect, onClose, title }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<City | null>(null);
  const [search, setSearch] = useState('');

  const mapped = cities.filter((c) => c.lat && c.lng);
  const visible_ = search.trim() ? mapped.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : mapped;

  const confirm = () => {
    if (!selected) return;
    onSelect(selected);
    setSelected(null);
    setSearch('');
    onClose();
  };

  const close = () => {
    setSelected(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={close} style={s.closeBtn}>
            <Text style={s.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.title}>{title ?? 'Zgjidhni qytetin'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.searchWrap}>
          <TextInput
            style={s.search}
            placeholder="Kërko qytet..."
            placeholderTextColor={colors.subtle}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <MapView style={s.map} initialRegion={ALBANIA} mapType="standard">
          {visible_.map((city) => (
            <Marker
              key={city.id}
              coordinate={{ latitude: city.lat!, longitude: city.lng! }}
              title={city.name}
              pinColor={selected?.id === city.id ? '#DC2626' : '#FF4444'}
              onPress={() => setSelected(city)}
            />
          ))}
        </MapView>

        <View style={[s.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
          {selected ? (
            <>
              <Text style={s.selectedText}>📍 {selected.name}</Text>
              <TouchableOpacity style={s.confirmBtn} onPress={confirm}>
                <Text style={s.confirmBtnText}>Konfirmo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.hint}>Trego një qytet në hartë për ta zgjedhur</Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  map: { flex: 1 },
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  hint: { color: colors.subtle, fontSize: 14, flex: 1, textAlign: 'center' },
  selectedText: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
