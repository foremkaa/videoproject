'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface LiveRoom {
  id: string;
  host_id: string;
  host_username: string;
  host_avatar: string;
  title: string;
  thumbnail: string;
  status: string;
  viewer_count: number;
  total_gifts: number;
  started_at: string;
}

export default function LiveLobbyPage() {
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        if (data) setProfile(data);
      }

      const { data: liveRooms } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });
      if (liveRooms) setRooms(liveRooms);
      setLoading(false);
    };
    init();

    // Realtime updates
    const channel = supabase
      .channel('live-rooms-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_rooms' }, () => {
        // Re-fetch rooms on any change
        supabase
          .from('live_rooms')
          .select('*')
          .eq('status', 'live')
          .order('viewer_count', { ascending: false })
          .then(({ data }) => {
            if (data) setRooms(data);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreateRoom = async () => {
    if (!user || !profile || !streamTitle.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from('live_rooms').insert({
      host_id: user.id,
      host_username: profile.username,
      title: streamTitle.trim(),
      status: 'live',
    }).select().single();

    if (data && !error) {
      router.push(`/live/${data.id}`);
    }
    setCreating(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            🔴 Live Streaming
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Tonton streamer favorit atau mulai streaming sendiri
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            📡 Go Live
          </button>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <div className="animate-slide-up" style={{
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            🎥 Mulai Streaming
          </h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Judul streaming kamu..."
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCreateRoom}
              className="btn-primary"
              disabled={!streamTitle.trim() || creating}
            >
              {creating ? '⏳ ...' : '🚀 Mulai'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Live Rooms Grid */}
      {loading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ height: '280px' }}>
              <div style={{ height: '180px', background: 'var(--color-surface-lighter)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ))}
        </div>
      ) : rooms.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {rooms.map(room => (
            <Link
              key={room.id}
              href={`/live/${room.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="card animate-fade-in" style={{ cursor: 'pointer' }}>
                <div style={{
                  height: '180px',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(239, 68, 68, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {room.thumbnail ? (
                    <img src={room.thumbnail} alt={room.title} style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                    }} />
                  ) : (
                    <span style={{ fontSize: '64px' }}>📺</span>
                  )}
                  <span className="badge-live" style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                  }}>
                    🔴 LIVE
                  </span>
                  <span style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0,0,0,0.7)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    👁 {room.viewer_count}
                  </span>
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}>
                    <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                      {room.host_username[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {room.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {room.host_username}
                        {room.total_gifts > 0 && (
                          <span style={{ marginLeft: '8px', color: 'var(--color-accent)' }}>
                            🎁 {room.total_gifts}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📡</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
            Belum ada yang streaming
          </h3>
          <p style={{ fontSize: '14px' }}>
            Jadilah yang pertama Go Live!
          </p>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                marginTop: '16px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              📡 Go Live Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
