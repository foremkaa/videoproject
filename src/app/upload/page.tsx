'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ username: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    init();
  }, []);

  const handleThumbnailChange = (file: File) => {
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !user || !profile || !title.trim()) return;

    setUploading(true);
    setError('');
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('uploader_id', user.id);
      formData.append('uploader_name', profile.username);
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }

      setProgress(30);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload gagal');
      }

      setProgress(100);
      setTimeout(() => router.push('/'), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
      setUploading(false);
      setProgress(0);
    }
  };

  if (!user) return null;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: 800,
        marginBottom: '8px',
        background: 'linear-gradient(135deg, #a78bfa, #f59e0b)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Upload Video
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', fontSize: '14px' }}>
        Bagikan video kamu ke dunia 🌍
      </p>

      <form onSubmit={handleUpload} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Video Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith('video/')) setVideoFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: dragOver ? 'rgba(124, 58, 237, 0.05)' : 'var(--color-surface-card)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setVideoFile(file);
            }}
            style={{ display: 'none' }}
          />
          {videoFile ? (
            <div>
              <span style={{ fontSize: '40px' }}>🎬</span>
              <div style={{ marginTop: '12px', fontWeight: 600 }}>{videoFile.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setVideoFile(null); }}
                style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: 'var(--color-danger)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ✕ Hapus
              </button>
            </div>
          ) : (
            <div>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>📤</span>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                Drag & drop video di sini
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                atau klik untuk memilih file
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                MP4, WebM, MOV • Maks 500MB
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            📷 Thumbnail (opsional)
          </label>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
            <div
              onClick={() => thumbInputRef.current?.click()}
              style={{
                width: '200px',
                height: '112px',
                borderRadius: '10px',
                border: '2px dashed var(--color-border)',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-surface-card)',
                flexShrink: 0,
              }}
            >
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '24px', opacity: 0.3 }}>🖼</span>
              )}
            </div>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleThumbnailChange(file);
              }}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Klik untuk upload thumbnail. JPG, PNG. Rasio 16:9 disarankan.
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            📝 Judul *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul video kamu..."
            required
            maxLength={100}
            style={{ width: '100%' }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            📄 Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ceritakan tentang video kamu..."
            rows={4}
            maxLength={2000}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {error && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--color-danger)',
            fontSize: '13px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: 'var(--color-surface-lighter)',
              overflow: 'hidden',
              marginBottom: '8px',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                borderRadius: '3px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              {progress < 100 ? `Mengupload... ${progress}%` : '✅ Upload berhasil! Mengalihkan...'}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={!videoFile || !title.trim() || uploading}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '14px',
            fontSize: '16px',
          }}
        >
          {uploading ? '⏳ Mengupload...' : '🚀 Upload Video'}
        </button>
      </form>
    </div>
  );
}
