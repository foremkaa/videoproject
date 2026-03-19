'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  type: 'chat' | 'gift' | 'system';
  gift_amount?: number;
  avatar_url?: string;
  created_at: string;
}

interface LiveChatProps {
  roomId: string;
}

export default function LiveChat({ roomId }: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('profiles').select('username').eq('id', user.id).single();
        if (data) setProfile(data);
      }

      // Load existing messages
      const { data: msgs } = await supabase
        .from('live_chat')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (msgs) setMessages(msgs);
    };
    init();

    // Subscribe to new messages
    const channel = supabase
      .channel(`live-chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_chat', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;

    await supabase.from('live_chat').insert({
      room_id: roomId,
      user_id: user.id,
      username: profile.username,
      message: newMessage.trim(),
      type: 'chat',
    });

    setNewMessage('');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-surface-card)',
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        fontWeight: 600,
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        💬 Live Chat
        <span style={{
          fontSize: '11px',
          background: 'var(--color-surface-lighter)',
          padding: '2px 8px',
          borderRadius: '10px',
          color: 'var(--color-text-muted)',
        }}>
          {messages.length}
        </span>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fade-in" style={{
            display: 'flex',
            gap: '8px',
            ...(msg.type === 'gift' ? {
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            } : {}),
            ...(msg.type === 'system' ? {
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
              fontStyle: 'italic',
            } : {}),
          }}>
            {msg.type !== 'system' && (
              <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                {msg.username[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {msg.type !== 'system' && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: msg.type === 'gift' ? 'var(--color-accent)' : 'var(--color-primary-light)',
                  marginRight: '6px',
                }}>
                  {msg.username}
                </span>
              )}
              <span style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                {msg.type === 'gift' ? `🎁 Mengirim ${msg.gift_amount} koin!` : msg.message}
              </span>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--color-text-muted)',
            padding: '40px 0',
            fontSize: '14px',
          }}>
            Belum ada chat. Mulai percakapan! 💬
          </div>
        )}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={sendMessage} style={{
          padding: '12px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px',
        }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Kirim pesan..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '13px',
            }}
          />
          <button type="submit" className="btn-primary" style={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '13px',
          }}>
            Kirim
          </button>
        </form>
      ) : (
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
        }}>
          <a href="/login" style={{ color: 'var(--color-primary-light)' }}>Login</a> untuk mengirim pesan
        </div>
      )}
    </div>
  );
}
