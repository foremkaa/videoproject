import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { video_id, user_id, action } = body;

    if (!video_id || !user_id) {
      return NextResponse.json({ error: 'video_id and user_id required' }, { status: 400 });
    }

    if (action === 'unlike') {
      await supabase.from('video_likes').delete().eq('video_id', video_id).eq('user_id', user_id);
      // Decrement likes_count
      const { data: vid } = await supabase.from('videos').select('likes_count').eq('id', video_id).single();
      if (vid) {
        await supabase.from('videos').update({ likes_count: Math.max(0, vid.likes_count - 1) }).eq('id', video_id);
      }
      return NextResponse.json({ liked: false });
    }

    // Like
    const { error } = await supabase.from('video_likes').insert({ video_id, user_id });
    if (error && error.code === '23505') {
      return NextResponse.json({ liked: true, message: 'Already liked' });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Increment likes_count
    const { data: vid } = await supabase.from('videos').select('likes_count').eq('id', video_id).single();
    if (vid) {
      await supabase.from('videos').update({ likes_count: vid.likes_count + 1 }).eq('id', video_id);
    }

    return NextResponse.json({ liked: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
