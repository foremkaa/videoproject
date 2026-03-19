'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import VideoCard from '@/components/VideoCard';
import GiftModal from '@/components/GiftModal';
import type { User } from '@supabase/supabase-js';

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  coins: number;
  followers_count: number;
  following_count: number;
  total_gifts_received: number;
  created_at: string;
}

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

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<{ coins: number } | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [showGift, setShowGift] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editBio, setEditBio] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load profile
      const { data: p } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (p) {
        setProfile(p);
        setFollowersCount(p.followers_count);
        setEditBio(p.bio || '');
      }

      // Load videos
      const { data: vids } = await supabase
        .from('videos')
        .select('*')
        .eq('uploader_id', id)
        .order('created_at', { ascending: false });
      if (vids) setVideos(vids);

      if (user) {
        setIsOwner(user.id === id);
        const { data: mp } = await supabase.from('profiles').select('coins').eq('id', user.id).single();
        if (mp) setMyProfile(mp);

        // Check follow status
        if (user.id !== id) {
          const { data: fol } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', id);
          if (fol && fol.length > 0) setIsFollowing(true);
        }
      }
      setLoading(false);
    };
    init();
  }, [id]);

  const handleFollow = async () => {
    if (!user || isOwner) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false);
      setFollowersCount(c => c - 1);
      await supabase.from('profiles').update({ followers_count: followersCount - 1 }).eq('id', id);
      await supabase.from('profiles').update({
        following_count: (myProfile as { coins: number } & { following_count?: number })?.following_count
          ? ((myProfile as { coins: number } & { following_count?: number }).following_count as number) - 1 : 0
      }).eq('id', user.id);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
      setFollowersCount(c => c + 1);
      await supabase.from('profiles').update({ followers_count: followersCount + 1 }).eq('id', id);
    }
  };

  const handleGift = async (amount: number) => {
    if (!user || !myProfile || !profile) return;
    await supabase.from('profiles').update({ coins: myProfile.coins - amount }).eq('id', user.id);
    await supabase.from('profiles').update({ coins: profile.coins + amount, total_gifts_received: profile.total_gifts_received + amount }).eq('id', id);
    await supabase.from('coin_transactions').insert({
      from_user_id: user.id,
      to_user_id: id,
      amount,
      type: 'gift',
      note: `Gift to ${profile.username}`,
    });
    setMyProfile({ ...myProfile, coins: myProfile.coins - amount });
  };

  const handleSaveBio = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ bio: editBio }).eq('id', user.id);
    if (profile) setProfile({ ...profile, bio: editBio });
    setEditMode(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ height: '200px', background: 'var(--color-surface-lighter)', borderRadius: '16px', animation: 'pulse 1.5s infinite' }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>😕</div>
        <h2>Pengguna tidak ditemukan</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Profile Header */}
      <div className="animate-slide-up" style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(245, 158, 11, 0.05))',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {/* Avatar */}
          <div className="avatar" style={{
            width: '100px',
            height: '100px',
            fontSize: '40px',
            flexShrink: 0,
          }}>
            {profile.username[0]?.toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
              {profile.username}
            </h1>

            {editMode ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tulis bio kamu..."
                  style={{ flex: 1, fontSize: '13px' }}
                />
                <button onClick={handleSaveBio} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>Simpan</button>
                <button onClick={() => setEditMode(false)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>Batal</button>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '12px' }}>
                {profile.bio || 'Belum ada bio'}
                {isOwner && (
                  <button onClick={() => setEditMode(true)} style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary-light)',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}>✏️ Edit</button>
                )}
              </p>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{followersCount}</span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '13px' }}>Pengikut</span>
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{profile.following_count}</span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '13px' }}>Mengikuti</span>
              </div>
              <div>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{videos.length}</span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '13px' }}>Video</span>
              </div>
              {isOwner && (
                <div className="coin-badge" style={{ fontSize: '14px' }}>
                  🪙 {profile.coins.toLocaleString()} koin
                </div>
              )}
              {profile.total_gifts_received > 0 && (
                <div>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-accent)' }}>
                    🎁 {profile.total_gifts_received.toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '13px' }}>Gift diterima</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {user && !isOwner && (
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={handleFollow}
                className={isFollowing ? 'btn-secondary' : 'btn-primary'}
              >
                {isFollowing ? '✓ Mengikuti' : '+ Ikuti'}
              </button>
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
                }}
              >
                🎁 Gift
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Videos Grid */}
      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>
        🎬 Video ({videos.length})
      </h2>
      {videos.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {videos.map(v => (
            <VideoCard key={v.id} {...v} />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
          <p>Belum ada video yang diupload</p>
        </div>
      )}

      <GiftModal
        isOpen={showGift}
        onClose={() => setShowGift(false)}
        onGift={handleGift}
        recipientName={profile.username}
        userCoins={myProfile?.coins ?? 0}
      />
    </div>
  );
}
