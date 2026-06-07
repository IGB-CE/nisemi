import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { useThemedStyles, type Theme } from './theme';

export interface DialogButton {
  label: string;
  onPress?: () => void | Promise<void>;
  variant?: 'primary' | 'destructive' | 'cancel';
}

interface DialogConfig {
  title: string;
  message?: string;
  buttons?: DialogButton[];
}

interface DialogContextValue {
  show: (config: DialogConfig) => Promise<void>;
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (title: string, message?: string, confirmLabel?: string, destructive?: boolean) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const s = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [resolver, setResolver] = useState<(() => void) | null>(null);

  const close = useCallback(() => {
    setVisible(false);
    resolver?.();
    setResolver(null);
    setTimeout(() => setConfig(null), 200);
  }, [resolver]);

  const show = useCallback(async (cfg: DialogConfig) => {
    setConfig(cfg);
    setVisible(true);
    await new Promise<void>((resolve) => setResolver(() => resolve));
  }, []);

  const alert = useCallback(
    async (title: string, message?: string) => {
      await show({ title, message, buttons: [{ label: 'OK', variant: 'primary' }] });
    },
    [show],
  );

  const confirm = useCallback(
    async (title: string, message?: string, confirmLabel = 'Po', destructive = false) => {
      let result = false;
      await show({
        title,
        message,
        buttons: [
          { label: 'Anulo', variant: 'cancel' },
          {
            label: confirmLabel,
            variant: destructive ? 'destructive' : 'primary',
            onPress: () => {
              result = true;
            },
          },
        ],
      });
      return result;
    },
    [show],
  );

  const handleButton = async (btn: DialogButton) => {
    try {
      await btn.onPress?.();
    } catch {}
    close();
  };

  const buttons = config?.buttons ?? [{ label: 'OK', variant: 'primary' as const }];
  const vertical = buttons.length > 2;

  return (
    <DialogContext.Provider value={{ show, alert, confirm }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <View style={s.card}>
                <Text style={s.title}>{config?.title}</Text>
                {config?.message && <Text style={s.message}>{config.message}</Text>}
                <View style={[s.btnRow, vertical && s.btnCol]}>
                  {buttons.map((b, i) => {
                    const isPrimary = b.variant === 'primary';
                    const isDestructive = b.variant === 'destructive';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          s.btn,
                          !vertical && { flex: 1 },
                          vertical && { width: '100%' },
                          isPrimary && s.btnPrimary,
                          isDestructive && s.btnDestructive,
                          !isPrimary && !isDestructive && s.btnCancel,
                        ]}
                        onPress={() => handleButton(b)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            s.btnText,
                            isPrimary && s.btnTextPrimary,
                            isDestructive && s.btnTextDestructive,
                            !isPrimary && !isDestructive && s.btnTextCancel,
                          ]}
                        >
                          {b.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </DialogContext.Provider>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { ...typography.h2, fontSize: 19 },
  message: { ...typography.bodyDim, marginTop: 8, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btnCol: { flexDirection: 'column', gap: 8 },
  btn: { paddingVertical: 14, borderRadius: 999, alignItems: 'center', borderWidth: 1 },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnDestructive: { backgroundColor: colors.danger, borderColor: colors.danger },
  btnCancel: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  btnTextPrimary: { color: '#fff' },
  btnTextDestructive: { color: '#fff' },
  btnTextCancel: { color: colors.textDim },
});
