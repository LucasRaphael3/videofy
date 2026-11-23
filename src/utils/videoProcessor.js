import JSZip from 'jszip';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { createFile, MP4BoxBuffer, DataStream, Endianness } from 'mp4box';

export function isWebCodecsSupported() {
  return typeof window !== 'undefined' &&
    typeof window.VideoEncoder === 'function' &&
    typeof window.VideoFrame === 'function';
}

export const EXPORT_QUALITY_PRESETS = {
  ultra: {
    id: 'ultra',
    label: 'Ultra (1080p)',
    sublabel: 'Bitrate máximo, mantém o fps original até 60 (18 Mbps H.264)',
    bitrate: 18_000_000,
    fps: 60, // used when the source rate is unknown (seek fallback)
    maxFps: 60,
    shortEdge: 1080, // Full HD short side (1080x1920 or 1920x1080)
    targetQualityFactor: 1.0,
    sizeEstimate: '~50-90 MB/min'
  },
  high: {
    id: 'high',
    label: 'Alta (1080p)',
    sublabel: 'Recomendado para TikTok e Reels, mantém o fps original até 60 (12 Mbps H.264)',
    bitrate: 12_000_000,
    fps: 30,
    maxFps: 60,
    shortEdge: 1080, // Full HD short side (1080x1920 or 1920x1080)
    targetQualityFactor: 1.0,
    sizeEstimate: '~30-55 MB/min'
  },
  balanced: {
    id: 'balanced',
    label: 'Equilibrada (720p)',
    sublabel: '720p, mantém o fps original até 60 (6 Mbps H.264)',
    bitrate: 6_000_000,
    fps: 30,
    maxFps: 60,
    shortEdge: 720, // 720x1280 or 1280x720
    targetQualityFactor: 0.72,
    sizeEstimate: '~15-30 MB/min'
  },
  economy: {
    id: 'economy',
    label: 'Econômica (540p 30fps)',
    sublabel: 'Rascunho rápido (3 Mbps H.264)',
    bitrate: 3_000_000,
    fps: 30,
    maxFps: 30,
    shortEdge: 540, // 540x960 or 960x540
    targetQualityFactor: 0.54,
    sizeEstimate: '~8-15 MB/min'
  }
};

/**
 * Checks for the most optimal supported video MIME type for recording
 */
export function getSupportedMimeType() {
  const types = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

/**
 * Generates video metadata and a high quality thumbnail from a video file
 */
export async function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    let resolved = false;

    video.onloadedmetadata = () => {
      // Seek slightly into the video to avoid black intro frame
      video.currentTime = Math.min(0.5, Math.max(0.1, video.duration / 4));
    };

    video.onseeked = () => {
      if (resolved) return;
      resolved = true;

      const width = video.videoWidth || 1080;
      const height = video.videoHeight || 1920;
      const duration = video.duration || 0;

      // Determine Aspect Ratio
      const ratio = width / height;
      let aspectRatioLabel = '16:9';
      if (Math.abs(ratio - 9 / 16) < 0.15) {
        aspectRatioLabel = '9:16 (Reels/TikTok)';
      } else if (Math.abs(ratio - 1) < 0.15) {
        aspectRatioLabel = '1:1 (Square)';
      } else if (Math.abs(ratio - 4 / 5) < 0.15) {
        aspectRatioLabel = '4:5 (Portrait)';
      } else if (ratio > 1.3) {
        aspectRatioLabel = '16:9 (Landscape)';
      }

      // Generate thumbnail
      const canvas = document.createElement('canvas');
      const thumbWidth = 360;
      const thumbHeight = Math.round(thumbWidth / (width / height));
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);

      const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

      // Clean up
      URL.revokeObjectURL(objectUrl);
      video.remove();

      resolve({
        duration,
        width,
        height,
        aspectRatioLabel,
        thumbnail,
      });
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      reject(new Error('Falha ao carregar metadados do vídeo: ' + err.message));
    };

    // Timeout fallback after 6s
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        URL.revokeObjectURL(objectUrl);
        video.remove();
        resolve({
          duration: 10,
          width: 1080,
          height: 1920,
          aspectRatioLabel: '9:16',
          thumbnail: '',
        });
      }
    }, 6000);
  });
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Wraps text into multiple lines based on maximum width
 */
export function wrapTextLines(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = String(text).split('\n');
  const allLines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }
    const words = para.split(' ');
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        allLines.push(currentLine);
        currentLine = words[n];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

/**
 * Draws Twitter verified checkmark badge
 */
export function drawVerifiedBadge(ctx, x, y, size = 20, type = 'blue') {
  ctx.save();
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = type === 'gold' ? '#e2b714' : '#1d9bf0';
  ctx.fill();

  // White checkmark
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - radius * 0.42, cy - radius * 0.05);
  ctx.lineTo(cx - radius * 0.08, cy + radius * 0.32);
  ctx.lineTo(cx + radius * 0.44, cy - radius * 0.3);
  ctx.stroke();

  ctx.restore();
}

/**
 * Computes metrics and layout dimensions for the Twitter / X Meme Card
 */
