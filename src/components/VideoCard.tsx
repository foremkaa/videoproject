'use client';
import Link from 'next/link';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail_url: string;
  uploader_name: string;
  uploader_id: string;
  views: number;
  created_at: string;
  duration?: number;
}

function formatViews(views: number): string {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views.toString();
}

function formatTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Baru saja';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' menit lalu';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' jam lalu';
  if (seconds < 2592000) return Math.floor(seconds / 86400) + ' hari lalu';
  return Math.floor(seconds / 2592000) + ' bulan lalu';
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VideoCard({ id, title, thumbnail_url, uploader_name, uploader_id, views, created_at, duration }: VideoCardProps) {
  return (
    <Link href={`/watch/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card animate-fade-in" style={{ cursor: 'pointer' }}>
        {/* Thumbnail */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          background: 'linear-gradient(135deg, var(--color-surface-lighter), var(--color-surface))',
          overflow: 'hidden',
        }}>
          {thumbnail_url ? (
            <img
              src={thumbnail_url}
              alt={title}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              opacity: 0.3,
            }}>
              🎬
            </div>
          )}
          {duration ? (
            <span style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {formatDuration(duration)}
            </span>
          ) : null}
        </div>

        {/* Info */}
        <div style={{ padding: '12px', display: 'flex', gap: '12px' }}>
          <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px', flexShrink: 0 }}>
            {uploader_name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: '4px',
            }}>
              {title}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              <span>{uploader_name}</span>
              <span style={{ margin: '0 4px' }}>•</span>
              <span>{formatViews(views)} views</span>
              <span style={{ margin: '0 4px' }}>•</span>
              <span>{formatTimeAgo(created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
