'use client';
import { Suspense } from 'react';
import HomeContent from '@/components/HomeContent';

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
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
              }} />
              <div style={{ padding: '12px' }}>
                <div style={{ height: '14px', width: '80%', background: 'var(--color-surface-lighter)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ height: '12px', width: '50%', background: 'var(--color-surface-lighter)', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