export function computeTweetCardMetrics(ctx, canvasWidth, canvasHeight, tweetCardSettings, videoMeta = {}) {
  const isFrame = tweetCardSettings.mode === 'frame';
  const scaleRatio = canvasWidth / 1080;
  
  // Outer scale: default 92% in frame, 90% in overlay, or user-defined scale
  const scale = typeof tweetCardSettings.scale === 'number' ? tweetCardSettings.scale : (isFrame ? 92 : 90);
  const cardWidth = Math.round(canvasWidth * (scale / 100));
  const marginX = Math.round((canvasWidth - cardWidth) / 2);
  const padding = isFrame ? Math.round(18 * scaleRatio) : Math.round(28 * scaleRatio);

  // Compute text
  let rawText = tweetCardSettings.text || '';
  if (videoMeta.filename) {
    rawText = rawText.replace(/{filename}/gi, videoMeta.filename.replace(/\.[^/.]+$/, ""));
  }
  if (videoMeta.index !== undefined) {
    rawText = rawText.replace(/{index}/gi, String(videoMeta.index + 1));
  }

  const fontSize = Math.round((tweetCardSettings.fontSize || 32) * scaleRatio);
  const fontFamily = tweetCardSettings.fontFamily || 'Inter';
  
  // Measure lines
  ctx.save();
  ctx.font = `500 ${fontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const contentWidth = cardWidth - padding * 2;
  const lines = wrapTextLines(ctx, rawText, contentWidth);
  ctx.restore();

  const avatarSize = Math.round(76 * scaleRatio);
  const headerHeight = avatarSize;
  const lineHeight = Math.round(fontSize * 1.35);
  const textBlockHeight = lines.length * lineHeight;
  const timeHeight = tweetCardSettings.showTimestamp ? Math.round(24 * scaleRatio) : 0;
  const gap1 = Math.round(20 * scaleRatio); // between header and text
  const gap2 = tweetCardSettings.showTimestamp ? Math.round(16 * scaleRatio) : 0; // between text and time

  const totalHeight = padding * 2 + headerHeight + gap1 + textBlockHeight + gap2 + timeHeight;

  const defaultY = isFrame ? 16 : 20;
  const xPercent = typeof tweetCardSettings.xPercent === 'number' ? tweetCardSettings.xPercent : 50;
  const yPercent = typeof tweetCardSettings.yPercent === 'number' ? tweetCardSettings.yPercent : defaultY;

  let x = (canvasWidth * (xPercent / 100)) - (cardWidth / 2);
  let y = (canvasHeight * (yPercent / 100)) - (totalHeight / 2);

  return {
    x,
    y,
    width: cardWidth,
    height: totalHeight,
    marginX,
    padding,
    avatarSize,
    fontSize,
    fontFamily,
    lines,
    lineHeight,
    rawText,
    scaleRatio,
  };
}

/**
 * Draws the Twitter / X Meme Card on canvas
 */
export function drawTwitterCard(ctx, canvasWidth, canvasHeight, tweetCardSettings, tweetAvatarImgElement, videoMeta = {}, isFrame = false) {
  if (!tweetCardSettings || !tweetCardSettings.enabled) return;

  const metrics = computeTweetCardMetrics(ctx, canvasWidth, canvasHeight, tweetCardSettings, videoMeta);
  const { x, y, width, height, padding, avatarSize, fontSize, fontFamily, lines, lineHeight, scaleRatio } = metrics;

  const bgType = tweetCardSettings.bgType || 'white';
  const isDark = bgType === 'black' || bgType === 'dim' || bgType === 'blur' || (bgType === 'custom' && tweetCardSettings.theme === 'dark');

  // Text Colors
  const textColor = isDark ? '#f7f9f9' : '#0f1419';
  const subTextColor = isDark ? '#8b98a5' : '#536471';

  ctx.save();

  // If in overlay mode, OR frame mode with blur/custom, OR if dragged over the video, draw rounded card container
  const cardYPercent = typeof tweetCardSettings.yPercent === 'number' ? tweetCardSettings.yPercent : (isFrame ? 16 : 20);
  const isOverVideo = isFrame && cardYPercent > 28;
  const needsCardBox = !isFrame || bgType === 'blur' || bgType === 'custom' || isOverVideo || tweetCardSettings.forceCardBox;
  if (needsCardBox) {
    const cardRadius = Math.round((tweetCardSettings.cardRadius || 18) * scaleRatio);
    ctx.save();
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = Math.round(18 * scaleRatio);
    ctx.shadowOffsetY = Math.round(4 * scaleRatio);

    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.88)' : '#ffffff';
    roundRect(ctx, x, y, width, height, cardRadius);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = Math.max(1, Math.round(1.5 * scaleRatio));
    ctx.stroke();
    ctx.restore();
  }

  // 1. Draw Profile Picture (Avatar)
  const avatarX = x + padding;
  const avatarY = y + padding;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (tweetAvatarImgElement && tweetAvatarImgElement.complete && tweetAvatarImgElement.naturalWidth > 0) {
    ctx.drawImage(tweetAvatarImgElement, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    // Stylish Fallback Avatar with Initials
    const grad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    grad.addColorStop(0, isDark ? '#2563eb' : '#1d4ed8');
    grad.addColorStop(1, isDark ? '#4338ca' : '#1e3a8a');
    ctx.fillStyle = grad;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

    // Initials
    const name = tweetCardSettings.displayName || 'Creator';
    const initials = name.slice(0, 2).toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(avatarSize * 0.44)}px "${fontFamily}", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();

  // Subtle Avatar Border
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scaleRatio));
  ctx.stroke();
  ctx.restore();

  // 2. Display Name & Handle
  const nameX = avatarX + avatarSize + Math.round(14 * scaleRatio);
  const nameFontSize = Math.round(30 * scaleRatio);
  const handleFontSize = Math.round(22 * scaleRatio);
  const nameY = avatarY + Math.round(6 * scaleRatio);
  const handleY = nameY + nameFontSize + Math.round(4 * scaleRatio);

  // Draw Display Name
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `800 ${nameFontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(tweetCardSettings.displayName || 'BALLERS', nameX, nameY);

  const nameMetrics = ctx.measureText(tweetCardSettings.displayName || 'BALLERS');
  const badgeSize = Math.round(22 * scaleRatio);

  // Draw Verified Badge
  if (tweetCardSettings.verified) {
    const badgeX = nameX + nameMetrics.width + Math.round(8 * scaleRatio);
    const badgeY = nameY + Math.round((nameFontSize - badgeSize) / 2);
    drawVerifiedBadge(ctx, badgeX, badgeY, badgeSize, tweetCardSettings.verifiedType || 'blue');
  }

  // Draw Three dots menu on right
  ctx.fillStyle = subTextColor;
  ctx.font = `bold ${Math.round(24 * scaleRatio)}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText('···', x + width - padding, nameY);

  // Draw @handle
  ctx.fillStyle = subTextColor;
  ctx.font = `400 ${handleFontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(tweetCardSettings.handle || '@ballers', nameX, handleY);
  ctx.restore();

  // 3. Tweet Text
  const textStartX = x + padding;
  const textStartY = avatarY + avatarSize + Math.round(20 * scaleRatio);

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = `500 ${fontSize}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    ctx.fillText(line, textStartX, textStartY + index * lineHeight);
  });
  ctx.restore();

  // 4. Timestamp
  if (tweetCardSettings.showTimestamp && tweetCardSettings.timestamp) {
    const timeY = textStartY + (lines.length * lineHeight) + Math.round(16 * scaleRatio);
    ctx.save();
    ctx.fillStyle = subTextColor;
    ctx.font = `400 ${Math.round(20 * scaleRatio)}px "${fontFamily}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(tweetCardSettings.timestamp, textStartX, timeY);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Computes destination placement and source cropping dimensions for the video inside 9:16 Frame Mode
 */
export function computeCardVideoMetrics({
  width,
  height,
  tweetCardSettings = {},
  videoWidth = 1080,
  videoHeight = 1920,
  ctx = null,
  videoMeta = {}
}) {
  const isVideoFlush = tweetCardSettings.videoFlush !== false;
  const videoMarginX = isVideoFlush ? 0 : Math.round(54 * (width / 1080));
  const boxWidth = width - (videoMarginX * 2);
  const vSourceWidth = videoWidth || 1080;
  const vSourceHeight = videoHeight || 1920;
  const vSourceAspect = vSourceWidth / vSourceHeight;

  // 1. Calculate Card Bottom coordinate
  let cardBottom = 0;
  if (ctx) {
    const cardMetrics = computeTweetCardMetrics(ctx, width, height, tweetCardSettings, videoMeta);
    cardBottom = cardMetrics.y + cardMetrics.height;
  } else {
    const cardYPercent = typeof tweetCardSettings.yPercent === 'number' ? tweetCardSettings.yPercent : 16;
    cardBottom = (height * (cardYPercent / 100)) + Math.round(110 * (width / 1080));
  }

  const gap = isVideoFlush ? Math.round(24 * (width / 1080)) : Math.round(36 * (width / 1080));
  const cardYPercent = typeof tweetCardSettings.yPercent === 'number' ? tweetCardSettings.yPercent : 16;
  const fitMode = tweetCardSettings.videoFit || 'cover'; // 'cover' | 'contain' | 'square' | 'custom'

  // 2. Determine Video Box Height
  let boxHeight;
  if (fitMode === 'square') {
    boxHeight = boxWidth; // 1:1 perfect square
  } else if (fitMode === 'contain') {
    boxHeight = Math.round(boxWidth / vSourceAspect);
  } else if (fitMode === 'custom' || typeof tweetCardSettings.videoHeightPercent === 'number') {
    const hp = tweetCardSettings.videoHeightPercent || (vSourceAspect >= 1.2 ? 42 : 48);
    boxHeight = Math.round(height * (hp / 100));
  } else {
    // Default 'cover': if landscape (e.g. 16:9), default to a clean cinematic frame or ~48% height
    if (vSourceAspect >= 1.2) {
      boxHeight = Math.round(boxWidth / (16 / 9));
    } else {
      boxHeight = Math.round(height * 0.48);
    }
  }

  // Position video vertically
  let boxY;
  if (cardYPercent <= 30) {
    boxY = cardBottom + gap;
  } else {
    boxY = Math.round((height - boxHeight) / 2);
  }

  // Constrain if it exceeds bottom safe margin
  const bottomSafeMargin = Math.round(70 * (width / 1080));
  const maxAvailableHeight = height - boxY - bottomSafeMargin;
  if (boxHeight > maxAvailableHeight && maxAvailableHeight > 180) {
    boxHeight = maxAvailableHeight;
  }

  const boxX = videoMarginX;

  // 3. Compute Source Crop (sx, sy, sWidth, sHeight)
  const boxAspect = boxWidth / Math.max(1, boxHeight);
  let sWidth = vSourceWidth;
  let sHeight = vSourceHeight;

  if (fitMode === 'contain') {
    // Show full frame
    sWidth = vSourceWidth;
    sHeight = vSourceHeight;
  } else {
    // Crop according to boxAspect
    if (vSourceAspect > boxAspect) {
      // Video is wider than destination box -> crop horizontal sides
      sWidth = Math.round(vSourceHeight * boxAspect);
    } else {
      // Video is taller than destination box -> crop vertical top/bottom
      sHeight = Math.round(vSourceWidth / boxAspect);
    }

    // Apply User Zoom / Scale (tweetCardSettings.videoScale: 70% to 200%, default 100)
    const zoom = Math.max(0.5, Math.min(2.5, (tweetCardSettings.videoScale || 100) / 100));
    sWidth = Math.round(sWidth / zoom);
    sHeight = Math.round(sHeight / zoom);

    // Clamp to actual source video boundaries
    sWidth = Math.min(vSourceWidth, Math.max(10, sWidth));
    sHeight = Math.min(vSourceHeight, Math.max(10, sHeight));
  }

  // Apply Pan Offsets (0% to 100%, 50% = center)
  const panX = typeof tweetCardSettings.videoCropOffsetX === 'number' ? tweetCardSettings.videoCropOffsetX : 50;
  const panY = typeof tweetCardSettings.videoCropOffsetY === 'number' ? tweetCardSettings.videoCropOffsetY : 50;
  const maxSx = Math.max(0, vSourceWidth - sWidth);
  const maxSy = Math.max(0, vSourceHeight - sHeight);
  const sx = Math.round(maxSx * (panX / 100));
  const sy = Math.round(maxSy * (panY / 100));

  return {
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    sx,
    sy,
    sWidth,
    sHeight,
    fitMode,
    zoom: tweetCardSettings.videoScale || 100,
    panX,
    panY,
    isVideoFlush,
  };
}

/**
 * Unified Scene Renderer for both Live Preview and Video Export
 * Handles 9:16 frame backgrounds, fitted video placement, Twitter cards, landmarks and captions
 */
export function renderVideoScene(ctx, width, height, video, {
  captionSettings,
  watermarkSettings,
  watermarkImgElement,
  tweetCardSettings,
  tweetAvatarImgElement,
  videoMeta = {},
  branding = false,
}) {
  // Always clear entire canvas first to eliminate any trailing streaks or ghost copies
  ctx.clearRect(0, 0, width, height);

  const isTwitterActive = tweetCardSettings && tweetCardSettings.enabled;
  const isFrameMode = isTwitterActive && tweetCardSettings.mode === 'frame';

  if (!isFrameMode) {
    // Normal / Overlay Mode: Video fills canvas directly
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (video) {
      try {
        ctx.drawImage(video, 0, 0, width, height);
      } catch (e) {}
    }

    // Draw Twitter Card floating if enabled in overlay mode
    if (isTwitterActive) {
      drawTwitterCard(ctx, width, height, tweetCardSettings, tweetAvatarImgElement, videoMeta, false);
    }

    // Draw Captions and Watermark
    drawOverlays(ctx, width, height, { captionSettings, watermarkSettings, watermarkImgElement, videoMeta });
    if (branding) drawVideofyBranding(ctx, width, height, watermarkSettings);
  } else {
    // 9:16 Vertical Viral Social Frame Mode (e.g. TikTok / Reels / Shorts)
    // 1. Fill Background
    const bgType = tweetCardSettings.bgType || 'white';
    if (bgType === 'white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'dim') {
      ctx.fillStyle = '#15202b';
      ctx.fillRect(0, 0, width, height);
    } else if (bgType === 'blur') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      // Cinematic blurred video background
      if (video) {
        ctx.save();
        ctx.filter = 'blur(50px) brightness(0.7)';
        try {
          ctx.drawImage(video, -40, -40, width + 80, height + 80);
        } catch (e) {}
        ctx.filter = 'none';
        ctx.restore();
      }
    } else if (bgType === 'custom') {
      if (tweetCardSettings.customGradient && tweetCardSettings.customGradient.includes('gradient')) {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = tweetCardSettings.bgColor || '#1e293b';
      }
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Compute Card & Video Placement Metrics
    const vSourceWidth = (video && (video.videoWidth || video.displayWidth || video.width)) || 1080;
    const vSourceHeight = (video && (video.videoHeight || video.displayHeight || video.height)) || 1920;

    const videoMetrics = computeCardVideoMetrics({
      width,
      height,
      tweetCardSettings,
      videoWidth: vSourceWidth,
      videoHeight: vSourceHeight,
      ctx,
      videoMeta,
    });

    // 3. Draw Video (with optional rounded corners and precise cropping)
    if (video) {
      const borderRadius = videoMetrics.isVideoFlush ? 0 : Math.round((tweetCardSettings.videoBorderRadius || 0) * (width / 1080));
      ctx.save();
      if (borderRadius > 0) {
        roundRect(ctx, videoMetrics.boxX, videoMetrics.boxY, videoMetrics.boxWidth, videoMetrics.boxHeight, borderRadius);
        ctx.clip();
      }
      try {
        ctx.drawImage(
          video,
          videoMetrics.sx,
          videoMetrics.sy,
          videoMetrics.sWidth,
          videoMetrics.sHeight,
          videoMetrics.boxX,
          videoMetrics.boxY,
          videoMetrics.boxWidth,
          videoMetrics.boxHeight
        );
      } catch (e) {}
      ctx.restore();
    }

    // 4. Draw Twitter Card Header on top
    drawTwitterCard(ctx, width, height, tweetCardSettings, tweetAvatarImgElement, videoMeta, true);

    // 5. Draw optional watermark & captions
    drawOverlays(ctx, width, height, { captionSettings, watermarkSettings, watermarkImgElement, videoMeta });
    if (branding) drawVideofyBranding(ctx, width, height, watermarkSettings);
  }
}

/**
 * Free-plan mark: a small "feito com Videofy" badge in a top corner.
 * Uses the corner the user's own watermark is not in.
 */
export function drawVideofyBranding(ctx, width, height, watermarkSettings) {
  const unit = Math.min(width, height);
  const fontSize = Math.max(12, Math.round(unit * 0.026));
  const padX = Math.round(fontSize * 0.7);
  const padY = Math.round(fontSize * 0.45);
  const dot = Math.round(fontSize * 0.42);
  const gap = Math.round(fontSize * 0.4);
  const margin = Math.round(unit * 0.04);

  ctx.save();
  ctx.font = `500 ${fontSize}px Geist, Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const label = 'feito com Videofy';
  const textW = ctx.measureText(label).width;
  const boxW = Math.round(padX * 2 + dot + gap + textW);
  const boxH = Math.round(fontSize + padY * 2);

  const wmAnchor = watermarkSettings?.anchor || 'top-right';
  const useRight = wmAnchor === 'top-left';
  const x = useRight ? width - margin - boxW : margin;
  const y = margin;

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(20, 20, 21, 0.72)';
  roundRect(ctx, x, y, boxW, boxH, Math.round(boxH / 2));
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5a524';
  ctx.beginPath();
  ctx.arc(x + padX + dot / 2, y + boxH / 2, dot / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ededed';
  ctx.fillText(label, x + padX + dot + gap, y + boxH / 2 + 1);
  ctx.restore();
}

/**
 * Draws the watermark and caption overlays onto any target canvas context
 * Used for both real-time interactive preview and the actual export render pipeline
 */
export function drawOverlays(ctx, width, height, { captionSettings, watermarkSettings, watermarkImgElement, videoMeta = {} }) {
  // 1. DRAW WATERMARK (LANDMARK)
  if (watermarkSettings) {
    const {
      type = 'logo', // 'logo' | 'text'
      text = '@videofy.creator',
      anchor = 'top-right', // 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
      scale = 18, // % of video width
      opacity = 85,
      margin = 36,
      textColor = '#ffffff',
      fontSize = 32,
      fontFamily = 'Montserrat',
      badgeBg = 'rgba(0, 0, 0, 0.45)',
      badgeRadius = 8
    } = watermarkSettings;

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, Math.min(1, opacity / 100));

    if (type === 'logo' && watermarkImgElement && watermarkImgElement.complete && watermarkImgElement.naturalWidth > 0) {
      // Calculate scaled dimensions
      const targetWidth = Math.round((width * (scale / 100)));
      const imgAspect = watermarkImgElement.naturalHeight / watermarkImgElement.naturalWidth;
      const targetHeight = Math.round(targetWidth * imgAspect);

      let x = margin;
      let y = margin;

      if (typeof watermarkSettings.xPercent === 'number' && typeof watermarkSettings.yPercent === 'number') {
        x = (width * (watermarkSettings.xPercent / 100)) - (targetWidth / 2);
        y = (height * (watermarkSettings.yPercent / 100)) - (targetHeight / 2);
      } else {
        switch (anchor) {
          case 'top-left':
            x = margin;
            y = margin;
            break;
          case 'top-right':
            x = width - targetWidth - margin;
            y = margin;
            break;
          case 'bottom-left':
            x = margin;
            y = height - targetHeight - margin;
            break;
          case 'bottom-right':
            x = width - targetWidth - margin;
            y = height - targetHeight - margin;
            break;
          case 'center':
            x = (width - targetWidth) / 2;
            y = (height - targetHeight) / 2;
            break;
          default:
            x = width - targetWidth - margin;
            y = margin;
        }
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.drawImage(watermarkImgElement, x, y, targetWidth, targetHeight);
    } else if (type === 'text' && text && text.trim().length > 0) {
      const responsiveFontSize = Math.round(fontSize * (width / 1080));
      ctx.font = `600 ${responsiveFontSize}px "${fontFamily}", sans-serif`;
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = responsiveFontSize * 1.3;
      const padX = responsiveFontSize * 0.5;
      const padY = responsiveFontSize * 0.3;
      const totalWidth = textWidth + padX * 2;
      const totalHeight = textHeight + padY * 2;

      let x = margin;
      let y = margin;

      if (typeof watermarkSettings.xPercent === 'number' && typeof watermarkSettings.yPercent === 'number') {
        x = (width * (watermarkSettings.xPercent / 100)) - (totalWidth / 2);
        y = (height * (watermarkSettings.yPercent / 100)) - (totalHeight / 2);
      } else {
        switch (anchor) {
          case 'top-left':
            x = margin;
            y = margin;
            break;
          case 'top-right':
            x = width - totalWidth - margin;
            y = margin;
            break;
          case 'bottom-left':
            x = margin;
            y = height - totalHeight - margin;
            break;
          case 'bottom-right':
            x = width - totalWidth - margin;
            y = height - totalHeight - margin;
            break;
          case 'center':
            x = (width - totalWidth) / 2;
            y = (height - totalHeight) / 2;
            break;
          default:
            x = width - totalWidth - margin;
            y = margin;
        }
      }

      // Draw background pill if enabled
      if (badgeBg && badgeBg !== 'transparent') {
        ctx.fillStyle = badgeBg;
        roundRect(ctx, x, y, totalWidth, totalHeight, badgeRadius);
        ctx.fill();
      }

      // Draw text
      ctx.fillStyle = textColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(text, x + padX, y + padY + textHeight / 2);
    }

    ctx.restore();
  }

  // 2. DRAW CAPTIONS / TEXT OVERLAY
  if (captionSettings && captionSettings.text && captionSettings.text.trim().length > 0) {
    let rawText = captionSettings.text;
    
    // Replace dynamic variables if present
    if (videoMeta.filename) {
      rawText = rawText.replace(/{filename}/gi, videoMeta.filename.replace(/\.[^/.]+$/, ""));
    }
    if (videoMeta.index !== undefined) {
      rawText = rawText.replace(/{index}/gi, String(videoMeta.index + 1));
    }

    const {
      fontFamily = 'Bebas Neue',
      fontSize = 58,
      fontWeight = '700',
      textTransform = 'uppercase',
      textColor = '#FFE600',
      strokeColor = '#000000',
      strokeWidth = 6,
      shadowColor = 'rgba(0, 0, 0, 0.85)',
      shadowBlur = 12,
      shadowOffsetX = 3,
      shadowOffsetY = 4,
      boxBg = 'transparent', // or rgba(0,0,0,0.6)
      boxPadding = 18,
      boxRadius = 12,
      position = 'center', // 'top' | 'center' | 'bottom'
      yOffset = 0, // slider offset
      textAlign = 'center' // 'left' | 'center' | 'right'
    } = captionSettings;

    ctx.save();

    // Scale font size proportionally to video width (baseline: 1080px width)
    const scaleFactor = Math.max(0.4, width / 1080);
    const computedFontSize = Math.round(fontSize * scaleFactor);
    const computedStrokeWidth = Math.round(strokeWidth * scaleFactor);
    const computedBoxPadding = Math.round(boxPadding * scaleFactor);
    const computedYOffset = Math.round(yOffset * scaleFactor);

    let displayText = rawText;
    if (textTransform === 'uppercase') {
      displayText = displayText.toUpperCase();
    }

    ctx.font = `${fontWeight} ${computedFontSize}px "${fontFamily}", "Arial Black", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = textAlign;

    const lines = displayText.split('\n');
    const lineHeight = computedFontSize * 1.25;
    const totalBlockHeight = lines.length * lineHeight;

    // Calculate vertical starting anchor and horizontal anchor X
    let startY = 0;
    let anchorX = width / 2;

    if (typeof captionSettings.xPercent === 'number' && typeof captionSettings.yPercent === 'number') {
      anchorX = (width * (captionSettings.xPercent / 100));
      startY = (height * (captionSettings.yPercent / 100)) - (totalBlockHeight / 2);
    } else {
      if (position === 'top') {
        startY = (height * 0.18) + computedYOffset;
      } else if (position === 'center') {
        startY = (height / 2) - (totalBlockHeight / 2) + computedYOffset;
      } else { // bottom
        startY = (height * 0.78) - totalBlockHeight + computedYOffset;
      }

      if (textAlign === 'left') {
        anchorX = width * 0.08;
      } else if (textAlign === 'right') {
        anchorX = width * 0.92;
      }
    }

    // Optional Background Box Behind Entire Text Block
    if (boxBg && boxBg !== 'transparent') {
      let maxLineWidth = 0;
      lines.forEach(line => {
        const m = ctx.measureText(line);
        if (m.width > maxLineWidth) maxLineWidth = m.width;
      });

      const boxWidth = maxLineWidth + computedBoxPadding * 2;
      const boxHeight = totalBlockHeight + computedBoxPadding * 2;
      let boxX = anchorX - boxWidth / 2;
      if (textAlign === 'left') boxX = anchorX - computedBoxPadding;
      if (textAlign === 'right') boxX = anchorX - maxLineWidth - computedBoxPadding;

      ctx.fillStyle = boxBg;
      roundRect(ctx, boxX, startY - computedBoxPadding, boxWidth, boxHeight, boxRadius * scaleFactor);
      ctx.fill();
    }

    // Render Each Line
    lines.forEach((line, index) => {
      const currentY = startY + (index * lineHeight) + (lineHeight / 2);

      // Stroke / Outline
      if (computedStrokeWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = computedStrokeWidth;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(line, anchorX, currentY);
      }

      // Shadow
      if (shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur * scaleFactor;
        ctx.shadowOffsetX = shadowOffsetX * scaleFactor;
        ctx.shadowOffsetY = shadowOffsetY * scaleFactor;
      }

      // Fill
      ctx.fillStyle = textColor;
      ctx.fillText(line, anchorX, currentY);

      // Reset shadow for next strokes
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }
}

/**
 * WebCodecs Frame-by-Frame Video Renderer
 * Encodes video directly to hardware-accelerated H.264 / AVC and AAC audio using mp4-muxer.
 * Completely eliminates dropped frames, rate-control stutter, and detached element throttling.
 */
/**
 * Demuxes the first video track of an MP4/MOV buffer.
 * Returns null when the buffer is not ISO-BMFF or has no video track.
 */
function demuxMp4VideoTrack(arrayBuffer) {
  const mp4 = createFile();
  let track = null;
  const samples = [];
  mp4.onError = () => {};
  mp4.onReady = (info) => {
    track = info.videoTracks && info.videoTracks[0];
    if (!track) return;
    mp4.setExtractionOptions(track.id, null, { nbSamples: Infinity });
    mp4.start();
  };
  mp4.onSamples = (_id, _user, batch) => {
    for (const s of batch) samples.push(s);
  };
  mp4.appendBuffer(MP4BoxBuffer.fromArrayBuffer(arrayBuffer, 0));
  mp4.flush();
  if (!track || samples.length === 0) return null;

  let description;
  const trak = mp4.getTrackById(track.id);
  for (const entry of trak.mdia.minf.stbl.stsd.entries) {
    const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
    if (box) {
      const stream = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
      box.write(stream);
      description = new Uint8Array(stream.buffer, 8); // skip box header
      break;
    }
  }
  return { track, samples, description };
}

function trackRotationDegrees(matrix) {
  if (!matrix || matrix.length < 2) return 0;
  const deg = Math.round((Math.atan2(matrix[1], matrix[0]) * 180) / Math.PI);
  return ((deg % 360) + 360) % 360;
}

/**
 * Frame-accurate source for MP4/MOV files: demux + VideoDecoder, decoded in order.
 * getFrameAt(tUs) returns the frame on screen at time t (last frame with pts <= t),
 * so every output frame maps to the right source frame with no seeking.
 * Returns null when the file can't take this path (other container, rotation, codec).
 */
export async function createMp4FrameSource(arrayBuffer) {
  if (typeof VideoDecoder === 'undefined' || typeof EncodedVideoChunk === 'undefined') return null;

  let demuxed = null;
  try {
    demuxed = demuxMp4VideoTrack(arrayBuffer);
  } catch (_) {
    return null;
  }
  if (!demuxed) return null;

  const { track, samples, description } = demuxed;
  // Rotated phone footage: the <video> element applies the matrix, decoded frames don't.
  if (trackRotationDegrees(track.matrix) !== 0) return null;

  const config = {
    codec: track.codec,
    codedWidth: track.video ? track.video.width : track.track_width,
    codedHeight: track.video ? track.video.height : track.track_height,
    ...(description ? { description } : {}),
  };
  try {
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support || !support.supported) return null;
  } catch (_) {
    return null;
  }

  // Normalize presentation timestamps so the first frame sits at 0
  let minCts = Infinity;
  let totalDur = 0;
  const timescale = samples[0].timescale;
  for (const s of samples) {
    if (s.cts < minCts) minCts = s.cts;
    totalDur += s.duration;
  }
  const durationUs = (totalDur * 1e6) / timescale;
  // Median frame duration, not the average: variable-rate clips (phones, MediaRecorder)
  // have dropped frames that drag the average down to odd rates like 27fps.
  const durations = samples.map((s) => s.duration).filter((d) => d > 0).sort((x, y) => x - y);
  const medianDur = durations.length ? durations[Math.floor(durations.length / 2)] : 0;
  const fps = medianDur ? timescale / medianDur : samples.length / (durationUs / 1e6);

  const queue = []; // decoded frames, presentation order
  let current = null;
  let decodeError = null;
  let flushed = false;
  let flushStarted = false;
  let nextSample = 0;
  let wake = null;
  const notify = () => {
    const w = wake;
    wake = null;
    if (w) w();
  };

  const decoder = new VideoDecoder({
    output: (frame) => {
      queue.push(frame);
      notify();
    },
    error: (e) => {
      decodeError = e;
      notify();
    },
  });
  decoder.configure(config);

  const MAX_BUFFERED_FRAMES = 6; // hardware decoders have a small frame pool
  const pump = () => {
    while (
      nextSample < samples.length &&
      decoder.decodeQueueSize < 4 &&
      queue.length < MAX_BUFFERED_FRAMES
    ) {
      const s = samples[nextSample++];
      decoder.decode(new EncodedVideoChunk({
        type: s.is_sync ? 'key' : 'delta',
        timestamp: Math.round(((s.cts - minCts) * 1e6) / s.timescale),
        duration: Math.round((s.duration * 1e6) / s.timescale),
        data: s.data,
      }));
      s.data = undefined; // let the encoded bytes go
    }
    if (nextSample >= samples.length && !flushStarted) {
      flushStarted = true;
      decoder.flush().then(
        () => { flushed = true; notify(); },
        (e) => { decodeError = decodeError || e; flushed = true; notify(); }
      );
    }
  };

  const waitForOutput = () => new Promise((resolve) => {
    wake = resolve;
    setTimeout(notify, 25); // safety net, outputs normally wake us first
  });

  const TOLERANCE_US = 500;

  async function getFrameAt(tUs) {
    for (;;) {
      if (decodeError) throw decodeError;
      while (queue.length && queue[0].timestamp <= tUs + TOLERANCE_US) {
        if (current) current.close();
        current = queue.shift();
      }
      // The next queued frame is in the future, or there is nothing left: current is on screen
      if (queue.length || flushed) {
        if (current) return current;
        if (queue.length) return queue[0];
        throw new Error('Nenhum quadro decodificado.');
      }
      pump();
      await waitForOutput();
    }
  }

  function close() {
    if (current) current.close();
    current = null;
    while (queue.length) queue.shift().close();
    if (decoder.state !== 'closed') {
      try { decoder.close(); } catch (_) {}
    }
  }

  return {
    width: config.codedWidth,
    height: config.codedHeight,
    fps,
    durationUs,
    getFrameAt,
    close,
  };
}

/** Output frame rate: keep the source rate (rounded) up to the preset's ceiling. */
function pickOutputFps(sourceFps, preset) {
  const cap = preset.maxFps || preset.fps || 30;
  if (!sourceFps || !isFinite(sourceFps)) return preset.fps || 30;
  // Snap to the nearest standard rate when close (29.97 -> 30, 59.94 -> 60)
  const STANDARD = [24, 25, 30, 48, 50, 60];
  let rate = Math.round(sourceFps);
  const nearest = STANDARD.reduce((best, r) => (Math.abs(r - sourceFps) < Math.abs(best - sourceFps) ? r : best), STANDARD[0]);
  if (Math.abs(nearest - sourceFps) / nearest < 0.08) rate = nearest;
  return Math.max(1, Math.min(cap, rate));
}

export async function renderSingleVideoWebCodecs({
  file,
  index,
  captionSettings,
  watermarkSettings,
  watermarkImgElement,
  tweetCardSettings,
  tweetAvatarImgElement,
  exportQuality = 'high',
  onProgress,
  preserveAudio = true,
  forceSeekPath = false,
  branding = false,
}) {
  const video = document.createElement('video');
  const objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.muted = true;
  video.preload = 'auto';

  // Mount to DOM in offscreen layer so GPU decoders are fully active
  video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:160px;height:160px;opacity:0.001;pointer-events:none;z-index:-99999;';
  document.body.appendChild(video);

  let isTerminated = false;
  let videoEncoder = null;
  let audioEncoder = null;
  let frameSource = null;

  const cleanup = () => {
    isTerminated = true;
    if (frameSource) {
      frameSource.close();
      frameSource = null;
    }
    if (videoEncoder && videoEncoder.state !== 'closed') {
      try { videoEncoder.close(); } catch (_) {}
    }
    if (audioEncoder && audioEncoder.state !== 'closed') {
      try { audioEncoder.close(); } catch (_) {}
    }
    URL.revokeObjectURL(objectUrl);
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
  };

  try {
    // 1. Wait for video metadata & initial data
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = (e) => reject(new Error(`Falha ao carregar metadados do vídeo: ${e.message || 'Erro de leitura'}`));
    });

    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.onloadeddata = () => resolve();
        setTimeout(resolve, 800);
      });
    }

    const isFrameMode = tweetCardSettings && tweetCardSettings.enabled && tweetCardSettings.mode === 'frame';
    const preset = EXPORT_QUALITY_PRESETS[exportQuality] || EXPORT_QUALITY_PRESETS.high;

    let width = isFrameMode ? 1080 : (video.videoWidth || 1080);
    let height = isFrameMode ? 1920 : (video.videoHeight || 1920);

    // Short-edge scaling (e.g. 1080p, 720p, 540p on the short side)
    const currentShortEdge = Math.min(width, height);
    const targetShortEdge = preset.shortEdge || 1080;
    if (targetShortEdge < currentShortEdge) {
      const scaleDown = targetShortEdge / currentShortEdge;
      width = Math.round(width * scaleDown);
      height = Math.round(height * scaleDown);
    }

    // Ensure even dimensions required by H.264
    if (width % 2 !== 0) width -= 1;
    if (height % 2 !== 0) height -= 1;

    // Read the file once: shared by the frame decoder and the audio track
    const fileBuffer = await file.arrayBuffer();

    // Frame-accurate decoder for MP4/MOV; other containers fall back to seeking
    if (!forceSeekPath) {
      frameSource = await createMp4FrameSource(fileBuffer);
    }
    const renderPath = frameSource ? 'decoder' : 'seek';

    const duration = (frameSource && frameSource.durationUs / 1e6) || video.duration || 1;
    const fps = frameSource ? pickOutputFps(frameSource.fps, preset) : (preset.fps || 30);
    const totalFrames = Math.max(1, Math.round(duration * fps));

    // 2. Audio Extraction & Preparation
    let audioBuffer = null;
    let hasAudioTrack = false;
    let numberOfAudioChannels = 2;
    let audioSampleRate = 44100;

    if (preserveAudio && typeof AudioEncoder !== 'undefined') {
      try {
        const arrayBuffer = fileBuffer;
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const tempAudioCtx = new AudioCtxClass();
        try {
          audioBuffer = await tempAudioCtx.decodeAudioData(arrayBuffer.slice(0));
          if (audioBuffer && audioBuffer.numberOfChannels > 0) {
            numberOfAudioChannels = Math.min(2, audioBuffer.numberOfChannels);
            audioSampleRate = audioBuffer.sampleRate;

            const testAudioConfig = {
              codec: 'mp4a.40.2',
              numberOfChannels: numberOfAudioChannels,
              sampleRate: audioSampleRate,
              bitrate: 192_000,
            };
            const audioSupport = await AudioEncoder.isConfigSupported(testAudioConfig);
            if (audioSupport && audioSupport.supported) {
              hasAudioTrack = true;
            }
          }
        } catch (audioDecodeErr) {
          console.warn('Vídeo não contém faixa de áudio compatível ou áudio ausente:', audioDecodeErr);
        } finally {
          if (tempAudioCtx.state !== 'closed') {
            tempAudioCtx.close().catch(() => {});
          }
        }
      } catch (audioReadErr) {
        console.warn('Erro ao ler buffer de áudio:', audioReadErr);
      }
    }

    // 3. Find Optimal Supported Video Codec (H.264 AVC first, VP9 fallback)
    const candidateCodecs = [
      { codec: 'avc1.42002a', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'avc1.42e02a', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'avc1.42001f', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'avc1.42e01f', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'avc1.64002a', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'avc1.4d002a', muxerCodec: 'avc', avc: { format: 'avc' } },
      { codec: 'vp09.00.10.08', muxerCodec: 'vp9' },
    ];

    let selectedConfig = null;
    for (const cand of candidateCodecs) {
      try {
        const testConfig = {
          codec: cand.codec,
          width,
          height,
          bitrate: preset.bitrate,
          framerate: fps,
          hardwareAcceleration: 'no-preference',
          ...(cand.avc ? { avc: cand.avc } : {}),
        };
        const sup = await VideoEncoder.isConfigSupported(testConfig);
        if (sup && sup.supported) {
          let testErr = false;
          const testEnc = new VideoEncoder({
            output: () => {},
            error: () => { testErr = true; }
          });
          testEnc.configure(testConfig);
          await new Promise((r) => setTimeout(r, 40));
          testEnc.close();
          if (!testErr) {
            selectedConfig = { ...testConfig, muxerCodec: cand.muxerCodec };
            break;
          }
        }
      } catch (_) {}
    }

    if (!selectedConfig) {
      throw new Error('Nenhum codec WebCodecs acelerado disponível no ambiente.');
    }

    // 4. Initialize MP4 Muxer with matching video codec
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {
        codec: selectedConfig.muxerCodec,
        width,
        height,
        frameRate: fps,
      },
      audio: hasAudioTrack ? {
        codec: 'aac',
        numberOfChannels: numberOfAudioChannels,
        sampleRate: audioSampleRate,
      } : undefined,
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    let encoderError = null;
    videoEncoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        encoderError = e;
        console.error('VideoEncoder error:', e);
      }
    });

    videoEncoder.configure({
      codec: selectedConfig.codec,
      width: selectedConfig.width,
      height: selectedConfig.height,
      bitrate: selectedConfig.bitrate,
      framerate: selectedConfig.framerate,
      hardwareAcceleration: selectedConfig.hardwareAcceleration,
      ...(selectedConfig.avc ? { avc: selectedConfig.avc } : {}),
    });

    // 5. Configure AudioEncoder and Encode Audio Track if present
    if (hasAudioTrack && audioBuffer) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => {
          muxer.addAudioChunk(chunk, meta);
        },
        error: (e) => {
          console.error('AudioEncoder error:', e);
        }
      });

      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: numberOfAudioChannels,
        sampleRate: audioSampleRate,
        bitrate: 192_000,
      });

      // Encode audio chunks into AAC
      const maxAudioFrames = Math.min(audioBuffer.length, Math.round(duration * audioSampleRate));
      const chunkSize = 2048;
      for (let offset = 0; offset < maxAudioFrames; offset += chunkSize) {
        const currentChunkSize = Math.min(chunkSize, maxAudioFrames - offset);
        const planarData = new Float32Array(numberOfAudioChannels * currentChunkSize);
        for (let ch = 0; ch < numberOfAudioChannels; ch++) {
          const chData = audioBuffer.getChannelData(ch);
          planarData.set(chData.subarray(offset, offset + currentChunkSize), ch * currentChunkSize);
        }

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate: audioSampleRate,
          numberOfFrames: currentChunkSize,
          numberOfChannels: numberOfAudioChannels,
          timestamp: Math.round((offset / audioSampleRate) * 1_000_000), // in microseconds
          data: planarData,
        });

        audioEncoder.encode(audioData);
        audioData.close();

        if (audioEncoder.encodeQueueSize > 10) {
          await new Promise((r) => setTimeout(r, 4));
        }
      }

      await audioEncoder.flush();
    }

    // 6. Frame-by-Frame Video Rendering Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });

    // Fallback seek helper (WebM and anything the decoder path can't take).
    // Resolves only once the seeked frame is actually presented, so a slow seek
    // never lets the previous frame get encoded twice.
    const waitForPresentedFrame = () => new Promise((resolve) => {
      if (typeof video.requestVideoFrameCallback !== 'function') {
        resolve();
        return;
      }
      let done = false;
      const handle = video.requestVideoFrameCallback(() => {
        if (!done) { done = true; resolve(); }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          if (typeof video.cancelVideoFrameCallback === 'function') video.cancelVideoFrameCallback(handle);
          resolve();
        }
      }, 150);
    });

    const seekVideo = (time) => {
      return new Promise((resolve) => {
        const target = Math.min(time, Math.max(0, video.duration - 0.001));
        if (Math.abs(video.currentTime - target) < 0.0005) {
          resolve();
          return;
        }

        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        const onSeeked = () => {
          waitForPresentedFrame().then(finish);
        };

        video.addEventListener('seeked', onSeeked);
        video.currentTime = target;
        // Long safety net: a slow seek must not be cut short
        setTimeout(finish, 4000);
      });
    };

    // 7. Deterministic Frame Loop
    const keyFrameInterval = fps * 2; // Keyframe every 2 seconds
    const frameTimestampUs = (i) => Math.round((i * 1_000_000) / fps);

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (isTerminated) throw new Error('Renderização cancelada.');
      if (encoderError) throw encoderError;

      const timestampUs = frameTimestampUs(frameIndex);
      const frameDurationUs = frameTimestampUs(frameIndex + 1) - timestampUs;

      let sourceImage = video;
      if (frameSource) {
        sourceImage = await frameSource.getFrameAt(timestampUs);
      } else {
        // +1ms keeps float rounding from landing on the previous source frame
        await seekVideo(timestampUs / 1e6 + 0.001);
      }

      // Render entire scene (9:16 frame, Twitter Card, Video crop, Safe Zones, Watermark, Captions)
      renderVideoScene(ctx, width, height, sourceImage, {
        captionSettings,
        watermarkSettings,
        watermarkImgElement,
        tweetCardSettings,
        tweetAvatarImgElement,
        videoMeta: { filename: file.name, index },
        branding,
      });

      const isKeyFrame = (frameIndex % keyFrameInterval) === 0;

      const videoFrame = new VideoFrame(canvas, {
        timestamp: timestampUs,
        duration: frameDurationUs,
      });

      videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
      videoFrame.close();

      // Encoder backpressure management
      if (videoEncoder.encodeQueueSize > 8) {
        while (videoEncoder.encodeQueueSize > 4) {
          await new Promise((r) => setTimeout(r, 6));
        }
      }

      // Progress reporting
      const currentProgress = Math.min(99, Math.round(((frameIndex + 1) / totalFrames) * 100));
      if (onProgress) {
        onProgress(currentProgress);
      }
    }

    // 8. Flush Video Encoder and Finalize MP4
    await videoEncoder.flush();
    muxer.finalize();

    const mp4Buffer = muxer.target.buffer;
    const blob = new Blob([mp4Buffer], { type: 'video/mp4' });
    const processedUrl = URL.createObjectURL(blob);

    if (onProgress) onProgress(100);
    cleanup();

    return {
      blob,
      url: processedUrl,
      mimeType: 'video/mp4',
      extension: 'mp4',
      originalName: file.name,
      size: blob.size,
      fps,
      path: renderPath,
    };

  } catch (err) {
    cleanup();
    throw err;
  }
}

