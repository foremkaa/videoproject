import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import { createServerClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const video = formData.get('video') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const uploaderId = formData.get('uploader_id') as string;
    const uploaderName = formData.get('uploader_name') as string;
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!video || !title) {
      return NextResponse.json({ error: 'Video dan judul wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const videoId = uuidv4();

    // Upload video to R2
    const videoBytes = await video.arrayBuffer();
    const videoExt = video.name.split('.').pop() || 'mp4';
    const videoKey = `videos/${videoId}.${videoExt}`;
    const videoUrl = await uploadToR2(videoKey, Buffer.from(videoBytes), video.type);

    // Upload thumbnail if provided
    let thumbnailUrl = '';
    if (thumbnail) {
      const thumbBytes = await thumbnail.arrayBuffer();
      const thumbExt = thumbnail.name.split('.').pop() || 'jpg';
      const thumbKey = `thumbnails/${videoId}.${thumbExt}`;
      thumbnailUrl = await uploadToR2(thumbKey, Buffer.from(thumbBytes), thumbnail.type);
    }

    // Save metadata to Supabase
    const { data, error } = await supabase.from('videos').insert({
      id: videoId,
      title,
      description: description || '',
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      uploader_id: uploaderId,
      uploader_name: uploaderName,
      file_size: video.size,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, video: data });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload gagal' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
