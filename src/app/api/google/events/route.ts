import { NextRequest, NextResponse } from 'next/server';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';
import { getUserIdFromToken, googleTokensAPI } from '@/lib/supabase-admin';

async function resolveUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return getUserIdFromToken(token);
}

export async function POST(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { todo } = await request.json();
  const tokens = await googleTokensAPI.get(userId);
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  try {
    const eventId = await createCalendarEvent(tokens.access_token, tokens.refresh_token, todo);
    return NextResponse.json({ eventId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { eventId, todo } = await request.json();
  const tokens = await googleTokensAPI.get(userId);
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  try {
    await updateCalendarEvent(tokens.access_token, tokens.refresh_token, eventId, todo);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveUser(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const eventId = request.nextUrl.searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

  const tokens = await googleTokensAPI.get(userId);
  if (!tokens) return NextResponse.json({ error: 'Not connected' }, { status: 401 });

  try {
    await deleteCalendarEvent(tokens.access_token, tokens.refresh_token, eventId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