/**
 * Fallback MediaRecorder Video Renderer (for older browser contexts)
 */
export async function renderSingleVideoMediaRecorder({
  file,
  index,
  captionSettings,
  watermarkSettings,
  watermarkImgElement,
  tweetCardSettings,
  tweetAvatarImgElement,
  exportQuality = 'high',
  onProgress,
  preserveAudio = true,
  branding = false,
}) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = false;
    video.preload = 'auto';

    video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:160px;height:160px;opacity:0.001;pointer-events:none;z-index:-99999;';
    document.body.appendChild(video);

    let audioContext = null;
    let audioDest = null;
    let sourceNode = null;

    let mediaRecorder = null;
    let recordedChunks = [];
    let animationFrameId = null;
    let isTerminated = false;

    const cleanup = () => {
      isTerminated = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      URL.revokeObjectURL(objectUrl);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };

    video.onloadedmetadata = async () => {
      try {
        const isFrameMode = tweetCardSettings && tweetCardSettings.enabled && tweetCardSettings.mode === 'frame';
        const preset = EXPORT_QUALITY_PRESETS[exportQuality] || EXPORT_QUALITY_PRESETS.high;

        let width = isFrameMode ? 1080 : (video.videoWidth || 1080);
        let height = isFrameMode ? 1920 : (video.videoHeight || 1920);

        const currentShortEdge = Math.min(width, height);
        const targetShortEdge = preset.shortEdge || 1080;
        if (targetShortEdge < currentShortEdge) {
          const scaleDown = targetShortEdge / currentShortEdge;
          width = Math.round(width * scaleDown);
          height = Math.round(height * scaleDown);
          if (width % 2 !== 0) width -= 1;
          if (height % 2 !== 0) height -= 1;
        }

        const duration = video.duration || 1;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });

        let stream = canvas.captureStream(preset.fps || 30);

        if (preserveAudio) {
          try {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtxClass();
            sourceNode = audioContext.createMediaElementSource(video);
            audioDest = audioContext.createMediaStreamDestination();
            sourceNode.connect(audioDest);

            const audioTracks = audioDest.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              stream.addTrack(audioTracks[0]);
            }
          } catch (audioErr) {
            console.warn('Audio capture not available, recording video only:', audioErr);
          }
        }

        const mimeType = getSupportedMimeType();
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: preset.bitrate || 18_000_000,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(recordedChunks, { type: mimeType });
          const processedUrl = URL.createObjectURL(blob);

          cleanup();

          resolve({
            blob,
            url: processedUrl,
            mimeType,
            extension,
            originalName: file.name,
            size: blob.size,
          });
        };

        let lastProgress = 0;
        const drawFrame = () => {
          if (isTerminated) return;

          if (!video.paused && !video.ended) {
            renderVideoScene(ctx, width, height, video, {
              captionSettings,
              watermarkSettings,
              watermarkImgElement,
              tweetCardSettings,
              tweetAvatarImgElement,
              videoMeta: { filename: file.name, index },
        branding,
            });

            const progress = Math.min(99, Math.round((video.currentTime / duration) * 100));
            if (progress !== lastProgress && onProgress) {
              lastProgress = progress;
              onProgress(progress);
            }
          }

          if (!isTerminated && !video.ended) {
            animationFrameId = requestAnimationFrame(drawFrame);
          }
        };

        video.onended = () => {
          if (onProgress) onProgress(100);
          try {
            renderVideoScene(ctx, width, height, video, {
              captionSettings,
              watermarkSettings,
              watermarkImgElement,
              tweetCardSettings,
              tweetAvatarImgElement,
              videoMeta: { filename: file.name, index },
        branding,
            });
          } catch (_) {}

          setTimeout(() => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 350);
        };

        mediaRecorder.start(250);
        video.playbackRate = 1.0;
        await video.play();
        animationFrameId = requestAnimationFrame(drawFrame);

      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = (err) => {
      cleanup();
      reject(new Error(`Erro ao renderizar vídeo "${file.name}": ${err.message || 'Falha de decodificação'}`));
    };
  });
}

