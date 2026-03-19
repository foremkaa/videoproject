import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('live_rooms')
      .select('*')
      .eq('status', 'live')
      .order('viewer_count', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rooms: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { host_id, host_username, title } = body;

    if (!host_id || !title) {
      return NextResponse.json({ error: 'host_id and title required' }, { status: 400 });
    }

    const { data, error } = await supabase.from('live_rooms').insert({
      host_id,
      host_username: host_username || 'Anonymous',
      title,
      status: 'live',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // System message
    await supabase.from('live_chat').insert({
      room_id: data.id,
      user_id: host_id,
      username: 'System',
      message: `${host_username} memulai streaming! Selamat datang! 🎉`,
      type: 'system',
    });

    return NextResponse.json({ room: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { room_id, ...updates } = body;

    if (!room_id) {
      return NextResponse.json({ error: 'room_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('live_rooms')
      .update(updates)
      .eq('id', room_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ room: data });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
