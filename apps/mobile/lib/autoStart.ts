import * as SecureStore from 'expo-secure-store';

// The driver's global default for "auto-start at departure", used to pre-fill
// the per-trip toggle on the publish screen. Stored on the device — the actual
// behaviour is driven by each trip's own `autoStart` flag from the server.
const KEY = 'auto_start_default';

export async function getAutoStartDefault(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function setAutoStartDefault(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, value ? '1' : '0');
  } catch {
    // Non-critical preference — ignore storage failures.
  }
}