/**
 * Main Video Renderer
 * Dispatches to WebCodecs API (VideoEncoder + mp4-muxer) for zero-loss frame-by-frame rendering,
 * or gracefully falls back to MediaRecorder if WebCodecs is unavailable.
 */
export async function renderSingleVideo(options) {
  if (isWebCodecsSupported()) {
    try {
      return await renderSingleVideoWebCodecs(options);
    } catch (webcodecsErr) {
      console.warn('WebCodecs rendering failed, falling back to MediaRecorder:', webcodecsErr);
      return await renderSingleVideoMediaRecorder(options);
    }
  } else {
    return await renderSingleVideoMediaRecorder(options);
  }
}

/**
 * Concurrent Batch Queue Manager
 * Processes multiple videos simultaneously with configurable worker pool
 */
export async function processBatchConcurrently({
  videos,
  captionSettings,
  watermarkSettings,
  watermarkImgElement,
  tweetCardSettings,
  tweetAvatarImgElement,
  exportQuality = 'high',
  concurrency = 2,
  preserveAudio = true,
  branding = false,
  onItemProgress,
  onItemComplete,
  onItemError,
  onBatchProgress,
}) {
  const total = videos.length;
  let completedCount = 0;
  const results = [];
  const activeWorkers = new Set();
  const queue = [...videos.map((v, i) => ({ ...v, queueIndex: i }))];

  return new Promise((resolve) => {
    const checkNext = () => {
      if (queue.length === 0 && activeWorkers.size === 0) {
        resolve(results);
        return;
      }

      while (activeWorkers.size < concurrency && queue.length > 0) {
        const item = queue.shift();
        const workerPromise = (async () => {
          try {
            if (onItemProgress) {
              onItemProgress(item.id, 0, 'rendering');
            }

            const result = await renderSingleVideo({
              file: item.file,
              index: item.queueIndex,
              captionSettings,
              watermarkSettings,
              watermarkImgElement,
              tweetCardSettings,
              tweetAvatarImgElement,
              exportQuality,
              preserveAudio,
              branding,
              onProgress: (percent) => {
                if (onItemProgress) {
                  onItemProgress(item.id, percent, 'rendering');
                }
              },
            });

            completedCount++;
            results.push({ ...item, result, status: 'completed' });
            if (onItemComplete) {
              onItemComplete(item.id, result);
            }
          } catch (err) {
            completedCount++;
            results.push({ ...item, error: err.message, status: 'failed' });
            if (onItemError) {
              onItemError(item.id, err.message);
            }
          } finally {
            activeWorkers.delete(workerPromise);
            const overallPercent = Math.round((completedCount / total) * 100);
            if (onBatchProgress) {
              onBatchProgress(overallPercent, completedCount, total);
            }
            checkNext();
          }
        })();

        activeWorkers.add(workerPromise);
      }
    };

    checkNext();
  });
}

