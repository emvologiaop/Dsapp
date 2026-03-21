import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brush, Camera, Eraser, Plus, Sparkles, Sticker, Trash2, Type, X, Upload } from 'lucide-react';
import { FriendlyCard } from './FriendlyCard';
import { MentionInput } from './MentionInput';
import { withAuthHeaders } from '../utils/clientAuth';

interface StoryUploadProps {
  userId: string;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

type OverlayDraft = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: 'sm' | 'md' | 'lg';
  background: 'none' | 'soft' | 'solid';
};

type DrawingPath = {
  id: string;
  tool: 'brush' | 'eraser';
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
};

type StickerDraft = {
  id: string;
  pack: 'basic' | 'reactions' | 'neon';
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

const FILTER_OPTIONS = [
  { id: 'none', label: 'Clean', className: '' },
  { id: 'warm', label: 'Warm', className: 'sepia-[0.2] saturate-125 hue-rotate-[-6deg]' },
  { id: 'mono', label: 'Mono', className: 'grayscale contrast-110' },
  { id: 'dream', label: 'Dream', className: 'brightness-110 saturate-125 hue-rotate-[12deg]' },
  { id: 'boost', label: 'Boost', className: 'contrast-125 saturate-150' },
] as const;

const TEXT_COLORS = ['#ffffff', '#fef08a', '#fecdd3', '#bfdbfe', '#86efac', '#f5d0fe'];
const DRAW_COLORS = ['#ffffff', '#fef08a', '#fca5a5', '#93c5fd', '#86efac', '#f0abfc', '#111827'];
const CAMERA_EFFECTS = [
  { id: 'none', label: 'Clean', className: '' },
  { id: 'vintage', label: 'Vintage', className: 'sepia-[0.35] saturate-125 contrast-105' },
  { id: 'cool', label: 'Cool', className: 'hue-rotate-[16deg] saturate-110 brightness-105' },
  { id: 'vivid', label: 'Vivid', className: 'contrast-125 saturate-150' },
  { id: 'mono', label: 'Mono', className: 'grayscale contrast-110' },
] as const;
const STICKER_PACKS: Array<{ id: StickerDraft['pack']; label: string; items: string[] }> = [
  { id: 'basic', label: 'Basic', items: ['⭐', '❤️', '🔥', '🎉', '✨', '💫'] },
  { id: 'reactions', label: 'Reactions', items: ['😍', '😂', '😎', '🤯', '👏', '🙌'] },
  { id: 'neon', label: 'Neon', items: ['🌈', '⚡', '💥', '🪩', '🎵', '🦄'] },
];

function getOverlayTextClass(size: OverlayDraft['size']) {
  if (size === 'sm') return 'text-sm';
  if (size === 'lg') return 'text-2xl';
  return 'text-lg';
}

function getOverlayBackgroundClass(background: OverlayDraft['background']) {
  if (background === 'solid') return 'bg-black/80';
  if (background === 'none') return 'bg-transparent';
  return 'bg-black/35 backdrop-blur-sm';
}

function getTouchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function getTouchAngle(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI);
}

