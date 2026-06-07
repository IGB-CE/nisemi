import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import RNDateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useThemedStyles, type Theme } from '../lib/theme';

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
}

export default function DateTimeField({ value, onChange, mode = 'date', placeholder = 'Zgjidhni datën' }: Props) {
  const s = useThemedStyles(makeStyles);
  const [show, setShow] = useState(false);
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const fmt = (d: Date) => {
    const datePart = d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short', year: 'numeric' });
    if (mode === 'date') return datePart;
    const timePart = d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}  ${timePart}`;
  };

  const open = () => {
    setTempDate(value ?? new Date());
    setAndroidStep('date');
    setShow(true);
  };

  const handleAndroid = (_e: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (!selected) return;
    if (androidStep === 'date' && mode === 'datetime') {
      setTempDate(selected);
      setAndroidStep('time');
      setShow(true);
    } else if (androidStep === 'time') {
      const combined = new Date(tempDate);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(combined);
      setAndroidStep('date');
    } else {
      onChange(selected);
    }
  };

  const handleIOS = (_e: DateTimePickerEvent, selected?: Date) => {
    if (selected) setTempDate(selected);
  };

  return (
    <>
      <TouchableOpacity style={s.field} onPress={open}>
        <Text style={value ? s.value : s.placeholder}>{value ? fmt(value) : placeholder}</Text>
        <Text style={s.icon}>📅</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <RNDateTimePicker
          value={tempDate}
          mode={androidStep}
          display="default"
          onChange={handleAndroid}
          minimumDate={androidStep === 'date' ? new Date() : undefined}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={s.overlay}>
            <View style={s.sheet}>
              <View style={s.header}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={s.cancel}>Anulo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChange(tempDate);
                    setShow(false);
                  }}
                >
                  <Text style={s.confirm}>Konfirmo</Text>
                </TouchableOpacity>
              </View>
              <RNDateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                onChange={handleIOS}
                minimumDate={new Date()}
                locale="sq"
                style={s.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: { color: colors.text, fontSize: 15 },
  placeholder: { color: colors.subtle, fontSize: 15 },
  icon: { fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { color: colors.subtle, fontSize: 16 },
  confirm: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  iosPicker: { height: 220 },
});