/**
 * Robust cross-browser file saver that forces the browser to save with the exact
 * filename and extension via HTTP Content-Disposition, eliminating the Chrome UUID fallback bug!
 */
export async function saveFileBlob(blob, filename) {
  if (!blob) return;

  // Clean filename: remove illegal Windows characters (: * ? " < > |)
  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
  const ext = safeFilename.split('.').pop()?.toLowerCase() || 'zip';

  // Strategy 1: Server-assisted HTTP download with Content-Disposition (100% reliable across all browsers)
  try {
    const response = await fetch('/api/download', {
      method: 'POST',
      headers: {
        'x-filename': encodeURIComponent(safeFilename),
        'content-type': blob.type || (ext === 'zip' ? 'application/zip' : 'video/mp4'),
      },
      body: blob,
    });

    if (response.ok) {
      // Trigger the true browser file download with forced Content-Disposition header
      const downloadBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const tempLink = document.createElement('a');
      tempLink.href = downloadUrl;
      tempLink.setAttribute('download', safeFilename);
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      tempLink.click();
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        tempLink.remove();
      }, 2000);
      return;
    }
  } catch (err) {
    console.warn('Server download endpoint unavailable, using native browser download link fallback:', err);
  }

  // Strategy 2: Client-side URL with explicitly set Blob MIME type
  try {
    const mime = ext === 'zip' ? 'application/zip' : 'video/mp4';
    const cleanBlob = blob.type === mime ? blob : new Blob([blob], { type: mime });
    const url = URL.createObjectURL(cleanBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 2000);
  } catch (err) {
    console.error('Download execution failed:', err);
  }
}

/**
 * Packages all rendered video results into a single .zip file
 */
export async function createBatchZip(completedVideos, onZipProgress) {
  const zip = new JSZip();
  const folder = zip.folder('videofy_export');

  completedVideos.forEach((video, index) => {
    if (video.result && video.result.blob) {
      const baseName = (video.file.name || `cut_${index + 1}`)
        .replace(/\.[^/.]+$/, "")
        .replace(/[/\\?%*:|"<>]/g, "_");
      const ext = video.result.extension || 'mp4';
      const filename = `${String(index + 1).padStart(2, '0')}_${baseName}_videofy.${ext}`;
      folder.file(filename, video.result.blob);
    }
  });

  // STORE compression is instantaneous (< 1s) because mp4/webm are already heavily compressed.
  // This eliminates long waiting times and CPU throttling!
  return await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/zip',
      compression: 'STORE',
    },
    (metadata) => {
      if (onZipProgress) {
        onZipProgress(Math.round(metadata.percent));
      }
    }
  );
}
