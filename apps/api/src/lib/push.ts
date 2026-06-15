import { prisma } from './prisma.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Expo accepts at most 100 messages per request.
const EXPO_BATCH_SIZE = 100;

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  const valid = tokens.filter((t) => /^ExponentPushToken\[.+\]$/.test(t));
  console.log(`[push] "${title}" → ${valid.length}/${tokens.length} valid token(s)`);
  if (!valid.length) return;

  for (let i = 0; i < valid.length; i += EXPO_BATCH_SIZE) {
    await sendBatch(valid.slice(i, i + EXPO_BATCH_SIZE), title, body, data);
  }
}

async function sendBatch(
  valid: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
) {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(valid.map((to) => ({ to, title, body, sound: 'default', data }))),
    });

    if (!res.ok) {
      console.error('[push] Expo push request failed', res.status, await res.text().catch(() => ''));
      return;
    }

    const json = (await res.json().catch(() => null)) as { data?: Array<{ status?: string; details?: { error?: string } }> } | null;
    const tickets = json?.data;
    if (!Array.isArray(tickets)) return;

    // Drop tokens Expo says are no longer valid so they don't keep failing.
    const deadTokens = tickets
      .map((t, i) => (t?.details?.error === 'DeviceNotRegistered' ? valid[i] : null))
      .filter((t): t is string => t !== null);
    if (deadTokens.length) {
      await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } }).catch(() => {});
    }

    const okCount = tickets.filter((t) => t?.status === 'ok').length;
    console.log(`[push] "${title}" Expo accepted ${okCount}/${tickets.length} ticket(s)`);

    const errors = tickets.filter((t) => t?.status === 'error');
    if (errors.length) console.error('[push] Expo ticket errors', JSON.stringify(errors));
  } catch (err) {
    console.error('[push] Expo push send error', err);
  }
}
