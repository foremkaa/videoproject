'use client';
import { useState } from 'react';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGift: (amount: number) => void;
  recipientName: string;
  userCoins: number;
}

const GIFT_OPTIONS = [
  { amount: 10, emoji: '🌹', label: 'Mawar' },
  { amount: 50, emoji: '💎', label: 'Berlian' },
  { amount: 100, emoji: '👑', label: 'Mahkota' },
  { amount: 500, emoji: '🚀', label: 'Roket' },
  { amount: 1000, emoji: '🏆', label: 'Piala' },
  { amount: 5000, emoji: '🌟', label: 'Bintang' },
];

export default function GiftModal({ isOpen, onClose, onGift, recipientName, userCoins }: GiftModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    await onGift(selected);
    setSending(false);
    setSelected(null);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
    }} onClick={onClose}>
      <div className="animate-scale-in" style={{
        background: 'var(--color-surface-light)',
        borderRadius: '20px',
        border: '1px solid var(--color-border)',
        padding: '28px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎁</div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Kirim Gift</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '4px' }}>
            Untuk <strong style={{ color: 'var(--color-primary-light)' }}>{recipientName}</strong>
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '20px',
        }}>
          {GIFT_OPTIONS.map(opt => (
            <button
              key={opt.amount}
              onClick={() => setSelected(opt.amount)}
              style={{
                padding: '16px 8px',
                borderRadius: '12px',
                border: selected === opt.amount
                  ? '2px solid var(--color-primary)'
                  : '2px solid var(--color-border)',
                background: selected === opt.amount
                  ? 'rgba(124, 58, 237, 0.15)'
                  : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '4px' }}>{opt.emoji}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text)' }}>{opt.label}</div>
              <div style={{
                fontSize: '11px',
                color: 'var(--color-accent)',
                fontWeight: 700,
                marginTop: '2px',
              }}>
                🪙 {opt.amount}
              </div>
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Saldo koin kamu:</span>
          <span className="coin-badge">🪙 {userCoins.toLocaleString()}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            Batal
          </button>
          <button
            onClick={handleSend}
            className="btn-primary"
            disabled={!selected || sending || (selected ? userCoins < selected : false)}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {sending ? '⏳ Mengirim...' : selected ? `Kirim 🪙 ${selected}` : 'Pilih Gift'}
          </button>
        </div>

        {selected && userCoins < selected && (
          <p style={{
            fontSize: '12px',
            color: 'var(--color-danger)',
            textAlign: 'center',
            marginTop: '10px',
          }}>
            Koin tidak cukup! 😢
          </p>
        )}
      </div>
    </div>
  );
}
