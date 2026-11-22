import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Move, 
  Crosshair, 
  SlidersHorizontal, 
  HelpCircle, 
  Plus, 
  Minus, 
  Maximize2, 
  Sparkles,
  Trash2,
  Crop
} from 'lucide-react';
import SafeZonesOverlay from './SafeZonesOverlay';
import { drawOverlays, renderVideoScene, computeCardVideoMetrics } from '../utils/videoProcessor';

export default function LivePreviewPlayer({
  videoItem,
  captionSettings,
  setCaptionSettings,
  watermarkSettings,
  setWatermarkSettings,
  watermarkImgElement,
  onClearLogo,
  tweetCardSettings,
  setTweetCardSettings,
  tweetAvatarImgElement,
  onClearTweetAvatar,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const cleanFrameBufferRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOverlays, setShowOverlays] = useState(true);
  const [videoBlobUrl, setVideoBlobUrl] = useState('');

  // Safe Zones platform: 'off' | 'tiktok' | 'reels' | 'shorts' | 'universal'
  const [safeZonePlatform, setSafeZonePlatform] = useState('off');
  const [safeZoneOpacity, setSafeZoneOpacity] = useState(85);

  // Dragging and Resizing interaction state
  const [dragTarget, setDragTarget] = useState(null); // null | 'caption' | 'watermark' | 'tweet'
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState(null); // null | 'caption' | 'watermark' | 'tweet'
  const [resizeCorner, setResizeCorner] = useState(null); // null | 'nw' | 'ne' | 'sw' | 'se' | 'w' | 'e'
  const [activeElement, setActiveElement] = useState('caption'); // 'caption' | 'watermark' | 'tweet' | null
  const [floatingFeedback, setFloatingFeedback] = useState(null); // { target, text }
  const [dragCoord, setDragCoord] = useState({ x: 50, y: 50 });
  const [showSnapGuides, setShowSnapGuides] = useState({ x: false, y: false });

  const resizeStartRef = useRef({
    target: null,
    corner: 'se',
    startX: 0,
    startY: 0,
    startFontSize: 60,
    startScale: 18,
    centerScreenX: 0,
    centerScreenY: 0,
    initialDistance: 1,
  });

  const feedbackTimerRef = useRef(null);

  // Default coordinate init
  const captionX = typeof captionSettings.xPercent === 'number' ? captionSettings.xPercent : 50;
  const captionY = typeof captionSettings.yPercent === 'number' 
    ? captionSettings.yPercent 
    : (captionSettings.position === 'top' ? 20 : captionSettings.position === 'bottom' ? 78 : 50);

  const watermarkX = typeof watermarkSettings.xPercent === 'number' 
    ? watermarkSettings.xPercent 
    : (watermarkSettings.anchor?.includes('left') ? 12 : watermarkSettings.anchor?.includes('center') ? 50 : 86);
  const watermarkY = typeof watermarkSettings.yPercent === 'number' 
    ? watermarkSettings.yPercent 
    : (watermarkSettings.anchor?.includes('bottom') ? 88 : watermarkSettings.anchor?.includes('center') ? 50 : 10);

  const tweetX = typeof tweetCardSettings?.xPercent === 'number' ? tweetCardSettings.xPercent : 50;
  const tweetY = typeof tweetCardSettings?.yPercent === 'number' 
    ? tweetCardSettings.yPercent 
    : (tweetCardSettings?.mode === 'frame' ? 16 : 20);

  // Centralized removal / delete handler for elements on canvas
  const handleDeleteElement = useCallback((target) => {
    if (target === 'caption') {
      setCaptionSettings(prev => ({ ...prev, text: '' }));
      setActiveElement(null);
      setFloatingFeedback({ target: 'caption', text: '🗑️ Legenda removida' });
    } else if (target === 'watermark') {
      if (onClearLogo) onClearLogo();
      setWatermarkSettings(prev => ({ ...prev, text: '', type: 'text' }));
      setActiveElement(null);
      setFloatingFeedback({ target: 'watermark', text: '🗑️ Landmark removida' });
    } else if (target === 'tweet') {
      setTweetCardSettings(prev => ({ ...prev, enabled: false }));
      setActiveElement(null);
      setFloatingFeedback({ target: 'tweet', text: '🗑️ Card Twitter desativado' });
    } else if (target === 'cardVideo') {
      setTweetCardSettings(prev => ({
        ...prev,
        videoFit: 'cover',
        videoScale: 100,
        videoHeightPercent: 48,
        videoCropOffsetY: 50,
        videoCropOffsetX: 50,
      }));
      setFloatingFeedback({ target: 'cardVideo', text: '↺ Enquadramento restaurado' });
    }

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFloatingFeedback(null);
    }, 1500);
  }, [setCaptionSettings, setWatermarkSettings, setTweetCardSettings, onClearLogo]);

  // Global Keyboard shortcut listener for Delete & Backspace
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Do not delete canvas elements if the user is typing in an input or textarea
      if (
        ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || 
        e.target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeElement) {
          e.preventDefault();
          handleDeleteElement(activeElement);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeElement, handleDeleteElement]);

  // Setup video source when selected item changes
  useEffect(() => {
    if (!videoItem || !videoItem.file) return;

    const url = URL.createObjectURL(videoItem.file);
    setVideoBlobUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoItem]);

  // Video loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      try {
        if (!cleanFrameBufferRef.current) cleanFrameBufferRef.current = document.createElement('canvas');
        const b = cleanFrameBufferRef.current;
        b.width = videoRef.current.videoWidth || 1080;
        b.height = videoRef.current.videoHeight || 1920;
        b.getContext('2d').drawImage(videoRef.current, 0, 0, b.width, b.height);
      } catch (e) {}
      drawCurrentFrame();
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Seek time
  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      drawCurrentFrame();
    }
  };

  // Frame drawing routine
  const isTwitterFrame = tweetCardSettings?.enabled && tweetCardSettings?.mode === 'frame';

  const drawCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Maintain a pristine clean video frame in buffer
    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        if (!cleanFrameBufferRef.current) cleanFrameBufferRef.current = document.createElement('canvas');
        const b = cleanFrameBufferRef.current;
        if (b.width !== video.videoWidth || b.height !== video.videoHeight) {
          b.width = video.videoWidth;
          b.height = video.videoHeight;
        }
        b.getContext('2d').drawImage(video, 0, 0, b.width, b.height);
      } catch (e) {}
    }

    const videoSource = (video.readyState >= 2 && video.videoWidth > 0)
      ? video
      : (cleanFrameBufferRef.current || video);

    const ctx = canvas.getContext('2d');
    const width = isTwitterFrame ? 1080 : ((video.videoWidth || cleanFrameBufferRef.current?.width) || 1080);
    const height = isTwitterFrame ? 1920 : ((video.videoHeight || cleanFrameBufferRef.current?.height) || 1920);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    if (showOverlays) {
      renderVideoScene(ctx, width, height, videoSource, {
        captionSettings: {
          ...captionSettings,
          xPercent: captionX,
          yPercent: captionY,
        },
        watermarkSettings: {
          ...watermarkSettings,
          xPercent: watermarkX,
          yPercent: watermarkY,
        },
        watermarkImgElement,
        tweetCardSettings: {
          ...tweetCardSettings,
          xPercent: tweetX,
          yPercent: tweetY,
        },
        tweetAvatarImgElement,
        videoMeta: {
          filename: videoItem?.file?.name || 'video.mp4',
          index: videoItem?.queueIndex || 0,
        },
      });
    } else {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      if (videoSource) {
        try {
          ctx.drawImage(videoSource, 0, 0, width, height);
        } catch (e) {}
      }
    }
  }, [showOverlays, isTwitterFrame, captionSettings, captionX, captionY, watermarkSettings, watermarkX, watermarkY, watermarkImgElement, tweetCardSettings, tweetX, tweetY, tweetAvatarImgElement, videoItem]);

  // Loop requestAnimationFrame while playing or settings update
  useEffect(() => {
    let animationFrame;

    const renderLoop = () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        drawCurrentFrame();
        setCurrentTime(videoRef.current.currentTime);
        animationFrame = requestAnimationFrame(renderLoop);
      }
    };

    if (isPlaying) {
      animationFrame = requestAnimationFrame(renderLoop);
    } else {
      drawCurrentFrame();
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, drawCurrentFrame]);

  // ========================================================
  // DRAG AND DROP HANDLERS (Direct On-Screen Manipulation)
  // ========================================================
  const handleMouseDown = (target, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragTarget(target);
    setIsDragging(true);
    setActiveElement(target);
  };

  // ========================================================
  // RESIZE HANDLERS (Corner Handles, Wheel, Quick Buttons)
  // ========================================================
  const handleResizeStart = (target, corner, e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeTarget(target);
    setResizeCorner(corner);
    setActiveElement(target);

    // Element center coordinate calculation for radial scaling
    const targetElement = e.currentTarget.closest('[data-overlay-box]');
    let centerScreenX = e.clientX;
    let centerScreenY = e.clientY;

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      centerScreenX = rect.left + rect.width / 2;
      centerScreenY = rect.top + rect.height / 2;
    }

    const initialDistance = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);

    resizeStartRef.current = {
      target,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startFontSize: target === 'caption' ? (captionSettings.fontSize || 60) : target === 'tweet' ? (tweetCardSettings?.fontSize || 32) : (watermarkSettings.fontSize || 32),
      startScale: target === 'cardVideo' ? (tweetCardSettings?.videoScale || 100) : target === 'tweet' ? (tweetCardSettings?.scale || (tweetCardSettings?.mode === 'frame' ? 92 : 90)) : (watermarkSettings.scale || 18),
      startHeightPercent: tweetCardSettings?.videoHeightPercent || 48,
      centerScreenX,
      centerScreenY,
      initialDistance: Math.max(15, initialDistance),
    };
  };

  const handleWheelResize = (target, e) => {
    e.preventDefault();
    e.stopPropagation();
    const isUp = e.deltaY < 0;
    const step = e.shiftKey ? 4 : 2;

    if (target === 'caption') {
      setCaptionSettings(prev => {
        const next = Math.max(18, Math.min(130, (prev.fontSize || 60) + (isUp ? step : -step)));
        setFloatingFeedback({ target: 'caption', text: `Tamanho Legenda: ${next}px` });
        return { ...prev, fontSize: next };
      });
    } else if (target === 'watermark') {
      if (watermarkSettings.type === 'logo') {
        setWatermarkSettings(prev => {
          const next = Math.max(6, Math.min(60, (prev.scale || 18) + (isUp ? 1 : -1)));
          setFloatingFeedback({ target: 'watermark', text: `Escala Landmark: ${next}%` });
          return { ...prev, scale: next };
        });
      } else {
        setWatermarkSettings(prev => {
          const next = Math.max(14, Math.min(90, (prev.fontSize || 32) + (isUp ? step : -step)));
          setFloatingFeedback({ target: 'watermark', text: `Tamanho Landmark: ${next}px` });
          return { ...prev, fontSize: next };
        });
      }
    } else if (target === 'tweet') {
      if (e.altKey || e.shiftKey) {
        setTweetCardSettings(prev => {
          const curScale = typeof prev.scale === 'number' ? prev.scale : (prev.mode === 'frame' ? 92 : 90);
          const next = Math.max(50, Math.min(100, curScale + (isUp ? 2 : -2)));
          setFloatingFeedback({ target: 'tweet', text: `Largura Card: ${next}%` });
          return { ...prev, scale: next };
        });
      } else {
        setTweetCardSettings(prev => {
          const next = Math.max(18, Math.min(64, (prev.fontSize || 32) + (isUp ? step : -step)));
          setFloatingFeedback({ target: 'tweet', text: `Tamanho Tweet: ${next}px` });
          return { ...prev, fontSize: next };
        });
      }
    } else if (target === 'cardVideo') {
      if (e.altKey || e.shiftKey) {
        setTweetCardSettings(prev => {
          const curH = prev.videoHeightPercent || 48;
          const next = Math.max(30, Math.min(70, curH + (isUp ? 2 : -2)));
          setFloatingFeedback({ target: 'cardVideo', text: `Altura Moldura: ${next}%` });
          return { ...prev, videoHeightPercent: next, videoFit: 'custom' };
        });
      } else {
        setTweetCardSettings(prev => {
          const curZ = prev.videoScale || 100;
          const next = Math.max(70, Math.min(200, curZ + (isUp ? 5 : -5)));
          setFloatingFeedback({ target: 'cardVideo', text: `Zoom Vídeo: ${next}%` });
          return { ...prev, videoScale: next };
        });
      }
    }

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFloatingFeedback(null);
    }, 1500);
  };

  const handleStepSize = (target, delta, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (target === 'caption') {
      setCaptionSettings(prev => {
        const next = Math.max(18, Math.min(130, (prev.fontSize || 60) + delta));
        setFloatingFeedback({ target: 'caption', text: `Tamanho Legenda: ${next}px` });
        return { ...prev, fontSize: next };
      });
    } else if (target === 'watermark') {
      if (watermarkSettings.type === 'logo') {
        setWatermarkSettings(prev => {
          const next = Math.max(6, Math.min(60, (prev.scale || 18) + (delta > 0 ? 2 : -2)));
          setFloatingFeedback({ target: 'watermark', text: `Escala Landmark: ${next}%` });
          return { ...prev, scale: next };
        });
      } else {
        setWatermarkSettings(prev => {
          const next = Math.max(14, Math.min(90, (prev.fontSize || 32) + delta));
          setFloatingFeedback({ target: 'watermark', text: `Tamanho Landmark: ${next}px` });
          return { ...prev, fontSize: next };
        });
      }
    } else if (target === 'tweet') {
      setTweetCardSettings(prev => {
        const next = Math.max(18, Math.min(64, (prev.fontSize || 32) + delta));
        setFloatingFeedback({ target: 'tweet', text: `Tamanho Tweet: ${next}px` });
        return { ...prev, fontSize: next };
      });
    } else if (target === 'cardVideo') {
      setTweetCardSettings(prev => {
        const next = Math.max(70, Math.min(200, (prev.videoScale || 100) + delta));
        setFloatingFeedback({ target: 'cardVideo', text: `Zoom Vídeo: ${next}%` });
        return { ...prev, videoScale: next };
      });
    }

    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFloatingFeedback(null);
    }, 1500);
  };

  const handleMouseMove = useCallback((e) => {
    // 1. Resizing Active
    if (isResizing && resizeTarget) {
      const { target, corner, startFontSize, startScale, startHeightPercent, startX, startY, centerScreenX, centerScreenY, initialDistance } = resizeStartRef.current;
      const currentDistance = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY);
      const ratio = currentDistance / initialDistance;

      if (target === 'caption') {
        const newFontSize = Math.max(18, Math.min(130, Math.round(startFontSize * ratio)));
        setCaptionSettings(prev => ({ ...prev, fontSize: newFontSize }));
        setFloatingFeedback({ target: 'caption', text: `Tamanho Legenda: ${newFontSize}px` });
      } else if (target === 'watermark') {
        if (watermarkSettings.type === 'logo') {
          const newScale = Math.max(6, Math.min(60, Math.round(startScale * ratio)));
          setWatermarkSettings(prev => ({ ...prev, scale: newScale }));
          setFloatingFeedback({ target: 'watermark', text: `Escala Landmark: ${newScale}%` });
        } else {
          const newFontSize = Math.max(14, Math.min(90, Math.round(startFontSize * ratio)));
          setWatermarkSettings(prev => ({ ...prev, fontSize: newFontSize }));
          setFloatingFeedback({ target: 'watermark', text: `Tamanho Landmark: ${newFontSize}px` });
        }
      } else if (target === 'tweet') {
        if (corner === 'w' || corner === 'e') {
          const currentHorizDist = Math.abs(e.clientX - centerScreenX);
          const initialHorizDist = Math.max(15, Math.abs(startX - centerScreenX) || initialDistance * 0.7);
          const horizRatio = currentHorizDist / initialHorizDist;
          const newScale = Math.max(50, Math.min(100, Math.round(startScale * horizRatio)));
          setTweetCardSettings(prev => ({ ...prev, scale: newScale }));
          setFloatingFeedback({ target: 'tweet', text: `Largura Card: ${newScale}%` });
        } else {
          const newFontSize = Math.max(18, Math.min(64, Math.round(startFontSize * ratio)));
          const newScale = Math.max(50, Math.min(100, Math.round(startScale * ratio)));
          setTweetCardSettings(prev => ({ ...prev, fontSize: newFontSize, scale: newScale }));
          setFloatingFeedback({ target: 'tweet', text: `Card: ${newScale}% • Fonte: ${newFontSize}px` });
        }
      } else if (target === 'cardVideo') {
        if (corner === 'n' || corner === 's') {
          const deltaY = (e.clientY - startY) * (corner === 's' ? 1 : -1);
          const heightStep = Math.round(deltaY / 4);
          const newH = Math.max(30, Math.min(70, (startHeightPercent || 48) + heightStep));
          setTweetCardSettings(prev => ({ ...prev, videoHeightPercent: newH, videoFit: 'custom' }));
          setFloatingFeedback({ target: 'cardVideo', text: `Altura Moldura: ${newH}%` });
        } else {
          const newScale = Math.max(70, Math.min(200, Math.round(startScale * ratio)));
          setTweetCardSettings(prev => ({ ...prev, videoScale: newScale }));
          setFloatingFeedback({ target: 'cardVideo', text: `Zoom Vídeo: ${newScale}%` });
        }
      }
      return;
    }

    // 2. Dragging Active
    if (!isDragging || !dragTarget || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let rawX = ((e.clientX - rect.left) / rect.width) * 100;
    let rawY = ((e.clientY - rect.top) / rect.height) * 100;

    // Bounds constraint
    let newX = Math.max(6, Math.min(94, Math.round(rawX)));
    let newY = Math.max(6, Math.min(94, Math.round(rawY)));

    // Smart Center Magnetic Snapping (Snap when within 2.5%)
    let snapX = false;
    let snapY = false;

    if (Math.abs(newX - 50) < 3.5) {
      newX = 50;
      snapX = true;
    }
    if (Math.abs(newY - 50) < 3.5) {
      newY = 50;
      snapY = true;
    }

    setShowSnapGuides({ x: snapX, y: snapY });
    setDragCoord({ x: newX, y: newY });

    if (dragTarget === 'cardVideo') {
      // Direct Framing / Pan adjustment
      setTweetCardSettings(prev => ({
        ...prev,
        videoCropOffsetX: newX,
        videoCropOffsetY: newY,
      }));
      setFloatingFeedback({ target: 'cardVideo', text: `Enquadramento: X:${newX}% Y:${newY}%` });
      return;
    }

    if (dragTarget === 'caption') {
      setCaptionSettings(prev => ({
        ...prev,
        xPercent: newX,
        yPercent: newY,
      }));
    } else if (dragTarget === 'watermark') {
      setWatermarkSettings(prev => ({
        ...prev,
        xPercent: newX,
        yPercent: newY,
      }));
    } else if (dragTarget === 'tweet') {
      setTweetCardSettings(prev => ({
        ...prev,
        xPercent: newX,
        yPercent: newY,
      }));
    }
  }, [isResizing, resizeTarget, isDragging, dragTarget, watermarkSettings.type, setCaptionSettings, setWatermarkSettings, setTweetCardSettings]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragTarget(null);
      setShowSnapGuides({ x: false, y: false });
    }
    if (isResizing) {
      setIsResizing(false);
      setResizeTarget(null);
      setResizeCorner(null);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => {
        setFloatingFeedback(null);
      }, 1000);
    }
  }, [isDragging, isResizing]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  if (!videoItem) {
    return (
      <div className="glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[420px]">
        <div className="w-12 h-12 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center mb-3 border border-white/[0.08]">
          <Play className="w-8 h-8 opacity-50" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">Nenhum corte selecionado</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Faça upload de vídeos ou gere cortes de teste para visualizar os modificadores ao vivo
        </p>
      </div>
    );
  }

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="glass-panel p-5 flex flex-col items-center">
      {/* Top Bar with title & controls */}
      <div className="w-full flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-white truncate">
            <span className="text-slate-400 font-normal">Preview</span> <span className="tc text-slate-100 font-normal">{videoItem.file.name}</span>
          </span>
        </div>

        {/* View toggles */}
        <button
          onClick={() => {
            setShowOverlays(!showOverlays);
            setTimeout(drawCurrentFrame, 50);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
            showOverlays
              ? 'bg-slate-800 text-slate-100 border border-white/10'
              : 'bg-slate-800 text-slate-400 border border-white/5'
          }`}
          title="Alternar visibilidade das legendas e marca d'água"
        >
          {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {showOverlays ? 'Efeitos visíveis' : 'Vídeo limpo'}
        </button>
      </div>

      {/* ========================================================
          SAFE ZONES PLATFORM SELECTOR TABS
          ======================================================== */}
      <div className="w-full max-w-[340px] mb-3 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1">
            <Crosshair className="w-3.5 h-3.5 text-slate-500" />
            Zonas seguras
          </span>
          <span className="text-slate-500 text-[11px]">
            {safeZonePlatform === 'off' ? 'Desativadas' : 'Ativas na tela'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-lg border border-white/10 text-xs">
          {/* Desativado */}
          <button
            type="button"
            onClick={() => setSafeZonePlatform('off')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              safeZonePlatform === 'off'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Off
          </button>

          {/* TikTok */}
          <button
            type="button"
            onClick={() => setSafeZonePlatform('tiktok')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
              safeZonePlatform === 'tiktok'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Guia Oficial do TikTok"
          >
            TikTok
          </button>

          {/* Instagram Reels */}
          <button
            type="button"
            onClick={() => setSafeZonePlatform('reels')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
              safeZonePlatform === 'reels'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Guia Oficial do Instagram Reels"
          >
            Reels
          </button>

          {/* YouTube Shorts */}
          <button
            type="button"
            onClick={() => setSafeZonePlatform('shorts')}
            className={`py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
              safeZonePlatform === 'shorts'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Guia Oficial do YouTube Shorts"
          >
            Shorts
          </button>

          {/* Universal Combinada */}
          <button
            type="button"
            onClick={() => setSafeZonePlatform('universal')}
            className={`py-1 rounded-lg text-[11px] font-bold transition-colors ${
              safeZonePlatform === 'universal'
                ? 'bg-slate-700 text-white'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
            title="Área 100% Segura Combinada para todas as plataformas"
          >
            ★ Todas
          </button>
        </div>
      </div>

      {/* Screen Frame Container with Interactive Drag Layer */}
      <div 
        ref={containerRef}
        onClick={(e) => {
          if (e.target === containerRef.current || e.target === canvasRef.current) {
            setActiveElement(null);
          }
        }}
        className="relative w-full max-w-[340px] aspect-[9/16] bg-black/95 rounded-2xl overflow-hidden border border-white/20 shadow-2xl flex items-center justify-center group select-none cursor-default"
      >
        {/* Off-screen active video element used as frame source */}
        <video
          ref={videoRef}
          src={videoBlobUrl}
          playsInline
          muted
          loop
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onSeeked={() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                if (!cleanFrameBufferRef.current) cleanFrameBufferRef.current = document.createElement('canvas');
                const b = cleanFrameBufferRef.current;
                b.width = videoRef.current.videoWidth || 1080;
                b.height = videoRef.current.videoHeight || 1920;
                b.getContext('2d').drawImage(videoRef.current, 0, 0, b.width, b.height);
              } catch (e) {}
              drawCurrentFrame();
            }
          }}
          onEnded={() => setIsPlaying(false)}
          style={{
            position: 'fixed',
            top: '-99999px',
            left: '-99999px',
            width: '320px',
            height: '180px',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -100,
          }}
        />

        {/* Video Canvas Layer */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
        />

        {/* ========================================================
            MAGNETIC SNAP GUIDELINES (Center Vertical & Horizontal)
            ======================================================== */}
        {showSnapGuides.x && (
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-accent pointer-events-none z-30" />
        )}
        {showSnapGuides.y && (
          <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-accent pointer-events-none z-30" />
        )}

        {/* ========================================================
            SAFE ZONES OVERLAY LAYER
            ======================================================== */}
        <SafeZonesOverlay 
          platform={safeZonePlatform} 
          opacity={safeZoneOpacity} 
        />

        {/* ========================================================
            CANVA-INSPIRED INTERACTIVE OVERLAY: CAPTION
            ======================================================== */}
        {showOverlays && captionSettings.text && (
          <div
            data-overlay-box="caption"
            onClick={(e) => {
              e.stopPropagation();
              setActiveElement('caption');
            }}
            onMouseDown={(e) => handleMouseDown('caption', e)}
            onWheel={(e) => handleWheelResize('caption', e)}
            style={{
              left: `${captionX}%`,
              top: `${captionY}%`,
              width: `${Math.max(80, Math.min(310, Math.round(Math.max(...(captionSettings.text || '').split('\n').map(l => l.length), 4) * ((captionSettings.fontSize || 60) * ((containerRef.current?.clientWidth || 320) / 1080) * 0.58) + 24)))}px`,
              height: `${Math.max(28, Math.round(((captionSettings.text || '').split('\n').length || 1) * ((captionSettings.fontSize || 60) * ((containerRef.current?.clientWidth || 320) / 1080) * 1.25) + 12))}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-30 cursor-move transition-colors bg-transparent flex items-center justify-center ${
              activeElement === 'caption'
                ? 'border-[1.5px] border-[#7D2AE8]'
                : 'border border-transparent hover:border-[#7D2AE8]/40'
            }`}
          >
            {/* Canva Top Floating Toolbar (Image 1) */}
            {activeElement === 'caption' && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.35)] border border-slate-200/90 px-2 py-1 flex items-center gap-1.5 z-40 select-none whitespace-nowrap pointer-events-auto"
                style={{
                  top: captionY < 18 ? 'calc(100% + 12px)' : '-44px',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Step Minus */}
                <button
                  type="button"
                  onClick={(e) => handleStepSize('caption', -3, e)}
                  className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                  title="Diminuir tamanho (-3px)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Direct Px Input */}
                <div className="flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200/70 rounded-md px-1.5 py-0.5 border border-slate-200 focus-within:border-[#7D2AE8] focus-within:ring-1 focus-within:ring-[#7D2AE8] transition-colors">
                  <input
                    type="number"
                    min={18}
                    max={140}
                    value={captionSettings.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setCaptionSettings(prev => ({ ...prev, fontSize: Math.max(18, Math.min(140, val)) }));
                      }
                    }}
                    className="w-8 text-[11px] font-bold text-center bg-transparent text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    title="Digite os pixels desejados"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold select-none">px</span>
                </div>

                {/* Step Plus */}
                <button
                  type="button"
                  onClick={(e) => handleStepSize('caption', +3, e)}
                  className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                  title="Aumentar tamanho (+3px)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                {/* Quick Px Preset Pills */}
                <div className="flex items-center gap-0.5">
                  {[48, 64, 80, 96].map(px => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => setCaptionSettings(prev => ({ ...prev, fontSize: px }))}
                      className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                        captionSettings.fontSize === px
                          ? 'bg-[#7D2AE8] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-[#7D2AE8]'
                      }`}
                    >
                      {px}
                    </button>
                  ))}
                </div>

                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                {/* Delete button in toolbar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteElement('caption');
                  }}
                  className="w-5 h-5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                  title="Remover legenda do vídeo (ou tecla Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Canva Handles (only visible when selected) */}
            {activeElement === 'caption' && (
              <>
                {/* 4 Corner Round Handles (Image 1, 2, 3) */}
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'nw', e)}
                  className={`absolute -top-1.5 -left-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'caption' && resizeCorner === 'nw'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'ne', e)}
                  className={`absolute -top-1.5 -right-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'caption' && resizeCorner === 'ne'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'sw', e)}
                  className={`absolute -bottom-1.5 -left-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'caption' && resizeCorner === 'sw'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'se', e)}
                  className={`absolute -bottom-1.5 -right-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'caption' && resizeCorner === 'se'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />

                {/* 2 Side Pill Handles (Image 1) */}
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'w', e)}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                  title="Ajustar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('caption', 'e', e)}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                  title="Ajustar"
                />

                {/* Canva Bottom Action Handles (Image 1) */}
                <div 
                  className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCaptionSettings(prev => ({ ...prev, xPercent: 50, yPercent: 50 }));
                    }}
                    className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                    title="Centralizar no vídeo"
                  >
                    <Crosshair className="w-3 h-3" />
                  </button>
                  <div
                    onMouseDown={(e) => handleMouseDown('caption', e)}
                    className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center cursor-move transition-colors"
                    title="Arraste para mover"
                  >
                    <Move className="w-3 h-3" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteElement('caption');
                    }}
                    className="w-6 h-6 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-500 border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                    title="Remover legenda (Del)"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {/* Canva Live Drag/Resize Dimension Tooltip Badge (Image 2 & 3) */}
            {(isResizing || isDragging) && activeElement === 'caption' && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#18191b] text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md shadow-xl border border-white/10 z-50 whitespace-nowrap pointer-events-none flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100">
                <span>l: <strong className="text-white">{Math.round(Math.max(...(captionSettings.text || '').split('\n').map(l => l.length), 4) * ((captionSettings.fontSize || 60) * ((containerRef.current?.clientWidth || 320) / 1080) * 0.58) + 24)}</strong></span>
                <span>a: <strong className="text-white">{Math.round(((captionSettings.text || '').split('\n').length || 1) * ((captionSettings.fontSize || 60) * ((containerRef.current?.clientWidth || 320) / 1080) * 1.25) + 12)}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="tc text-slate-100 font-medium">{captionSettings.fontSize}px</span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            CANVA-INSPIRED INTERACTIVE OVERLAY: WATERMARK / LANDMARK
            ======================================================== */}
        {showOverlays && (
          <div
            data-overlay-box="watermark"
            onClick={(e) => {
              e.stopPropagation();
              setActiveElement('watermark');
            }}
            onMouseDown={(e) => handleMouseDown('watermark', e)}
            onWheel={(e) => handleWheelResize('watermark', e)}
            style={{
              left: `${watermarkX}%`,
              top: `${watermarkY}%`,
              width: `${watermarkSettings.type === 'logo' ? Math.max(45, Math.round((containerRef.current?.clientWidth || 320) * ((watermarkSettings.scale || 18) / 100))) : Math.max(70, Math.round(((watermarkSettings.text || '').length || 8) * ((watermarkSettings.fontSize || 28) * ((containerRef.current?.clientWidth || 320) / 1080) * 0.58) + 20))}px`,
              height: `${watermarkSettings.type === 'logo' ? Math.max(24, Math.round(Math.max(45, Math.round((containerRef.current?.clientWidth || 320) * ((watermarkSettings.scale || 18) / 100))) * 0.65)) : Math.max(26, Math.round(((watermarkSettings.fontSize || 28) * ((containerRef.current?.clientWidth || 320) / 1080) * 1.25) + 10))}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute z-30 cursor-move transition-colors bg-transparent flex items-center justify-center ${
              activeElement === 'watermark'
                ? 'border-[1.5px] border-[#7D2AE8]'
                : 'border border-transparent hover:border-[#7D2AE8]/40'
            }`}
          >
            {/* Canva Top Floating Toolbar (Image 1) */}
            {activeElement === 'watermark' && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.35)] border border-slate-200/90 px-2 py-1 flex items-center gap-1.5 z-40 select-none whitespace-nowrap pointer-events-auto"
                style={{
                  top: watermarkY < 18 ? 'calc(100% + 12px)' : '-44px',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Step Minus */}
                <button
                  type="button"
                  onClick={(e) => handleStepSize('watermark', -2, e)}
                  className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                  title="Diminuir"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                {/* Direct Input */}
                <div className="flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200/70 rounded-md px-1.5 py-0.5 border border-slate-200 focus-within:border-[#7D2AE8] focus-within:ring-1 focus-within:ring-[#7D2AE8] transition-colors">
                  <input
                    type="number"
                    min={watermarkSettings.type === 'logo' ? 6 : 14}
                    max={watermarkSettings.type === 'logo' ? 60 : 90}
                    value={watermarkSettings.type === 'logo' ? watermarkSettings.scale : (watermarkSettings.fontSize || 32)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        if (watermarkSettings.type === 'logo') {
                          setWatermarkSettings(prev => ({ ...prev, scale: Math.max(6, Math.min(60, val)) }));
                        } else {
                          setWatermarkSettings(prev => ({ ...prev, fontSize: Math.max(14, Math.min(90, val)) }));
                        }
                      }
                    }}
                    className="w-8 text-[11px] font-bold text-center bg-transparent text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    title={watermarkSettings.type === 'logo' ? 'Digite a porcentagem de escala' : 'Digite o tamanho em px'}
                  />
                  <span className="text-[11px] text-slate-500 font-semibold select-none">
                    {watermarkSettings.type === 'logo' ? '%' : 'px'}
                  </span>
                </div>

                {/* Step Plus */}
                <button
                  type="button"
                  onClick={(e) => handleStepSize('watermark', +2, e)}
                  className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                  title="Aumentar"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                {/* Quick Presets */}
                <div className="flex items-center gap-0.5">
                  {(watermarkSettings.type === 'logo' ? [12, 18, 26, 34] : [20, 28, 36, 48]).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        if (watermarkSettings.type === 'logo') {
                          setWatermarkSettings(prev => ({ ...prev, scale: val }));
                        } else {
                          setWatermarkSettings(prev => ({ ...prev, fontSize: val }));
                        }
                      }}
                      className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                        (watermarkSettings.type === 'logo' ? watermarkSettings.scale : watermarkSettings.fontSize) === val
                          ? 'bg-[#7D2AE8] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-[#7D2AE8]'
                      }`}
                    >
                      {val}{watermarkSettings.type === 'logo' ? '%' : ''}
                    </button>
                  ))}
                </div>

                <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                {/* Delete button in toolbar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteElement('watermark');
                  }}
                  className="w-5 h-5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                  title="Remover landmark do vídeo (ou tecla Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Canva Handles (only visible when selected) */}
            {activeElement === 'watermark' && (
              <>
                {/* 4 Corner Round Handles */}
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'nw', e)}
                  className={`absolute -top-1.5 -left-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'watermark' && resizeCorner === 'nw'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'ne', e)}
                  className={`absolute -top-1.5 -right-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'watermark' && resizeCorner === 'ne'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'sw', e)}
                  className={`absolute -bottom-1.5 -left-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'watermark' && resizeCorner === 'sw'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'se', e)}
                  className={`absolute -bottom-1.5 -right-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                    isResizing && resizeTarget === 'watermark' && resizeCorner === 'se'
                      ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                      : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                  }`}
                  title="Puxe para redimensionar"
                />

                {/* 2 Side Pill Handles */}
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'w', e)}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                  title="Ajustar"
                />
                <div
                  onMouseDown={(e) => handleResizeStart('watermark', 'e', e)}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                  title="Ajustar"
                />

                {/* Canva Bottom Action Handles (Image 1) */}
                <div 
                  className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-auto"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setWatermarkSettings(prev => ({ ...prev, xPercent: 50, yPercent: 50 }));
                    }}
                    className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                    title="Centralizar no vídeo"
                  >
                    <Crosshair className="w-3 h-3" />
                  </button>
                  <div
                    onMouseDown={(e) => handleMouseDown('watermark', e)}
                    className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center cursor-move transition-colors"
                    title="Arraste para mover"
                  >
                    <Move className="w-3 h-3" />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteElement('watermark');
                    }}
                    className="w-6 h-6 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-500 border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                    title="Remover landmark (Del)"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}

            {/* Canva Live Drag/Resize Dimension Tooltip Badge (Image 2 & 3) */}
            {(isResizing || isDragging) && activeElement === 'watermark' && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#18191b] text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md shadow-xl border border-white/10 z-50 whitespace-nowrap pointer-events-none flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100">
                <span>l: <strong className="text-white">{watermarkSettings.type === 'logo' ? Math.max(45, Math.round((containerRef.current?.clientWidth || 320) * ((watermarkSettings.scale || 18) / 100))) : Math.max(70, Math.round(((watermarkSettings.text || '').length || 8) * ((watermarkSettings.fontSize || 28) * ((containerRef.current?.clientWidth || 320) / 1080) * 0.58) + 20))}</strong></span>
                <span>a: <strong className="text-white">{watermarkSettings.type === 'logo' ? Math.max(24, Math.round(Math.max(45, Math.round((containerRef.current?.clientWidth || 320) * ((watermarkSettings.scale || 18) / 100))) * 0.65)) : Math.max(26, Math.round(((watermarkSettings.fontSize || 28) * ((containerRef.current?.clientWidth || 320) / 1080) * 1.25) + 10))}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="tc text-slate-100 font-medium">
                  {watermarkSettings.type === 'logo' ? `${watermarkSettings.scale}%` : `${watermarkSettings.fontSize || 32}px`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            CANVA-INSPIRED INTERACTIVE OVERLAY: TWITTER / X CARD
            ======================================================== */}
        {showOverlays && tweetCardSettings?.enabled && (() => {
          const tweetScale = typeof tweetCardSettings.scale === 'number' 
            ? tweetCardSettings.scale 
            : (tweetCardSettings.mode === 'frame' ? 92 : 90);
          const cWidth = containerRef.current?.clientWidth || 320;
          const tweetBoxWidth = Math.max(140, Math.round(cWidth * (tweetScale / 100)));
          const tweetLineCount = Math.max(1, (tweetCardSettings.text || '').split('\n').length);
          const tweetBoxHeight = Math.max(54, Math.round(((tweetCardSettings.fontSize || 32) * (cWidth / 1080) * 1.35) * tweetLineCount + 55));

          return (
            <div
              data-overlay-box="tweet"
              onClick={(e) => {
                e.stopPropagation();
                setActiveElement('tweet');
              }}
              onMouseDown={(e) => {
                handleMouseDown('tweet', e);
              }}
              onWheel={(e) => handleWheelResize('tweet', e)}
              style={{
                left: `${tweetX}%`,
                top: `${tweetY}%`,
                width: `${tweetBoxWidth}px`,
                height: `${tweetBoxHeight}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute z-30 transition-colors bg-transparent flex items-center justify-center cursor-move ${
                activeElement === 'tweet'
                  ? 'border-[1.5px] border-[#7D2AE8]'
                  : 'border border-transparent hover:border-[#7D2AE8]/40'
              }`}
            >
              {/* Canva Top Floating Toolbar */}
              {activeElement === 'tweet' && (
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.35)] border border-slate-200/90 px-2 py-1 flex items-center gap-1.5 z-40 select-none whitespace-nowrap pointer-events-auto"
                  style={{ top: '-44px' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Step Minus */}
                  <button
                    type="button"
                    onClick={(e) => handleStepSize('tweet', -2, e)}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                    title="Diminuir fonte (-2px)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Direct Px Input */}
                  <div className="flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200/70 rounded-md px-1.5 py-0.5 border border-slate-200 focus-within:border-[#7D2AE8] focus-within:ring-1 focus-within:ring-[#7D2AE8] transition-colors">
                    <input
                      type="number"
                      min={18}
                      max={64}
                      value={tweetCardSettings.fontSize || 32}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setTweetCardSettings(prev => ({ ...prev, fontSize: Math.max(18, Math.min(64, val)) }));
                        }
                      }}
                      className="w-8 text-[11px] font-bold text-center bg-transparent text-slate-800 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      title="Tamanho da fonte em px"
                    />
                    <span className="text-[11px] text-slate-500 font-semibold select-none">px</span>
                  </div>

                  {/* Step Plus */}
                  <button
                    type="button"
                    onClick={(e) => handleStepSize('tweet', +2, e)}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-[#7D2AE8] flex items-center justify-center transition-colors"
                    title="Aumentar fonte (+2px)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Quick Font Presets */}
                  <div className="flex items-center gap-0.5">
                    {[24, 28, 32, 38].map(px => (
                      <button
                        key={px}
                        type="button"
                        onClick={() => setTweetCardSettings(prev => ({ ...prev, fontSize: px }))}
                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                          tweetCardSettings.fontSize === px
                            ? 'bg-[#7D2AE8] text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-[#7D2AE8]'
                        }`}
                      >
                        {px}
                      </button>
                    ))}
                  </div>

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Card Width Quick Scale Presets */}
                  <div className="flex items-center gap-0.5">
                    {[75, 92, 100].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTweetCardSettings(prev => ({ ...prev, scale: s }))}
                        className={`px-1.5 py-0.5 text-[11px] font-bold rounded transition-colors ${
                          tweetScale === s
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-sky-600'
                        }`}
                        title={`Largura do card: ${s}%`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Delete button in toolbar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteElement('tweet');
                    }}
                    className="w-5 h-5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                    title="Remover / Desativar Card Twitter (ou tecla Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Canva Handles (visible when selected) */}
              {activeElement === 'tweet' && (
                <>
                  {/* 4 Corner Round Handles */}
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'nw', e)}
                    className={`absolute -top-1.5 -left-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                      isResizing && resizeTarget === 'tweet' && resizeCorner === 'nw'
                        ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                        : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                    }`}
                    title="Puxe para redimensionar o card e o texto"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'ne', e)}
                    className={`absolute -top-1.5 -right-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                      isResizing && resizeTarget === 'tweet' && resizeCorner === 'ne'
                        ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                        : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                    }`}
                    title="Puxe para redimensionar o card e o texto"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'sw', e)}
                    className={`absolute -bottom-1.5 -left-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 ${
                      isResizing && resizeTarget === 'tweet' && resizeCorner === 'sw'
                        ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                        : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                    }`}
                    title="Puxe para redimensionar o card e o texto"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'se', e)}
                    className={`absolute -bottom-1.5 -right-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 ${
                      isResizing && resizeTarget === 'tweet' && resizeCorner === 'se'
                        ? 'w-3.5 h-3.5 bg-[#7D2AE8] border-[1.5px] border-white scale-110 shadow-md'
                        : 'w-3 h-3 bg-white border-[1.5px] border-[#7D2AE8]'
                    }`}
                    title="Puxe para redimensionar o card e o texto"
                  />

                  {/* 2 Side Pill Handles for direct card width scaling */}
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'w', e)}
                    className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                    title="Puxe para ajustar largura do card"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('tweet', 'e', e)}
                    className="absolute top-1/2 -right-1 -translate-y-1/2 w-1.5 h-3.5 bg-white border border-[#7D2AE8] rounded-full shadow-xs cursor-ew-resize transition-transform z-30"
                    title="Puxe para ajustar largura do card"
                  />

                  {/* Canva Bottom Action Handles */}
                  <div 
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTweetCardSettings(prev => ({ 
                          ...prev, 
                          xPercent: 50, 
                          yPercent: prev.mode === 'frame' ? 16 : 20 
                        }));
                      }}
                      className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                      title="Centralizar no topo"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                    <div
                      onMouseDown={(e) => handleMouseDown('tweet', e)}
                      className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-[#7D2AE8] border border-slate-200/90 rounded-full shadow-md flex items-center justify-center cursor-move transition-colors"
                      title="Arraste para mover o card"
                    >
                      <Move className="w-3 h-3" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteElement('tweet');
                      }}
                      className="w-6 h-6 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-500 border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                      title="Remover / Desativar Card Twitter (Del)"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}

              {/* Canva Live Drag/Resize Dimension Tooltip Badge */}
              {(isResizing || isDragging) && activeElement === 'tweet' && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#18191b] text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md shadow-xl border border-white/10 z-50 whitespace-nowrap pointer-events-none flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100">
                  <span>l: <strong className="text-white">{tweetBoxWidth}</strong></span>
                  <span>a: <strong className="text-white">{tweetBoxHeight}</strong></span>
                  <span className="text-slate-500">•</span>
                  <span className="text-sky-300 font-bold">{tweetScale}%</span>
                  <span className="text-slate-500">•</span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings.fontSize || 32}px</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================
            CANVA-INSPIRED INTERACTIVE OVERLAY: CARD VIDEO (9:16 FRAME)
            ======================================================== */}
        {showOverlays && tweetCardSettings?.enabled && tweetCardSettings?.mode === 'frame' && (() => {
          const cWidth = containerRef.current?.clientWidth || 320;
          const scaleRatio = cWidth / 1080;

          const vSourceWidth = (videoRef.current && (videoRef.current.videoWidth || cleanFrameBufferRef.current?.width)) || 1080;
          const vSourceHeight = (videoRef.current && (videoRef.current.videoHeight || cleanFrameBufferRef.current?.height)) || 1920;

          const metrics = computeCardVideoMetrics({
            width: 1080,
            height: 1920,
            tweetCardSettings,
            videoWidth: vSourceWidth,
            videoHeight: vSourceHeight,
          });

          const boxX = Math.round(metrics.boxX * scaleRatio);
          const boxY = Math.round(metrics.boxY * scaleRatio);
          const boxWidth = Math.round(metrics.boxWidth * scaleRatio);
          const boxHeight = Math.round(metrics.boxHeight * scaleRatio);

          const isCardVideoActive = activeElement === 'cardVideo';

          return (
            <div
              data-overlay-box="cardVideo"
              onClick={(e) => {
                e.stopPropagation();
                setActiveElement('cardVideo');
              }}
              onMouseDown={(e) => {
                handleMouseDown('cardVideo', e);
              }}
              onWheel={(e) => handleWheelResize('cardVideo', e)}
              style={{
                left: `${boxX}px`,
                top: `${boxY}px`,
                width: `${boxWidth}px`,
                height: `${boxHeight}px`,
              }}
              className={`absolute z-20 transition-colors bg-transparent flex items-center justify-center cursor-move select-none ${
                isCardVideoActive
                  ? 'border-[2px] border-sky-400 ring-2 ring-sky-400/20 shadow-md'
                  : 'border border-transparent hover:border-sky-400/40'
              }`}
            >
              {/* Canva Top Floating Toolbar for Video */}
              {isCardVideoActive && (
                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-white text-slate-800 rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.35)] border border-slate-200/90 px-2 py-1 flex items-center gap-1.5 z-40 select-none whitespace-nowrap pointer-events-auto"
                  style={{ top: '-44px' }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Fit Mode Switcher */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    {[
                      { id: 'cover', label: 'Cover' },
                      { id: 'contain', label: 'Contain' },
                      { id: 'square', label: '1:1' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTweetCardSettings(prev => ({ ...prev, videoFit: mode.id }));
                          setFloatingFeedback({ target: 'cardVideo', text: `Modo: ${mode.label}` });
                        }}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-colors ${
                          (tweetCardSettings.videoFit || 'cover') === mode.id
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'text-slate-600 hover:text-sky-600 hover:bg-slate-200/60'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Step Zoom Minus */}
                  <button
                    type="button"
                    onClick={(e) => handleStepSize('cardVideo', -5, e)}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-500 flex items-center justify-center transition-colors"
                    title="Diminuir zoom (-5%)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Direct Zoom Input / Badge */}
                  <div className="flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-semibold select-none">Zoom:</span>
                    <span className="text-[11px] font-bold text-sky-600 select-none font-mono">
                      {tweetCardSettings.videoScale || 100}%
                    </span>
                  </div>

                  {/* Step Zoom Plus */}
                  <button
                    type="button"
                    onClick={(e) => handleStepSize('cardVideo', +5, e)}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-600 hover:text-sky-500 flex items-center justify-center transition-colors"
                    title="Aumentar zoom (+5%)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

                  {/* Reset Crop Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTweetCardSettings(prev => ({
                        ...prev,
                        videoFit: 'cover',
                        videoScale: 100,
                        videoHeightPercent: 48,
                        videoCropOffsetY: 50,
                        videoCropOffsetX: 50,
                      }));
                      setFloatingFeedback({ target: 'cardVideo', text: '↺ Enquadramento restaurado' });
                    }}
                    className="w-5 h-5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-sky-500 flex items-center justify-center transition-colors"
                    title="Restaurar corte padrão (100% cover)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Canva Handles (visible when selected) */}
              {isCardVideoActive && (
                <>
                  {/* 4 Corner Round Handles for Zooming */}
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 'nw', e)}
                    className="absolute -top-1.5 -left-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 w-3 h-3 bg-white border-[1.5px] border-sky-400"
                    title="Puxe para dar zoom no vídeo"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 'ne', e)}
                    className="absolute -top-1.5 -right-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 w-3 h-3 bg-white border-[1.5px] border-sky-400"
                    title="Puxe para dar zoom no vídeo"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 'sw', e)}
                    className="absolute -bottom-1.5 -left-1.5 rounded-full cursor-nesw-resize shadow-sm transition-transform z-30 w-3 h-3 bg-white border-[1.5px] border-sky-400"
                    title="Puxe para dar zoom no vídeo"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 'se', e)}
                    className="absolute -bottom-1.5 -right-1.5 rounded-full cursor-nwse-resize shadow-sm transition-transform z-30 w-3 h-3 bg-white border-[1.5px] border-sky-400"
                    title="Puxe para dar zoom no vídeo"
                  />

                  {/* 2 Top & Bottom Pill Handles for resizing frame height */}
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 'n', e)}
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white border border-sky-400 rounded-full shadow-xs cursor-ns-resize transition-transform z-30"
                    title="Puxe para redimensionar altura da moldura"
                  />
                  <div
                    onMouseDown={(e) => handleResizeStart('cardVideo', 's', e)}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-white border border-sky-400 rounded-full shadow-xs cursor-ns-resize transition-transform z-30"
                    title="Puxe para redimensionar altura da moldura"
                  />

                  {/* Canva Bottom Action Handles */}
                  <div 
                    className="absolute -bottom-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTweetCardSettings(prev => ({
                          ...prev,
                          videoCropOffsetY: 50,
                          videoCropOffsetX: 50,
                        }));
                        setFloatingFeedback({ target: 'cardVideo', text: 'Vídeo centralizado' });
                      }}
                      className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-500 border border-slate-200/90 rounded-full shadow-md flex items-center justify-center transition-colors"
                      title="Centralizar enquadramento"
                    >
                      <Crosshair className="w-3 h-3" />
                    </button>
                    <div
                      onMouseDown={(e) => handleMouseDown('cardVideo', e)}
                      className="w-6 h-6 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-500 border border-slate-200/90 rounded-full shadow-md flex items-center justify-center cursor-move transition-colors"
                      title="Arraste para enquadrar o vídeo"
                    >
                      <Move className="w-3 h-3" />
                    </div>
                  </div>
                </>
              )}

              {/* Canva Live Drag/Resize Dimension Tooltip Badge */}
              {(isResizing || isDragging) && isCardVideoActive && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#18191b] text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md shadow-xl border border-white/10 z-50 whitespace-nowrap pointer-events-none flex items-center gap-1.5 select-none animate-in fade-in zoom-in-95 duration-100">
                  <span>l: <strong className="text-white">{metrics.boxWidth}</strong></span>
                  <span>a: <strong className="text-white">{metrics.boxHeight}</strong></span>
                  <span className="text-slate-500">•</span>
                  <span className="text-sky-300 font-bold">{(tweetCardSettings.videoFit || 'cover').toUpperCase()}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-300 font-bold">Zoom: {tweetCardSettings.videoScale || 100}%</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Live Dragging Floating Coordinate HUD */}
        {isDragging && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/90 border border-white/20 text-white px-3 py-1 rounded-full text-[11px] font-mono font-bold shadow-2xl flex items-center gap-2 pointer-events-none z-40">
            <span className="text-accent">X: {dragCoord.x}%</span>
            <span className="text-slate-500">|</span>
            <span className="text-accent">Y: {dragCoord.y}%</span>
          </div>
        )}

        {/* Center Play/Pause button on hover (disabled when dragging or resizing) */}
        {!isDragging && !isResizing && (
          <button
            onClick={togglePlay}
            className="absolute w-12 h-12 rounded-full bg-accent hover:bg-accent text-accent-ink flex items-center justify-center backdrop-blur-md shadow-xl transition-colors transform scale-90 opacity-0 group-hover:opacity-100 z-10"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        )}
      </div>

      {/* Playback Controls & Scrubber */}
      <div className="w-full max-w-[340px] mt-3 space-y-2">
        {/* Scrubber Bar */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 w-9 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1"
          />
          <span className="text-[11px] font-mono text-slate-400 w-9">
            {formatTime(duration)}
          </span>
        </div>

        {/* Bottom Playback bar */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                  drawCurrentFrame();
                }
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Voltar ao início"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            Resolução: <strong className="text-slate-200">{videoItem.metadata.width}x{videoItem.metadata.height}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
