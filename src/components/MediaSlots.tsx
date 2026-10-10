import React, { useState, useRef } from 'react';
import { Upload, Link2, X, Film, Image as ImageIcon, Check, RotateCcw, Play, Pause, Volume2 } from 'lucide-react';

/**
 * Helper to compress an uploaded image file into a compact data URL (< 600KB)
 * so it can be stored cleanly in Firestore for all visitors to see.
 */
function fileToCompressedDataUrl(file: File, maxDim = 960): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Preserve PNG transparency for artist cutouts if PNG, otherwise WebP/JPEG
        const isPng = file.type === 'image/png' || file.type === 'image/webp';
        const outputType = isPng ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, 0.82);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface ArtistCutoutSlotProps {
  entryNumber: string;
  entryTitle: string;
  photoUrl: string;
  onUpdatePhoto: (url: string) => void;
  accentVariant?: 'red' | 'black';
  isOwner?: boolean;
  compact?: boolean;
}

/**
 * Reusable Artist / Photo Cutout Component
 * Designed to display an artist or personal photo isolated on a pure white background
 * with a soft 3D cutout feel: subtle drop shadow, slight offset, and a solid geometric
 * red (#D7263D) or black (#0A0A0A) architectural backing shape for depth.
 * Strictly editable only when `isOwner` is true; read-only for visitors.
 */
