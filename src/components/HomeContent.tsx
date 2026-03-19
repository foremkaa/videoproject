'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import VideoCard from '@/components/VideoCard';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  uploader_name: string;
  uploader_id: string;
  views: number;
  created_at: string;
  duration?: number;
}

interface LiveRoom {
  id: string;
  host_username: string;
  host_avatar: string;
  title: string;
  thumbnail: string;
  viewer_count: number;
}

export default function HomeContent() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const search = searchParams.get('search');
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch live rooms
      const { data: rooms } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('status', 'live')
        .order('viewer_count', { ascending: false });
      if (rooms) setLiveRooms(rooms);

      // Fetch videos
      let query = supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(24);

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      const { data } = await query;
      if (data) setVideos(data);
      setLoading(false);
    };
    fetchData();
  }, [search]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Live Now Section */}
      {liveRooms.length > 0 && (
        <section style={{ marginBottom: '40px' }} className="animate-fade-in">
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span className="badge-live">🔴 LIVE</span>
            Sedang Streaming
          </h2>
          <div style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}>
            {liveRooms.map(room => (
              <Link
                key={room.id}
                href={`/live/${room.id}`}
                style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
              >
                <div className="card" style={{
                  width: '280px',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '160px',
                    background: 'linear-gradient(135deg, #7c3aed33, #ef444433)',
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
                      <span style={{ fontSize: '48px' }}>📺</span>
                    )}
                    <span className="badge-live" style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                    }}>LIVE</span>
                    <span style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      👁 {room.viewer_count}
                    </span>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      {room.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {room.host_username}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search Result Header */}
      {search && (
        <div style={{
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>
            Hasil pencarian: &quot;{search}&quot;
          </h2>
          <Link href="/" style={{
            fontSize: '13px',
            color: 'var(--color-primary-light)',
          }}>
            ✕ Hapus
          </Link>
        </div>
      )}

      {/* Video Grid */}
      <section>
        {!search && (
          <h2 style={{
            fontSize: '20px',
            fontWeight: 700,
            marginBottom: '16px',
          }}>
            🔥 Video Terbaru
          </h2>
        )}

        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden' }}>
                <div style={{
                  paddingTop: '56.25%',
                  background: 'var(--color-surface-lighter)',
                  animation: 'pulse 1.5s infinite',
                }} />
                <div style={{ padding: '12px' }}>
                  <div style={{
                    height: '14px',
                    width: '80%',
                    background: 'var(--color-surface-lighter)',
                    borderRadius: '4px',
                    marginBottom: '8px',
                  }} />
                  <div style={{
                    height: '12px',
                    width: '50%',
                    background: 'var(--color-surface-lighter)',
                    borderRadius: '4px',
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📹</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              {search ? 'Tidak ada video ditemukan' : 'Belum ada video'}
            </h3>
            <p style={{ fontSize: '14px' }}>
              {search ? 'Coba kata kunci lain' : 'Jadilah yang pertama mengupload video!'}
            </p>
            {!search && (
              <Link href="/upload" className="btn-primary" style={{
                marginTop: '16px',
                textDecoration: 'none',
                display: 'inline-flex',
              }}>
                ➕ Upload Video
              </Link>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {videos.map(video => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
