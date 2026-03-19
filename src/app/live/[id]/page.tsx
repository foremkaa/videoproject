'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import LiveChat from '@/components/LiveChat';
import GiftModal from '@/components/GiftModal';
import type { User } from '@supabase/supabase-js';

interface LiveRoom {
  id: string;
  host_id: string;
  host_username: string;
  title: string;
  status: string;
  viewer_count: number;
  total_gifts: number;
  started_at: string;
}

export default function LiveRoomPage() {
  const { id } = useParams();
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; coins: number } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: p } = await supabase.from('profiles').select('username, coins').eq('id', user.id).single();
        if (p) setProfile(p);
      }

      const { data: roomData } = await supabase.from('live_rooms').select('*').eq('id', id).single();
      if (roomData) {
        setRoom(roomData);
        setViewerCount(roomData.viewer_count);
        if (user) setIsHost(user.id === roomData.host_id);

        // Increment viewer count if not host
        if (user?.id !== roomData.host_id) {
          await supabase.from('live_rooms').update({ viewer_count: roomData.viewer_count + 1 }).eq('id', id);
          setViewerCount(roomData.viewer_count + 1);
        }
      }
      setLoading(false);
    };
    init();

    // Realtime room updates
    const channel = supabase
      .channel(`live-room-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_rooms',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as LiveRoom;
        setRoom(updated);
        setViewerCount(updated.viewer_count);
        if (updated.status === 'ended') {
          // Room ended
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Decrement viewer on leave
      if (!isHost) {
        supabase.from('live_rooms').update({ viewer_count: Math.max(0, viewerCount - 1) }).eq('id', id);
      }
    };
  }, [id]);

  const handleEndStream = useCallback(async () => {
    await supabase.from('live_rooms').update({
      status: 'ended',
      ended_at: new Date().toISOString(),
    }).eq('id', id);

    // Post system message
    await supabase.from('live_chat').insert({
      room_id: id,
      user_id: user?.id,
      username: 'System',
      message: 'Streaming telah berakhir. Terima kasih sudah menonton! 🎉',
      type: 'system',
    });

    router.push('/live');
  }, [id, user, router, supabase]);

  const handleGift = async (amount: number) => {
    if (!user || !room || !profile) return;

    // Deduct from sender
    await supabase.from('profiles').update({ coins: profile.coins - amount }).eq('id', user.id);
    // Add to host
    const { data: hostData } = await supabase.from('profiles').select('coins').eq('id', room.host_id).single();
    if (hostData) {
      await supabase.from('profiles').update({ coins: hostData.coins + amount }).eq('id', room.host_id);
    }
    // Update room gift count
    await supabase.from('live_rooms').update({ total_gifts: room.total_gifts + amount }).eq('id', id);
    // Transaction
    await supabase.from('coin_transactions').insert({
      from_user_id: user.id,
      to_user_id: room.host_id,
      amount,
      type: 'gift',
      note: `Live gift in: ${room.title}`,
    });
    // Chat message
    await supabase.from('live_chat').insert({
      room_id: id,
      user_id: user.id,
      username: profile.username,
      message: `Mengirim ${amount} koin`,
      type: 'gift',
      gift_amount: amount,
    });

    setProfile({ ...profile, coins: profile.coins - amount });
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ height: '500px', background: 'var(--color-surface-lighter)', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2>Live room tidak ditemukan</h2>
      </div>
    );
  }

  const isEnded = room.status === 'ended';

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '20px',
      height: 'calc(100vh - 88px)',
    }}>
      {/* Stream Area */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Video/Stream Placeholder */}
        <div style={{
          flex: 1,
          borderRadius: '16px',
          background: isEnded
            ? 'linear-gradient(135deg, #1a1a24, #0f0f14)'
            : 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(239, 68, 68, 0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          minHeight: '400px',
        }}>
          {isEnded ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📴</div>
              <h2 style={{ fontWeight: 700 }}>Streaming Berakhir</h2>
              <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
                Terima kasih sudah menonton!
              </p>
              <button onClick={() => router.push('/live')} className="btn-primary" style={{ marginTop: '16px' }}>
                ← Kembali ke Lobby
              </button>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '80px', marginBottom: '16px', animation: 'pulse-live 2s infinite' }}>📡</div>
                <h2 style={{ fontWeight: 700, fontSize: '20px' }}>
                  {isHost ? 'Kamu Sedang Live!' : 'Sedang Streaming...'}
                </h2>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '14px' }}>
                  {isHost ? 'Penonton bisa melihat streaming kamu' : 'Menonton streaming langsung'}
                </p>
              </div>

              {/* Live badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                display: 'flex',
                gap: '10px',
              }}>
                <span className="badge-live" style={{ fontSize: '13px', padding: '4px 12px' }}>
                  🔴 LIVE
                </span>
                <span style={{
                  background: 'rgba(0,0,0,0.6)',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  👁 {viewerCount}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Stream Info */}
        <div style={{
          padding: '16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar">
              {room.host_username[0]?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700 }}>{room.title}</h2>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {room.host_username}
                {room.total_gifts > 0 && (
                  <span style={{ marginLeft: '10px', color: 'var(--color-accent)' }}>
                    🎁 {room.total_gifts.toLocaleString()} koin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {isHost ? (
              <button onClick={handleEndStream} className="btn-danger">
                ⏹ Akhiri Live
              </button>
            ) : (
              !isEnded && user && (
                <button
                  onClick={() => setShowGift(true)}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🎁 Gift
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Live Chat Sidebar */}
      <LiveChat roomId={id as string} />

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        onGift={handleGift}
        recipientName={room.host_username}
        userCoins={profile?.coins ?? 0}
      />
    </div>
  );
}
