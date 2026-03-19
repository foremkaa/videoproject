'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string; coins: number; avatar_url: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('username, coins, avatar_url')
          .eq('id', user.id)
          .single();
        if (data) setProfile(data);
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMenuOpen(false);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="glass" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      zIndex: 1000,
      gap: '16px',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #7c3aed, #f59e0b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
        }}>
          ▶
        </div>
        <span style={{
          fontSize: '20px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #a78bfa, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          TubeKu
        </span>
      </Link>

      {/* Search */}
      <form onSubmit={handleSearch} style={{
        flex: 1,
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          <input
            type="text"
            placeholder="Cari video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              borderRadius: 0,
              padding: '8px 16px',
              background: 'var(--color-surface-lighter)',
              fontSize: '14px',
            }}
          />
          <button type="submit" style={{
            padding: '8px 20px',
            background: 'var(--color-surface-lighter)',
            border: 'none',
            borderLeft: '1px solid var(--color-border)',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: '16px',
          }}>
            🔍
          </button>
        </div>
      </form>

      {/* Right Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        {user ? (
          <>
            <Link href="/upload" className="btn-primary" style={{
              padding: '8px 16px',
              fontSize: '13px',
              textDecoration: 'none',
            }}>
              ➕ Upload
            </Link>
            <Link href="/live" style={{
              textDecoration: 'none',
              padding: '8px 16px',
              fontSize: '13px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              borderRadius: '10px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              🔴 Live
            </Link>
            <div className="coin-badge">
              🪙 {profile?.coins?.toLocaleString() ?? 0}
            </div>

            {/* User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="avatar"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                {profile?.username?.[0]?.toUpperCase() || '?'}
              </button>

              {menuOpen && (
                <div className="animate-scale-in" style={{
                  position: 'absolute',
                  top: '50px',
                  right: 0,
                  background: 'var(--color-surface-light)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '200px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <div style={{
                    padding: '12px',
                    borderBottom: '1px solid var(--color-border)',
                    marginBottom: '8px',
                  }}>
                    <div style={{ fontWeight: 600 }}>{profile?.username}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      🪙 {profile?.coins?.toLocaleString()} koin
                    </div>
                  </div>
                  <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)} style={{
                    display: 'block',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: 'var(--color-text)',
                    fontSize: '14px',
                  }}>
                    👤 Profil Saya
                  </Link>
                  <button onClick={handleLogout} style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-danger)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}>
                    🚪 Keluar
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/login" className="btn-primary" style={{
            textDecoration: 'none',
            padding: '8px 20px',
          }}>
            Masuk
          </Link>
        )}
      </div>
    </nav>
  );
}