export const ArtistCutoutSlot: React.FC<ArtistCutoutSlotProps> = ({
  entryNumber,
  entryTitle,
  photoUrl,
  onUpdatePhoto,
  accentVariant = 'red',
  isOwner = false,
  compact = false,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [cutoutMode, setCutoutMode] = useState<'cutout' | 'framed'>('cutout');
  const [backingColor, setBackingColor] = useState<'red' | 'black'>(accentVariant);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file, compact ? 520 : 960);
      onUpdatePhoto(dataUrl);
    } catch {
      const objectUrl = URL.createObjectURL(file);
      onUpdatePhoto(objectUrl);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const trimmed = urlInput.trim();
    if (trimmed) {
      onUpdatePhoto(trimmed);
      setUrlInput('');
      setShowUrlField(false);
    }
  };

  const handleClear = () => {
    if (!isOwner) return;
    onUpdatePhoto('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col">
      {/* Slot Header */}
      <div className="flex items-center justify-between border-b border-[#0A0A0A]/15 pb-2 mb-3.5">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[#1D3045] font-medium">
          <span>{entryNumber}</span>
          <span aria-hidden="true">·</span>
          <span>{compact ? 'Portrait' : 'Photo / Artist Cutout'}</span>
        </div>

        {isOwner && photoUrl && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setBackingColor(backingColor === 'red' ? 'black' : 'red')}
              className="text-[10px] tracking-[0.16em] uppercase text-[#1D3045] hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
              title="Toggle 3D backing shape color"
            >
              {backingColor === 'red' ? 'Red' : 'Black'}
            </button>
            {!compact && (
              <>
                <span className="text-[#0A0A0A]/20" aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={() => setCutoutMode(cutoutMode === 'cutout' ? 'framed' : 'cutout')}
                  className="text-[10px] tracking-[0.16em] uppercase text-[#1D3045] hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {cutoutMode === 'cutout' ? '3D Cutout' : 'Frame'}
                </button>
              </>
            )}
            <span className="text-[#0A0A0A]/20" aria-hidden="true">/</span>
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[10px] tracking-[0.16em] uppercase text-[#D7263D] hover:text-[#0A0A0A] transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Stage Area: Pure White Canvas with Offset 3D Backing Shape */}
      <div
        className={`relative w-full ${
          compact ? 'aspect-square' : 'aspect-[4/5]'
        } bg-[#FFFFFF] border border-[#0A0A0A]/15 flex items-center justify-center overflow-hidden group transition-colors duration-200 hover:border-[#0A0A0A]/40`}
      >
        {/* Subtle Architectural Crosshairs on White Canvas */}
        <div className="pointer-events-none absolute inset-3 border border-dashed border-[#0A0A0A]/[0.06]" />

        {/* Offset 3D Backing Shape (Red #D7263D or Black #0A0A0A) behind the cutout */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute transition-transform duration-300 ease-out group-hover:translate-x-2 group-hover:-translate-y-2 ${
            backingColor === 'red' ? 'bg-[#D7263D]' : 'bg-[#0A0A0A]'
          }`}
          style={{
            width: compact ? '66%' : '62%',
            height: compact ? '66%' : '68%',
            transform: compact ? 'translate(8px, 10px)' : 'translate(14px, 16px)',
          }}
        />

        {/* Secondary fine offset wireframe for spatial depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute border border-[#0A0A0A]/20 transition-transform duration-300 ease-out group-hover:-translate-x-1.5 group-hover:translate-y-1.5"
          style={{
            width: compact ? '66%' : '62%',
            height: compact ? '66%' : '68%',
            transform: compact ? 'translate(-7px, -7px)' : 'translate(-12px, -12px)',
          }}
        />

        {photoUrl ? (
          <div className={`relative z-10 w-full h-full flex items-center justify-center ${compact ? 'p-3' : 'p-6'}`}>
            <img
              src={photoUrl}
              alt={`${entryTitle} visual`}
              referrerPolicy="no-referrer"
              className={`max-h-full max-w-full transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02] ${
                cutoutMode === 'cutout'
                  ? 'object-contain drop-shadow-[0_18px_24px_rgba(10,10,10,0.28)]'
                  : 'w-full h-full object-cover drop-shadow-[0_14px_20px_rgba(10,10,10,0.22)]'
              }`}
            />
          </div>
        ) : isOwner ? (
          /* Owner Empty State Controls inside the 3D Stage */
          <div
            className={`relative z-10 bg-[#FFFFFF]/95 border border-[#0A0A0A] ${
              compact ? 'p-3.5 max-w-[88%] gap-3' : 'p-6 max-w-[82%] gap-5'
            } w-full flex flex-col items-start justify-between`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-[#D7263D] font-medium">
                <ImageIcon className="w-3 h-3 shrink-0" />
                <span>{compact ? 'My Photo' : 'Empty Photo Slot'}</span>
              </div>
              {!compact && (
                <p className="text-xs text-[#1D3045] leading-relaxed">
                  Upload an isolated artist cutout (PNG/WebP) or photograph, or paste a direct image URL.
                </p>
              )}
            </div>

            {!showUrlField ? (
              <div className="flex flex-wrap items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 ${
                    compact ? 'px-2 py-1.5 text-[9px]' : 'px-3.5 py-2 text-[11px]'
                  } bg-[#0A0A0A] text-[#FFFFFF] tracking-[0.16em] uppercase hover:bg-[#D7263D] transition-colors whitespace-nowrap cursor-pointer`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUrlField(true)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 ${
                    compact ? 'px-2 py-1.5 text-[9px]' : 'px-3.5 py-2 text-[11px]'
                  } border border-[#0A0A0A] text-[#0A0A0A] bg-[#FFFFFF] tracking-[0.16em] uppercase hover:border-[#D7263D] hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>URL</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleUrlSubmit} className="w-full">
                <div className="flex items-center border border-[#0A0A0A] bg-[#FFFFFF]">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-[#D7263D] text-[#FFFFFF] hover:bg-[#0A0A0A] transition-colors cursor-pointer"
                    title="Apply image URL"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUrlField(false);
                      setUrlInput('');
                    }}
                    className="px-2 py-1.5 text-[#1D3045] hover:text-[#D7263D] transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Read-Only Visitor Empty State */
          <div className="relative z-10 bg-[#FFFFFF]/95 border border-[#0A0A0A]/25 px-4 py-3 text-center">
            <span className="text-[10px] tracking-[0.24em] uppercase text-[#1D3045]/70">
              {compact ? 'Portrait Slot' : 'Visual Pending'}
            </span>
          </div>
        )}

        {isOwner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>

      {/* Quick Replace Bar when populated (Owner Only) */}
      {isOwner && photoUrl && (
        <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.16em] uppercase text-[#1D3045]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            Replace File
          </button>
          <button
            type="button"
            onClick={() => setShowUrlField(!showUrlField)}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            {showUrlField ? 'Close URL' : 'Paste URL'}
          </button>
        </div>
      )}

      {isOwner && photoUrl && showUrlField && (
        <form onSubmit={handleUrlSubmit} className="mt-2 flex items-center border border-[#0A0A0A]">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL..."
            className="w-full px-2.5 py-1.5 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] text-[10px] tracking-[0.18em] uppercase hover:bg-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};

export interface VideoSlotProps {
  entryNumber: string;
  entryTitle: string;
  videoUrl: string;
  videoType: 'file' | 'link' | null;
  onUpdateVideo: (url: string, type: 'file' | 'link' | null) => void;
  isOwner?: boolean;
}

/**
 * Helper to convert standard YouTube / Vimeo links into embeddable iframe URLs
 * when applicable, or fall back to direct <video> playback.
 */
function getEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (parsed.pathname.startsWith('/embed/')) return url;
    }
    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Reusable Video Slot Component
 * Supports uploading a local video file or pasting a video link (MP4/WebM or YouTube/Vimeo).
 * Strictly editable only when `isOwner` is true; read-only for visitors.
 */
export const VideoSlot: React.FC<VideoSlotProps> = ({
  entryNumber,
  entryTitle,
  videoUrl,
  onUpdateVideo,
  isOwner = false,
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [showLinkField, setShowLinkField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingVideo, setUploadingVideo] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const { uploadMediaFile } = await import('../firebase');
      const persistentUrl = await uploadMediaFile(file, `videos/${entryNumber}`);
      onUpdateVideo(persistentUrl, 'file');
    } catch {
      const objectUrl = URL.createObjectURL(file);
      onUpdateVideo(objectUrl, 'file');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;
    const trimmed = linkInput.trim();
    if (trimmed) {
      onUpdateVideo(trimmed, 'link');
      setLinkInput('');
      setShowLinkField(false);
    }
  };

  const handleClear = () => {
    if (!isOwner) return;
    onUpdateVideo('', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const embedUrl = videoUrl ? getEmbedUrl(videoUrl) : null;

  return (
    <div className="flex flex-col">
      {/* Slot Header */}
      <div className="flex items-center justify-between border-b border-[#0A0A0A]/15 pb-2.5 mb-5">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#1D3045] font-medium">
          <span>{entryNumber}</span>
          <span aria-hidden="true">·</span>
          <span>Video Slot</span>
        </div>

        {isOwner && videoUrl && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] uppercase text-[#D7263D] hover:text-[#0A0A0A] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Video Frame */}
      <div className="relative w-full aspect-video bg-[#FFFFFF] border border-[#0A0A0A]/15 flex items-center justify-center overflow-hidden group transition-colors duration-200 hover:border-[#0A0A0A]/40">
        {/* Corner Registration Marks */}
        <div className="pointer-events-none absolute top-3 left-3 w-3 h-3 border-t border-l border-[#0A0A0A]/30" />
        <div className="pointer-events-none absolute top-3 right-3 w-3 h-3 border-t border-r border-[#0A0A0A]/30" />
        <div className="pointer-events-none absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[#0A0A0A]/30" />
        <div className="pointer-events-none absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#0A0A0A]/30" />

        {videoUrl ? (
          embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${entryTitle} video`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={videoUrl}
              controls
              className="w-full h-full object-contain bg-[#0A0A0A]"
            />
          )
        ) : isOwner ? (
          <div className="relative z-10 p-6 max-w-[86%] w-full flex flex-col items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.24em] uppercase text-[#1D3045] font-medium">
                <Film className="w-3.5 h-3.5 text-[#D7263D]" />
                <span>Empty Video Slot</span>
              </div>
              <p className="text-xs text-[#1D3045] leading-relaxed">
                Upload a video clip (MP4/WebM/MOV) or paste a video link (YouTube, Vimeo, or direct file URL).
              </p>
            </div>

            {!showLinkField ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0A0A0A] text-[#FFFFFF] text-[11px] tracking-[0.18em] uppercase hover:bg-[#D7263D] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingVideo ? 'Uploading...' : 'Upload Video'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkField(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-[#0A0A0A] text-[#0A0A0A] bg-[#FFFFFF] text-[11px] tracking-[0.18em] uppercase hover:border-[#D7263D] hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Paste Link</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="w-full">
                <div className="flex items-center border border-[#0A0A0A] bg-[#FFFFFF]">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or .mp4 link"
                    className="w-full px-3 py-2 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#D7263D] text-[#FFFFFF] hover:bg-[#0A0A0A] transition-colors cursor-pointer"
                    title="Apply video link"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkField(false);
                      setLinkInput('');
                    }}
                    className="px-2.5 py-2 text-[#1D3045] hover:text-[#D7263D] transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Read-Only Visitor Empty State */
          <div className="relative z-10 px-4 py-3 text-center">
            <span className="text-[10px] tracking-[0.24em] uppercase text-[#1D3045]/60">
              Video Pending
            </span>
          </div>
        )}

        {isOwner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>

      {/* Quick Replace Controls when video is populated (Owner Only) */}
      {isOwner && videoUrl && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] tracking-[0.16em] uppercase text-[#1D3045]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            Replace Video File
          </button>
          <button
            type="button"
            onClick={() => setShowLinkField(!showLinkField)}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            {showLinkField ? 'Close Link Input' : 'Replace via Link'}
          </button>
        </div>
      )}

      {isOwner && videoUrl && showLinkField && (
        <form onSubmit={handleLinkSubmit} className="mt-2 flex items-center border border-[#0A0A0A]">
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste new video link..."
            className="w-full px-3 py-1.5 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] text-[10px] tracking-[0.18em] uppercase hover:bg-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};

export interface AudioSlotProps {
  entryNumber: string;
  entryTitle: string;
  audioUrl: string;
  audioType: 'file' | 'link' | null;
  onUpdateAudio: (url: string, type: 'file' | 'link' | null) => void;
  isOwner?: boolean;
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const WAVEFORM_BAR_HEIGHTS = [
  28, 52, 38, 76, 62, 92, 44, 68, 84, 34, 58, 96, 72, 48, 88, 64, 36, 78, 54,
  90, 42, 66, 82, 50, 74, 60, 32, 86, 56, 70, 46, 38,
];

/**
 * Reusable Audio Player Slot Component (for Entry 09 "Unplugged")
 * Styled in the site's editorial look: pure white background (#FFFFFF),
 * thin black outline (#0A0A0A), red play button (#D7263D), navy time labels (#1D3045),
 * and an interactive red waveform & progress bar.
 * Audio files are kept in React state (no localStorage).
 */
export const AudioSlot: React.FC<AudioSlotProps> = ({
  entryNumber,
  entryTitle,
  audioUrl,
  onUpdateAudio,
  isOwner = false,
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [showLinkField, setShowLinkField] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onUpdateAudio(objectUrl, 'file');
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkInput.trim();
    if (trimmed) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onUpdateAudio(trimmed, 'link');
      setLinkInput('');
      setShowLinkField(false);
    }
  };

  const handleClear = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onUpdateAudio('', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    el.currentTime = ratio * duration;
    setCurrentTime(el.currentTime);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="flex flex-col">
      {/* Slot Header */}
      <div className="flex items-center justify-between border-b border-[#0A0A0A]/15 pb-2.5 mb-5">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-[#1D3045] font-medium">
          <span>{entryNumber}</span>
          <span aria-hidden="true">·</span>
          <span>Audio Slot</span>
        </div>

        {isOwner && audioUrl && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] tracking-[0.16em] uppercase text-[#D7263D] hover:text-[#0A0A0A] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Audio Player Frame: White background, thin black outline */}
      <div className="relative w-full bg-[#FFFFFF] border border-[#0A0A0A] p-6 transition-colors duration-200">
        {audioUrl ? (
          <div className="space-y-5">
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (audioRef.current) {
                  setCurrentTime(audioRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
                  setDuration(audioRef.current.duration);
                }
              }}
              className="hidden"
            />

            <div className="flex items-center gap-4">
              {/* Red Play / Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? `Pause ${entryTitle} audio` : `Play ${entryTitle} audio`}
                className="w-12 h-12 shrink-0 bg-[#D7263D] text-[#FFFFFF] hover:bg-[#0A0A0A] transition-colors flex items-center justify-center cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Waveform & Red Progress Bar */}
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  onClick={handleSeek}
                  role="slider"
                  aria-label="Audio progress waveform"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(duration) || 100}
                  aria-valuenow={Math.round(currentTime)}
                  tabIndex={0}
                  className="h-10 flex items-center gap-[3px] cursor-pointer select-none"
                >
                  {WAVEFORM_BAR_HEIGHTS.map((h, i) => {
                    const barThreshold = ((i + 1) / WAVEFORM_BAR_HEIGHTS.length) * 100;
                    const isPlayed = progressPercent >= barThreshold;
                    return (
                      <div
                        key={i}
                        className={`flex-1 transition-colors duration-150 ${
                          isPlayed ? 'bg-[#D7263D]' : 'bg-[#D7263D]/25 hover:bg-[#D7263D]/50'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    );
                  })}
                </div>

                {/* Thin Red Progress Bar */}
                <div
                  onClick={handleSeek}
                  className="w-full h-[2px] bg-[#0A0A0A]/12 cursor-pointer relative overflow-hidden"
                >
                  <div
                    className="h-full bg-[#D7263D] transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Navy Time Labels */}
            <div className="flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-[#1D3045] tabular-nums">
              <span>{formatAudioTime(currentTime)}</span>
              <span className="text-[10px] tracking-[0.22em] text-[#D7263D]">
                {entryTitle} · Audio
              </span>
              <span>{formatAudioTime(duration)}</span>
            </div>
          </div>
        ) : (
          /* Placeholder State when no audio is loaded */
          <div className="space-y-5">
            {/* Inactive Editorial Player Preview */}
            <div className="flex items-center gap-4 opacity-55">
              <div className="w-11 h-11 shrink-0 bg-[#D7263D] text-[#FFFFFF] flex items-center justify-center">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-8 flex items-center gap-[3px]">
                  {WAVEFORM_BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-[#D7263D]/30"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="w-full h-[2px] bg-[#D7263D]/35" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-[#1D3045] tabular-nums">
              <span>00:00</span>
              <span className="inline-flex items-center gap-1.5 text-[#D7263D]">
                <Volume2 className="w-3 h-3" />
                <span>No Audio Loaded</span>
              </span>
              <span>00:00</span>
            </div>

            {isOwner && (
              <div className="pt-3 border-t border-[#0A0A0A]/12 space-y-3">
                <p className="text-xs text-[#1D3045] leading-relaxed">
                  Upload an audio file (MP3, WAV, M4A, OGG) or paste a direct audio link.
                </p>

                {!showLinkField ? (
                  <div className="flex flex-wrap items-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[#0A0A0A] text-[#FFFFFF] text-[11px] tracking-[0.18em] uppercase hover:bg-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLinkField(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 border border-[#0A0A0A] text-[#0A0A0A] bg-[#FFFFFF] text-[11px] tracking-[0.18em] uppercase hover:border-[#D7263D] hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Paste Link</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLinkSubmit} className="w-full">
                    <div className="flex items-center border border-[#0A0A0A] bg-[#FFFFFF]">
                      <input
                        type="url"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://example.com/unplugged-session.mp3"
                        className="w-full px-3 py-2 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 bg-[#D7263D] text-[#FFFFFF] hover:bg-[#0A0A0A] transition-colors cursor-pointer"
                        title="Apply audio link"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkField(false);
                          setLinkInput('');
                        }}
                        className="px-2.5 py-2 text-[#1D3045] hover:text-[#D7263D] transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Quick Replace Controls when audio is populated (Owner Only) */}
      {isOwner && audioUrl && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] tracking-[0.16em] uppercase text-[#1D3045]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            Replace Audio File
          </button>
          <button
            type="button"
            onClick={() => setShowLinkField(!showLinkField)}
            className="hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
          >
            {showLinkField ? 'Close Link Input' : 'Replace via Link'}
          </button>
        </div>
      )}

      {isOwner && audioUrl && showLinkField && (
        <form onSubmit={handleLinkSubmit} className="mt-2 flex items-center border border-[#0A0A0A]">
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="Paste new audio link..."
            className="w-full px-3 py-1.5 text-xs text-[#0A0A0A] placeholder:text-[#1D3045]/45 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] text-[10px] tracking-[0.18em] uppercase hover:bg-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};

