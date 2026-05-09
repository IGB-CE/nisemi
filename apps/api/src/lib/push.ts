const EXPO_PUSH_URL = 'https://exp.host/push/send';

export async function sendPushNotifications(tokens: string[], title: string, body: string) {
  const valid = tokens.filter(t => /^ExponentPushToken\[.+\]$/.test(t));
  if (!valid.length) return;

  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(valid.map(to => ({ to, title, body, sound: 'default' }))),
  }).catch(() => {}); // push failures are non-critical
}
