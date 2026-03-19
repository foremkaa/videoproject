import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { from_user_id, to_user_id, amount, note } = body;

    if (!from_user_id || !to_user_id || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid gift parameters' }, { status: 400 });
    }

    // Check sender balance
    const { data: sender } = await supabase.from('profiles').select('coins').eq('id', from_user_id).single();
    if (!sender || sender.coins < amount) {
      return NextResponse.json({ error: 'Koin tidak cukup' }, { status: 400 });
    }

    // Deduct from sender
    await supabase.from('profiles').update({ coins: sender.coins - amount }).eq('id', from_user_id);

    // Add to receiver
    const { data: receiver } = await supabase.from('profiles').select('coins, total_gifts_received').eq('id', to_user_id).single();
    if (receiver) {
      await supabase.from('profiles').update({
        coins: receiver.coins + amount,
        total_gifts_received: receiver.total_gifts_received + amount,
      }).eq('id', to_user_id);
    }

    // Create transaction record
    const { data: transaction, error } = await supabase.from('coin_transactions').insert({
      from_user_id,
      to_user_id,
      amount,
      type: 'gift',
      note: note || '',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      transaction,
      remaining_coins: sender.coins - amount,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
