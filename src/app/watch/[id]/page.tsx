'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import GiftModal from '@/components/GiftModal';
import type { User } from '@supabase/supabase-js';

interface VideoData {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  uploader_id: string;
  uploader_name: string;
  views: number;
  likes_count: number;
  duration: number;
  created_at: string;
}

interface Comment {
  id: string;
  username: string;
  text: string;
  avatar_url: string;
  created_at: string;
}

export default function WatchPage() {
  const { id } = useParams();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; coins: number } | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: p } = await supabase.from('profiles').select('username, coins').eq('id', user.id).single();
        if (p) setProfile(p);
      }

      // Fetch video
      const { data: vid } = await supabase.from('videos').select('*').eq('id', id).single();
      if (vid) {
        setVideo(vid);
        setLikesCount(vid.likes_count);

        // Increment views
        await supabase.from('videos').update({ views: vid.views + 1 }).eq('id', id);

        // Check like status
        if (user) {
          const { data: likeData } = await supabase
            .from('video_likes').select('*').eq('video_id', id).eq('user_id', user.id);
          if (likeData && likeData.length > 0) setLiked(true);
        }
      }

      // Fetch comments
      const { data: cmts } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', id)
        .order('created_at', { ascending: false });
      if (cmts) setComments(cmts);

      // Related videos
      const { data: related } = await supabase
        .from('videos')
        .select('*')
        .neq('id', id)
        .order('views', { ascending: false })
        .limit(8);
      if (related) setRelatedVideos(related);

      setLoading(false);
    };
    init();

    // Subscribe to new comments
    const channel = supabase
      .channel(`comments-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `video_id=eq.${id}`,
      }, (payload) => {
        setComments(prev => [payload.new as Comment, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from('video_likes').delete().eq('video_id', id).eq('user_id', user.id);
      setLiked(false);
      setLikesCount(c => c - 1);
      await supabase.from('videos').update({ likes_count: likesCount - 1 }).eq('id', id);
    } else {
      await supabase.from('video_likes').insert({ video_id: id, user_id: user.id });
      setLiked(true);
      setLikesCount(c => c + 1);
      await supabase.from('videos').update({ likes_count: likesCount + 1 }).eq('id', id);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile) return;
    await supabase.from('comments').insert({
      video_id: id,
      user_id: user.id,
      username: profile.username,
      text: newComment.trim(),
    });
    setNewComment('');
  };

  const handleGift = async (amount: number) => {
    if (!user || !video || !profile) return;

    // Deduct coins
    await supabase.from('profiles').update({ coins: (profile.coins - amount) }).eq('id', user.id);
    // Add coins to uploader
    const { data: uploaderData } = await supabase.from('profiles').select('coins').eq('id', video.uploader_id).single();
    if (uploaderData) {
      await supabase.from('profiles').update({ coins: uploaderData.coins + amount }).eq('id', video.uploader_id);
    }
    // Transaction record
    await supabase.from('coin_transactions').insert({
      from_user_id: user.id,
      to_user_id: video.uploader_id,
      amount,
      type: 'gift',
      note: `Gift for video: ${video.title}`,
    });

    setProfile({ ...profile, coins: profile.coins - amount });
  };

  if (loading) {
    return (
      <div style={{ padding: '24px 20px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ height: '500px', background: 'var(--color-surface-lighter)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (!video) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2>Video tidak ditemukan</h2>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px 20px',
      display: 'grid',
      gridTemplateColumns: '1fr 360px',
      gap: '24px',
    }}>
      {/* Main Content */}
      <div>
        {/* Video Player */}
        <div style={{
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#000',
          marginBottom: '16px',
        }}>
          <video
            src={video.video_url}
            controls
            autoPlay
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'contain' }}
            poster={video.thumbnail_url || undefined}
          />
        </div>

        {/* Video Info */}
        <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', lineHeight: 1.3 }}>
          {video.title}
        </h1>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--color-border)',
        }}>
          {/* Uploader */}
          <Link href={`/profile/${video.uploader_id}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: 'inherit',
          }}>
            <div className="avatar">
              {video.uploader_name[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{video.uploader_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {video.views.toLocaleString()} views
              </div>
            </div>
          </Link>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={handleLike} className={liked ? 'btn-primary' : 'btn-secondary'} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {liked ? '❤️' : '🤍'} {likesCount}
            </button>
            {user && video.uploader_id !== user.id && (
              <button onClick={() => setShowGift(true)} style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}>
                🎁 Gift
              </button>
            )}
          </div>
        </div>

        {/* Description */}
        {video.description && (
          <div style={{
            padding: '16px',
            background: 'var(--color-surface-card)',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
          }}>
            {video.description}
          </div>
        )}

        {/* Comments Section */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            💬 Komentar ({comments.length})
          </h3>

          {user ? (
            <form onSubmit={handleComment} style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div className="avatar" style={{ flexShrink: 0 }}>
                {profile?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tulis komentar..."
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Kirim
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div style={{
              padding: '16px',
              background: 'var(--color-surface-card)',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '14px',
              color: 'var(--color-text-muted)',
            }}>
              <Link href="/login" style={{ color: 'var(--color-primary-light)' }}>Login</Link> untuk berkomentar
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {comments.map(comment => (
              <div key={comment.id} className="animate-fade-in" style={{
                display: 'flex',
                gap: '12px',
              }}>
                <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                  {comment.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{comment.username}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {new Date(comment.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', marginTop: '4px', lineHeight: 1.4 }}>{comment.text}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                Belum ada komentar. Jadilah yang pertama! 💬
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - Related Videos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Video Lainnya</h3>
        {relatedVideos.map(rv => (
          <Link key={rv.id} href={`/watch/${rv.id}`} style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            gap: '10px',
            padding: '8px',
            borderRadius: '10px',
            transition: 'background 0.2s',
          }}>
            <div style={{
              width: '160px',
              height: '90px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--color-surface-lighter)',
            }}>
              {rv.thumbnail_url ? (
                <img src={rv.thumbnail_url} alt={rv.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '24px', opacity: 0.3 }}>🎬</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
                marginBottom: '4px',
              }}>
                {rv.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {rv.uploader_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {rv.views.toLocaleString()} views
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        onGift={handleGift}
        recipientName={video.uploader_name}
        userCoins={profile?.coins ?? 0}
      />
    </div>
  );
}
