import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography } from '../lib/colors';
import {
  autocompletePlaces,
  newSessionToken,
  placeDetails,
  type PlaceDetail,
  type PlacePrediction,
} from '../lib/places';

interface Props {
  value: PlaceDetail | null;
  onChange: (value: PlaceDetail | null) => void;
  placeholder: string;
  token: string | undefined;
}

export default function PlacesAutocomplete({ value, onChange, placeholder, token }: Props) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const sessionTokenRef = useRef(newSessionToken());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focused) return;
    if (query.length < 2) {
      setPredictions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await autocompletePlaces(query, sessionTokenRef.current, token);
        setPredictions(results);
      } catch {
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, focused, token]);

  const select = async (p: PlacePrediction) => {
    setLoading(true);
    try {
      const detail = await placeDetails(p.place_id, sessionTokenRef.current, token);
      onChange(detail);
      setQuery(detail.label);
      setPredictions([]);
      setFocused(false);
      sessionTokenRef.current = newSessionToken();
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setQuery('');
    setPredictions([]);
    onChange(null);
    sessionTokenRef.current = newSessionToken();
  };

  return (
    <View>
      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            if (value && t !== value.label) onChange(null);
          }}
          onFocus={() => setFocused(true)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.subtle} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={clear} hitSlop={10}>
            <Text style={s.clear}>×</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {focused && predictions.length > 0 && (
        <View style={s.dropdown}>
          {predictions.map((p) => (
            <TouchableOpacity key={p.place_id} style={s.row} onPress={() => select(p)} activeOpacity={0.7}>
              <Text style={s.rowMain} numberOfLines={1}>
                {p.structured_formatting?.main_text ?? p.description}
              </Text>
              {p.structured_formatting?.secondary_text && (
                <Text style={s.rowSecondary} numberOfLines={1}>
                  {p.structured_formatting.secondary_text}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  inputWrap: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
  clear: { color: colors.subtle, fontSize: 22, fontWeight: '300', paddingHorizontal: 4 },
  dropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowMain: { ...typography.body, fontWeight: '600' },
  rowSecondary: { ...typography.caption, marginTop: 2 },
});
