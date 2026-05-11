const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function clientId() { return process.env.GOOGLE_CLIENT_ID! }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET! }
function redirectUri() { return process.env.GOOGLE_REDIRECT_URI! }

export function getAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'Token exchange failed');
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'Token refresh failed');
  return data.access_token as string;
}

async function calendarFetch(
  method: string,
  path: string,
  accessToken: string,
  refreshToken: string,
  body?: object
): Promise<any> {
  const doFetch = async (token: string) => {
    return fetch(`${CALENDAR_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch(accessToken);

  // 토큰 만료 시 갱신 후 재시도
  if (res.status === 401) {
    const newToken = await refreshAccessToken(refreshToken);
    res = await doFetch(newToken);
  }

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google API error ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  todo: { title: string; description?: string; due_date?: string | null; start_time?: string | null; end_time?: string | null }
): Promise<string | null> {
  const data = await calendarFetch('POST', '/calendars/primary/events', accessToken, refreshToken, buildEvent(todo));
  return data?.id ?? null;
}

export async function updateCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string,
  todo: { title: string; description?: string; due_date?: string | null; start_time?: string | null; end_time?: string | null; completed?: boolean }
): Promise<void> {
  await calendarFetch('PUT', `/calendars/primary/events/${eventId}`, accessToken, refreshToken, {
    ...buildEvent(todo),
    ...(todo.completed ? { colorId: '8' } : {}),
  });
}

export async function deleteCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventId: string
): Promise<void> {
  await calendarFetch('DELETE', `/calendars/primary/events/${eventId}`, accessToken, refreshToken);
}

export async function listCalendarEvents(
  accessToken: string,
  refreshToken: string,
  timeMin: string,
  timeMax: string
): Promise<any[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });
  const data = await calendarFetch('GET', `/calendars/primary/events?${params}`, accessToken, refreshToken);
  return data?.items ?? [];
}

function buildEvent(todo: {
  title: string;
  description?: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  const event: Record<string, unknown> = {
    summary: todo.title,
    description: todo.description || '',
  };

  if (todo.due_date) {
    if (todo.start_time) {
      const startDT = `${todo.due_date}T${todo.start_time}:00`;
      const endDT = todo.end_time
        ? `${todo.due_date}T${todo.end_time}:00`
        : new Date(new Date(startDT).getTime() + 3600000).toISOString().slice(0, 19);
      event.start = { dateTime: startDT, timeZone: 'Asia/Seoul' };
      event.end = { dateTime: endDT, timeZone: 'Asia/Seoul' };
    } else {
      event.start = { date: todo.due_date };
      event.end = { date: todo.due_date };
    }
  } else {
    const today = new Date().toISOString().slice(0, 10);
    event.start = { date: today };
    event.end = { date: today };
  }

  return event;
}
