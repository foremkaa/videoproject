import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { follower_id, following_id, action } = body;

    if (!follower_id || !following_id) {
      return NextResponse.json({ error: 'follower_id and following_id required' }, { status: 400 });
    }

    if (follower_id === following_id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    if (action === 'unfollow') {
      await supabase.from('follows').delete().eq('follower_id', follower_id).eq('following_id', following_id);

      // Update counts
      const { data: targetProfile } = await supabase.from('profiles').select('followers_count').eq('id', following_id).single();
      if (targetProfile) {
        await supabase.from('profiles').update({ followers_count: Math.max(0, targetProfile.followers_count - 1) }).eq('id', following_id);
      }
      const { data: myProfile } = await supabase.from('profiles').select('following_count').eq('id', follower_id).single();
      if (myProfile) {
        await supabase.from('profiles').update({ following_count: Math.max(0, myProfile.following_count - 1) }).eq('id', follower_id);
      }

      return NextResponse.json({ following: false });
    }

    // Follow
    const { error } = await supabase.from('follows').insert({ follower_id, following_id });
    if (error && error.code === '23505') {
      return NextResponse.json({ following: true, message: 'Already following' });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Update counts
    const { data: targetProfile } = await supabase.from('profiles').select('followers_count').eq('id', following_id).single();
    if (targetProfile) {
      await supabase.from('profiles').update({ followers_count: targetProfile.followers_count + 1 }).eq('id', following_id);
    }
    const { data: myProfile } = await supabase.from('profiles').select('following_count').eq('id', follower_id).single();
    if (myProfile) {
      await supabase.from('profiles').update({ following_count: myProfile.following_count + 1 }).eq('id', follower_id);
    }

    return NextResponse.json({ following: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
