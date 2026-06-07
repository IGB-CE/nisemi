import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useColors, useThemedStyles, type Theme } from '../../../lib/theme';
import { useDialog } from '../../../lib/dialog';
import { setActiveChat, clearActiveChat } from '../../../lib/notifications';
import { blocks as blocksApi } from '../../../lib/blocks';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

const POLL_MS = 3000;

export default function Chat() {
  const { tripId, userId } = useLocalSearchParams<{ tripId: string; userId: string }>();
  const { token, user } = useAuth();
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const dialog = useDialog();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<{ firstName: string; lastName: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const blockUser = async () => {
    if (!token || !userId) return;
    const name = otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'këtë përdorues';
    const ok = await dialog.confirm(
      `Bllokoni ${name}?`,
      'Nuk do të merrni më mesazhe prej tij. Mund ta zhblloko në çdo kohë nga profili.',
      'Bllokoj',
      true,
    );
    if (!ok) return;
    try {
      await blocksApi.create(userId as string, token);
      await dialog.alert('U bllokua', `${name} është bllokuar.`);
    } catch (e: any) {
      await dialog.alert('Gabim', e.message);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.get<Message[]>(`/api/v1/messages/trip/${tripId}/with/${userId}`, token ?? undefined);
      setMessages((prev) => {
        if (prev.length === data.length && prev[prev.length - 1]?.id === data[data.length - 1]?.id) return prev;
        return data;
      });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, token]);

  useEffect(() => {
    fetchMessages();
    const i = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(i);
  }, [fetchMessages]);

  // While this chat is open, suppress push banners for messages from this person
  // and refresh immediately when one arrives.
  useFocusEffect(
    useCallback(() => {
      if (tripId && userId) setActiveChat(tripId, userId, fetchMessages);
      return () => clearActiveChat();
    }, [tripId, userId, fetchMessages]),
  );

  useEffect(() => {
    if (otherUser) return;
    api
      .get<any>(`/api/v1/users/${userId}`, token ?? undefined)
      .then((u) => setOtherUser({ firstName: u.firstName, lastName: u.lastName }))
      .catch(() => {});
  }, [userId, token, otherUser]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const m = await api.post<Message>(
        '/api/v1/messages',
        { tripId, receiverId: userId, content },
        token ?? undefined,
      );
      setMessages((prev) => [...prev, m]);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Bisedë'}</Text>
        <TouchableOpacity onPress={blockUser} style={s.headerAction} hitSlop={8}>
          <Text style={s.headerActionText}>🚫</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.list}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyText}>Filloni bisedën</Text>
              </View>
            ) : (
              messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <View key={m.id} style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                    <Text style={[s.bubbleText, mine && s.bubbleTextMine]}>{m.content}</Text>
                    <Text style={[s.bubbleTime, mine && s.bubbleTimeMine]}>
                      {new Date(m.createdAt).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={[s.inputBar, { paddingBottom: 10 + insets.bottom }]}>
          <TextInput
            style={s.input}
            placeholder="Shkruaj një mesazh..."
            placeholderTextColor={colors.subtle}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={s.sendBtnText}>{sending ? '...' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.text },
  headerAction: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerActionText: { fontSize: 18 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: colors.subtle, fontSize: 15 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12, marginBottom: 2 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: 15 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: colors.subtle, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