export const StoryUpload: React.FC<StoryUploadProps> = ({ userId, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [duration, setDuration] = useState<number | null>(null);
  const [visualFilter, setVisualFilter] = useState<(typeof FILTER_OPTIONS)[number]['id']>('none');
  const [overlayTexts, setOverlayTexts] = useState<OverlayDraft[]>([]);
  const [cameraEffect, setCameraEffect] = useState<(typeof CAMERA_EFFECTS)[number]['id']>('none');
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [stickers, setStickers] = useState<StickerDraft[]>([]);
  const [drawingTool, setDrawingTool] = useState<'brush' | 'eraser'>('brush');
  const [drawingColor, setDrawingColor] = useState('#ffffff');
  const [drawingSize, setDrawingSize] = useState(5);
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activePathIdRef = useRef<string | null>(null);
  const stickerDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const stickerTouchTransformRef = useRef<{
    id: string;
    startDistance: number;
    startAngle: number;
    originScale: number;
    originRotation: number;
  } | null>(null);

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (inputMode !== 'camera') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => {});
        }
      })
      .catch((error) => {
        console.error('Failed to access camera:', error);
        setCameraError('Unable to access camera. Check browser permissions.');
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [inputMode]);

  const handleFileSelect = (nextFile: File | null) => {
    setInputMode('upload');
    setCameraError(null);
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setDuration(null);

    if (!nextFile) {
      setPreviewUrl('');
      setMediaType('image');
      return;
    }

    const nextMediaType = nextFile.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(nextMediaType);
    setPreviewUrl(URL.createObjectURL(nextFile));

    if (nextMediaType === 'video') {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setDuration(Number.isFinite(video.duration) ? Math.ceil(video.duration) : null);
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(nextFile);
    }
  };

  const captureFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera is not ready yet.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Unable to capture camera frame.');
      return;
    }

    if (cameraEffect === 'vintage') context.filter = 'sepia(35%) saturate(1.25) contrast(1.05)';
    if (cameraEffect === 'cool') context.filter = 'hue-rotate(16deg) saturate(1.1) brightness(1.05)';
    if (cameraEffect === 'vivid') context.filter = 'contrast(1.25) saturate(1.5)';
    if (cameraEffect === 'mono') context.filter = 'grayscale(1) contrast(1.1)';
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.92);
    });
    if (!blob) {
      setCameraError('Unable to create image from camera capture.');
      return;
    }

    const capturedFile = new File([blob], `story-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    handleFileSelect(capturedFile);
  };

  const upload = async () => {
    if (!userId || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('media', file);
      form.append('userId', userId);
      form.append('caption', caption);
      form.append('mediaType', mediaType);
      form.append('audience', 'mutuals');
      form.append('visualFilter', visualFilter);
      form.append('cameraEffect', cameraEffect);
      form.append('overlayTexts', JSON.stringify(overlayTexts.map(({ id, ...overlay }) => overlay)));
      form.append('drawings', JSON.stringify(drawings.map(({ id, ...path }) => path)));
      form.append('stickers', JSON.stringify(stickers.map(({ id, ...sticker }) => sticker)));
      if (mediaType === 'video' && duration) {
        form.append('duration', String(duration));
      }

      const res = await fetch('/api/stories', { method: 'POST', headers: withAuthHeaders(), body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to upload story');
      }
      onUploadSuccess?.();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  const activeFilterClass = FILTER_OPTIONS.find((option) => option.id === visualFilter)?.className || '';

  const addOverlay = () => {
    setOverlayTexts((current) => {
      const nextOverlay: OverlayDraft = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        text: 'New text',
        x: 50,
        y: 22 + current.length * 12,
        color: '#ffffff',
        size: 'md',
        background: 'soft',
      };
      return [...current, nextOverlay].slice(0, 5);
    });
  };

  const updateOverlay = (id: string, patch: Partial<OverlayDraft>) => {
    setOverlayTexts((current) => current.map((overlay) => (
      overlay.id === id ? { ...overlay, ...patch } : overlay
    )));
  };

  const removeOverlay = (id: string) => {
    setOverlayTexts((current) => current.filter((overlay) => overlay.id !== id));
  };

  const handleDrawingStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stickerDragRef.current) return;
    if (!mediaContainerRef.current) return;
    const rect = mediaContainerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const nextPath: DrawingPath = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      tool: drawingTool,
      color: drawingTool === 'eraser' ? '#000000' : drawingColor,
      size: drawingSize,
      points: [{ x, y }],
    };
    activePathIdRef.current = nextPath.id;
    setDrawings((current) => [...current, nextPath].slice(-40));
    setIsDrawing(true);
  };

  const handleDrawingMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stickerDragRef.current && mediaContainerRef.current) {
      const drag = stickerDragRef.current;
      const rect = mediaContainerRef.current.getBoundingClientRect();
      const deltaXPercent = ((event.clientX - drag.startX) / rect.width) * 100;
      const deltaYPercent = ((event.clientY - drag.startY) / rect.height) * 100;
      updateSticker(drag.id, {
        x: Math.max(5, Math.min(95, drag.originX + deltaXPercent)),
        y: Math.max(5, Math.min(95, drag.originY + deltaYPercent)),
      });
      return;
    }
    if (!isDrawing || !activePathIdRef.current || !mediaContainerRef.current) return;
    const rect = mediaContainerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setDrawings((current) => current.map((path) => (
      path.id === activePathIdRef.current ? { ...path, points: [...path.points, { x, y }].slice(-500) } : path
    )));
  };

  const handleDrawingEnd = () => {
    stickerDragRef.current = null;
    stickerTouchTransformRef.current = null;
    activePathIdRef.current = null;
    setIsDrawing(false);
  };

  const addSticker = (pack: StickerDraft['pack'], value: string) => {
    const nextSticker: StickerDraft = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      pack,
      value,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    setStickers((current) => [...current, nextSticker].slice(0, 25));
    setActiveStickerId(nextSticker.id);
  };

  const updateSticker = (id: string, patch: Partial<StickerDraft>) => {
    setStickers((current) => current.map((sticker) => (sticker.id === id ? { ...sticker, ...patch } : sticker)));
  };

  const handleStickerDragStart = (event: React.PointerEvent<HTMLButtonElement>, sticker: StickerDraft) => {
    event.preventDefault();
    event.stopPropagation();
    if (!mediaContainerRef.current) return;
    setActiveStickerId(sticker.id);
    setIsDrawing(false);
    activePathIdRef.current = null;
    stickerDragRef.current = {
      id: sticker.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: sticker.x,
      originY: sticker.y,
    };
  };

  const handleStickerTouchStart = (event: React.TouchEvent<HTMLButtonElement>, sticker: StickerDraft) => {
    event.stopPropagation();
    if (event.touches.length !== 2) {
      stickerTouchTransformRef.current = null;
      return;
    }
    const [first, second] = [event.touches[0], event.touches[1]];
    stickerTouchTransformRef.current = {
      id: sticker.id,
      startDistance: getTouchDistance(first, second),
      startAngle: getTouchAngle(first, second),
      originScale: sticker.scale,
      originRotation: sticker.rotation,
    };
    setActiveStickerId(sticker.id);
    setIsDrawing(false);
    activePathIdRef.current = null;
  };

  const handleStickerTouchMove = (event: React.TouchEvent<HTMLButtonElement>, sticker: StickerDraft) => {
    event.stopPropagation();
    if (event.touches.length !== 2) return;
    const transform = stickerTouchTransformRef.current;
    if (!transform || transform.id !== sticker.id) return;
    const [first, second] = [event.touches[0], event.touches[1]];
    const nextDistance = getTouchDistance(first, second);
    const nextAngle = getTouchAngle(first, second);
    const scaleRatio = nextDistance / Math.max(transform.startDistance, 1);
    const deltaAngle = nextAngle - transform.startAngle;
    updateSticker(sticker.id, {
      scale: Math.max(0.6, Math.min(2.5, transform.originScale * scaleRatio)),
      rotation: Math.max(-180, Math.min(180, transform.originRotation + deltaAngle)),
    });
  };

  const nudgeSticker = (id: string, direction: 'left' | 'right' | 'up' | 'down', step = 1) => {
    setStickers((current) => current.map((sticker) => {
      if (sticker.id !== id) return sticker;
      if (direction === 'left') return { ...sticker, x: Math.max(5, sticker.x - step) };
      if (direction === 'right') return { ...sticker, x: Math.min(95, sticker.x + step) };
      if (direction === 'up') return { ...sticker, y: Math.max(5, sticker.y - step) };
      return { ...sticker, y: Math.min(95, sticker.y + step) };
    }));
  };

  const handleStickerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, sticker: StickerDraft) => {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeSticker(sticker.id, 'left', step);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeSticker(sticker.id, 'right', step);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudgeSticker(sticker.id, 'up', step);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudgeSticker(sticker.id, 'down', step);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      setStickers((current) => current.filter((item) => item.id !== sticker.id));
      if (activeStickerId === sticker.id) {
        setActiveStickerId(null);
      }
    }
  };

  const activeSticker = useMemo(
    () => stickers.find((item) => item.id === activeStickerId) || null,
    [stickers, activeStickerId]
  );
  const activeCameraClass = CAMERA_EFFECTS.find((effect) => effect.id === cameraEffect)?.className || '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/90 backdrop-blur-2xl">
      <div className="border-b border-white/30 bg-background/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-primary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Story</p>
              <h2 className="text-lg font-bold tracking-[-0.03em]">New Story</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-border/70 bg-background/80 p-2 transition-colors hover:bg-muted" aria-label="Close">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-6 py-6">
        <FriendlyCard className="space-y-5 border border-primary/10 bg-gradient-to-br from-background via-background to-primary/8">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Media</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${inputMode === 'upload' ? 'border-primary bg-primary/10 text-foreground' : 'border-white/30 bg-background/70 text-muted-foreground'}`}
              >
                <Upload size={14} />
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setInputMode('camera');
                }}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold ${inputMode === 'camera' ? 'border-primary bg-primary/10 text-foreground' : 'border-white/30 bg-background/70 text-muted-foreground'}`}
              >
                <Camera size={14} />
                Camera
              </button>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              disabled={uploading || inputMode !== 'upload'}
              className="block w-full rounded-2xl border border-white/35 bg-background/80 px-4 py-3 text-sm shadow-sm backdrop-blur file:mr-4 file:rounded-xl file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            />
            {inputMode === 'camera' && (
              <div className="space-y-2 rounded-2xl border border-white/20 bg-background/70 p-3">
                <video ref={cameraVideoRef} autoPlay muted playsInline className={`h-56 w-full rounded-xl object-cover ${activeCameraClass}`} />
                <button
                  type="button"
                  onClick={captureFromCamera}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-background/70 px-4 py-2 text-xs font-semibold"
                >
                  <Camera size={14} />
                  Capture frame
                </button>
                {cameraError ? <p className="text-xs text-red-400">{cameraError}</p> : null}
              </div>
            )}
            {file && <p className="text-xs text-muted-foreground">Selected: <span className="font-medium">{file.name}</span></p>}
            {previewUrl && (
              <div
                ref={mediaContainerRef}
                className="relative overflow-hidden rounded-[28px] border border-white/30 bg-black/90"
                onPointerDown={handleDrawingStart}
                onPointerMove={handleDrawingMove}
                onPointerUp={handleDrawingEnd}
                onPointerLeave={handleDrawingEnd}
              >
                {mediaType === 'video' ? (
                  <video src={previewUrl} className={`h-[24rem] w-full object-cover ${activeFilterClass}`} muted playsInline controls />
                ) : (
                  <img src={previewUrl} alt="Story preview" className={`h-[24rem] w-full object-cover ${activeFilterClass}`} />
                )}
                <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {drawings.map((path) => (
                    <polyline
                      key={path.id}
                      points={path.points.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke={path.tool === 'eraser' ? '#000000' : path.color}
                      strokeWidth={Math.max(0.6, path.size / 3)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={path.tool === 'eraser' ? 0.45 : 1}
                    />
                  ))}
                </svg>
                {stickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => setActiveStickerId(sticker.id)}
                    onPointerDown={(event) => handleStickerDragStart(event, sticker)}
                    onTouchStart={(event) => handleStickerTouchStart(event, sticker)}
                    onTouchMove={(event) => handleStickerTouchMove(event, sticker)}
                    onTouchEnd={(event) => event.stopPropagation()}
                    onKeyDown={(event) => handleStickerKeyDown(event, sticker)}
                    className={`absolute left-0 top-0 z-20 touch-none -translate-x-1/2 -translate-y-1/2 rounded-lg text-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${activeStickerId === sticker.id ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]' : ''}`}
                    aria-label={`Sticker ${sticker.value}. Use arrow keys to move, shift plus arrows for larger movement, delete to remove.`}
                    style={{
                      left: `${sticker.x}%`,
                      top: `${sticker.y}%`,
                      transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                    }}
                  >
                    {sticker.value}
                  </button>
                ))}
                {overlayTexts.map((overlay) => (
                  <div
                    key={overlay.id}
                    className={`absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl px-3 py-2 font-semibold leading-tight text-white shadow-[0_14px_30px_-16px_rgba(0,0,0,0.85)] ${getOverlayTextClass(overlay.size)} ${getOverlayBackgroundClass(overlay.background)}`}
                    style={{ left: `${overlay.x}%`, top: `${overlay.y}%`, color: overlay.color }}
                  >
                    {overlay.text}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full border border-white/25 bg-background/70 px-3 py-1.5">
                {mediaType === 'video' ? 'Video story' : 'Photo story'}
              </span>
              {mediaType === 'video' && duration ? (
                <span className="rounded-full border border-white/25 bg-background/70 px-3 py-1.5">
                  {duration}s
                </span>
              ) : null}
              <span className="rounded-full border border-white/25 bg-background/70 px-3 py-1.5">
                Expires in 24h
              </span>
              <span className="rounded-full border border-white/25 bg-background/70 px-3 py-1.5">
                Mutuals only
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Look</p>
                <p className="text-xs text-muted-foreground">Choose a visual filter for this story.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVisualFilter(option.id)}
                  className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition-all ${visualFilter === option.id ? 'border-primary bg-primary/10 text-foreground' : 'border-white/30 bg-background/70 text-muted-foreground'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <div>
                <p className="text-sm font-semibold">Camera effects</p>
                <p className="text-xs text-muted-foreground">Applied to camera capture frames.</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {CAMERA_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  onClick={() => setCameraEffect(effect.id)}
                  className={`rounded-2xl border px-3 py-3 text-xs font-semibold transition-all ${cameraEffect === effect.id ? 'border-primary bg-primary/10 text-foreground' : 'border-white/30 bg-background/70 text-muted-foreground'}`}
                >
                  {effect.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Brush size={16} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Drawing tools</p>
                  <p className="text-xs text-muted-foreground">Draw directly on the preview card.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDrawings((current) => current.slice(0, -1))}
                  disabled={drawings.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-background/70 px-3 py-2 text-xs font-semibold disabled:opacity-45"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => setDrawings([])}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-background/70 px-3 py-2 text-xs font-semibold"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Tool</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setDrawingTool('brush')} className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold ${drawingTool === 'brush' ? 'border-primary bg-primary/10 text-foreground' : 'border-white/25 bg-background/70 text-muted-foreground'}`}><Brush size={12} />Brush</button>
                  <button type="button" onClick={() => setDrawingTool('eraser')} className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold ${drawingTool === 'eraser' ? 'border-primary bg-primary/10 text-foreground' : 'border-white/25 bg-background/70 text-muted-foreground'}`}><Eraser size={12} />Erase</button>
                </div>
              </div>
              <label className="space-y-2 text-xs text-muted-foreground">
                Brush size
                <input type="range" min={2} max={18} value={drawingSize} onChange={(event) => setDrawingSize(Number(event.target.value))} className="w-full" />
              </label>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Color</p>
                <div className="flex flex-wrap gap-2">
                  {DRAW_COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setDrawingColor(color)} className={`h-7 w-7 rounded-full border ${drawingColor === color ? 'border-primary ring-2 ring-primary/30' : 'border-white/25'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sticker size={16} className="text-primary" />
              <div>
                <p className="text-sm font-semibold">Sticker packs</p>
                <p className="text-xs text-muted-foreground">Tap a sticker to add it, then fine-tune position and style.</p>
              </div>
            </div>
            <p className="rounded-2xl border border-white/20 bg-background/60 px-3 py-2 text-[11px] text-muted-foreground">
              Accessibility: select a sticker and use arrow keys to nudge it. Hold Shift for larger steps. Press Delete to remove.
            </p>
            <div className="space-y-3">
              {STICKER_PACKS.map((pack) => (
                <div key={pack.id} className="space-y-2 rounded-2xl border border-white/20 bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pack.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {pack.items.map((emoji) => (
                      <button key={`${pack.id}_${emoji}`} type="button" onClick={() => addSticker(pack.id, emoji)} className="rounded-xl border border-white/20 bg-background/70 px-3 py-2 text-xl">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {activeSticker ? (
              <div className="grid gap-3 rounded-2xl border border-white/20 bg-background/60 p-3 sm:grid-cols-2">
                <label className="space-y-2 text-xs text-muted-foreground">Horizontal <input type="range" min={5} max={95} value={activeSticker.x} onChange={(event) => updateSticker(activeSticker.id, { x: Number(event.target.value) })} className="w-full" /></label>
                <label className="space-y-2 text-xs text-muted-foreground">Vertical <input type="range" min={5} max={95} value={activeSticker.y} onChange={(event) => updateSticker(activeSticker.id, { y: Number(event.target.value) })} className="w-full" /></label>
                <label className="space-y-2 text-xs text-muted-foreground">Scale <input type="range" min={0.6} max={2.5} step={0.1} value={activeSticker.scale} onChange={(event) => updateSticker(activeSticker.id, { scale: Number(event.target.value) })} className="w-full" /></label>
                <label className="space-y-2 text-xs text-muted-foreground">Rotation <input type="range" min={-180} max={180} step={5} value={activeSticker.rotation} onChange={(event) => updateSticker(activeSticker.id, { rotation: Number(event.target.value) })} className="w-full" /></label>
                <button type="button" onClick={() => updateSticker(activeSticker.id, { scale: 1, rotation: 0 })} className="rounded-xl border border-white/30 bg-background/70 px-3 py-2 text-xs font-semibold">Reset transform</button>
                <button type="button" onClick={() => setStickers((current) => current.filter((item) => item.id !== activeSticker.id))} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">Remove sticker</button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a sticker on the preview to edit it.</p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Caption (optional)</p>
            <MentionInput
              value={caption}
              onChange={setCaption}
              rows={3}
              maxLength={200}
              placeholder="Add a caption and mention people with @username"
              className="w-full"
              textareaClassName="text-sm"
              disabled={uploading}
            />
            <p className="text-right text-[11px] text-muted-foreground">{caption.length}/200</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Text overlays</p>
                  <p className="text-xs text-muted-foreground">Place headline text directly on the story.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addOverlay}
                disabled={overlayTexts.length >= 5}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-background/70 px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Plus size={14} />
                Add text
              </button>
            </div>

            {overlayTexts.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/25 bg-background/50 px-4 py-5 text-sm text-muted-foreground">
                No overlay text yet. Add one to create an Instagram-style story card.
              </div>
            ) : (
              <div className="space-y-3">
                {overlayTexts.map((overlay, index) => (
                  <div key={overlay.id} className="space-y-3 rounded-[24px] border border-white/30 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">Text Layer {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeOverlay(overlay.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                    <MentionInput
                      value={overlay.text}
                      onChange={(value) => updateOverlay(overlay.id, { text: value.slice(0, 80) })}
                      placeholder="Overlay text"
                      rows={2}
                      maxLength={80}
                      className="w-full"
                      textareaClassName="text-sm"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 text-xs text-muted-foreground">
                        Horizontal Position
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={overlay.x}
                          onChange={(event) => updateOverlay(overlay.id, { x: Number(event.target.value) })}
                          className="w-full"
                        />
                      </label>
                      <label className="space-y-2 text-xs text-muted-foreground">
                        Vertical Position
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={overlay.y}
                          onChange={(event) => updateOverlay(overlay.id, { y: Number(event.target.value) })}
                          className="w-full"
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Color</p>
                        <div className="flex flex-wrap gap-2">
                          {TEXT_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => updateOverlay(overlay.id, { color })}
                              className={`h-8 w-8 rounded-full border ${overlay.color === color ? 'border-primary ring-2 ring-primary/30' : 'border-white/25'}`}
                              style={{ backgroundColor: color }}
                              aria-label={`Use ${color} text color`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Size</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['sm', 'md', 'lg'] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => updateOverlay(overlay.id, { size })}
                              className={`rounded-xl border px-2 py-2 text-xs font-semibold uppercase ${overlay.size === size ? 'border-primary bg-primary/10 text-foreground' : 'border-white/25 bg-background/70 text-muted-foreground'}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Background</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['none', 'soft', 'solid'] as const).map((background) => (
                            <button
                              key={background}
                              type="button"
                              onClick={() => updateOverlay(overlay.id, { background })}
                              className={`rounded-xl border px-2 py-2 text-xs font-semibold uppercase ${overlay.background === background ? 'border-primary bg-primary/10 text-foreground' : 'border-white/25 bg-background/70 text-muted-foreground'}`}
                            >
                              {background}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-[22px] border border-white/30 bg-background/70 px-4 py-4">
            <p className="text-sm font-semibold">Audience</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stories are shared only with mutual followers. Users must follow each other to view them.
            </p>
          </div>
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="w-full rounded-2xl bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-[0_20px_40px_-24px_rgba(15,23,42,0.9)] transition-all duration-300 disabled:opacity-60"
          >
            {uploading ? 'Uploading...' : 'Share to story'}
          </button>
        </FriendlyCard>
      </div>
    </div>
  );
};
