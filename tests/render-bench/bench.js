// Render bench: builds a source MP4 whose frames carry their own index as a
// 16-bit block code, renders it through the export pipeline, decodes the result
// and checks that output frame k shows the source frame it should.
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { createFile, MP4BoxBuffer } from 'mp4box';
import * as current from '../../src/utils/videoProcessor.js';
import * as baseline from './videoProcessor.baseline.js';

const BITS = 16;

function blockLayout(w, h) {
  const size = Math.floor(w / 20);
  return { size, x0: Math.floor(w * 0.05), y0: Math.floor(h * 0.3) };
}

function drawIndex(ctx, w, h, idx) {
  const { size, x0, y0 } = blockLayout(w, h);
  for (let b = 0; b < BITS; b++) {
    ctx.fillStyle = (idx >> b) & 1 ? '#ffffff' : '#000000';
    ctx.fillRect(x0 + b * size, y0, size, size);
  }
}

function readIndex(ctx, w, h) {
  const { size, x0, y0 } = blockLayout(w, h);
  let idx = 0;
  for (let b = 0; b < BITS; b++) {
    const cx = Math.round(x0 + b * size + size / 2);
    const cy = Math.round(y0 + size / 2);
    const d = ctx.getImageData(cx - 2, cy - 2, 4, 4).data;
    let lum = 0;
    for (let i = 0; i < d.length; i += 4) lum += d[i] + d[i + 1] + d[i + 2];
    if (lum / (d.length / 4) / 3 > 128) idx |= 1 << b;
  }
  return idx;
}

// --- Source generation -------------------------------------------------------
export async function makeSource({ fps = 60, seconds = 4, w = 540, h = 960, gopSeconds = 2 } = {}) {
  const total = Math.round(fps * seconds);
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: 'avc', width: w, height: h, frameRate: fps },
    fastStart: 'in-memory',
  });
  let err = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { err = e; } });
  enc.configure({ codec: 'avc1.640028', width: w, height: h, bitrate: 6_000_000, framerate: fps, avc: { format: 'avc' } });
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const dur = Math.round(1e6 / fps);
  for (let i = 0; i < total; i++) {
    const t = i / fps;
    ctx.fillStyle = `hsl(${(t * 90) % 360} 40% 30%)`;
    ctx.fillRect(0, 0, w, h);
    // moving bar so motion judder is visible when watching the file
    ctx.fillStyle = '#f5a524';
    ctx.fillRect(((t * w) / 2) % w, h * 0.7, w / 10, h / 10);
    drawIndex(ctx, w, h, i);
    const frame = new VideoFrame(canvas, { timestamp: i * dur, duration: dur });
    enc.encode(frame, { keyFrame: i % Math.round(fps * gopSeconds) === 0 });
    frame.close();
    while (enc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 2));
  }
  await enc.flush();
  if (err) throw err;
  muxer.finalize();
  return new File([muxer.target.buffer], `bench_${fps}fps.mp4`, { type: 'video/mp4' });
}

// --- Output analysis ----------------------------------------------------------
function demux(buffer) {
  return new Promise((resolve, reject) => {
    const file = createFile();
    let track = null;
    const samples = [];
    file.onError = (e) => reject(new Error(String(e)));
    file.onReady = (info) => {
      track = info.videoTracks[0];
      file.setExtractionOptions(track.id, null, { nbSamples: Infinity });
      file.start();
    };
    file.onSamples = (_id, _u, s) => samples.push(...s);
    file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(buffer, 0));
    file.flush();
    const trak = file.getTrackById(track.id);
    let description;
    for (const entry of trak.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
      if (box) {
        const { DataStream, Endianness } = window.__mp4box;
        const ds = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
        box.write(ds);
        description = new Uint8Array(ds.buffer, 8);
      }
    }
    resolve({ track, samples, description });
  });
}

async function analyze(blob, { srcFps }) {
  const { track, samples, description } = await demux(await blob.arrayBuffer());
  const w = track.video.width;
  const h = track.video.height;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const frames = [];
  const dec = new VideoDecoder({
    output: (f) => {
      ctx.drawImage(f, 0, 0, w, h);
      frames.push({ ts: f.timestamp, idx: readIndex(ctx, w, h) });
      f.close();
    },
    error: (e) => { throw e; },
  });
  dec.configure({ codec: track.codec, codedWidth: w, codedHeight: h, description });
  for (const s of samples) {
    dec.decode(new EncodedVideoChunk({
      type: s.is_sync ? 'key' : 'delta',
      timestamp: (s.cts * 1e6) / s.timescale,
      duration: (s.duration * 1e6) / s.timescale,
      data: s.data,
    }));
  }
  await dec.flush();
  frames.sort((a, b) => a.ts - b.ts);

  const durS = (track.duration / track.timescale) || (frames.length ? (frames[frames.length - 1].ts / 1e6) : 0);
  const outFps = frames.length > 1 ? (frames.length - 1) / ((frames[frames.length - 1].ts - frames[0].ts) / 1e6) : 0;
  let mismatches = 0, repeats = 0, skips = 0, maxErr = 0;
  for (let k = 0; k < frames.length; k++) {
    const expected = Math.floor(((frames[k].ts - frames[0].ts) / 1e6) * srcFps + 1e-3);
    const e = Math.abs(frames[k].idx - expected);
    if (e) mismatches++;
    maxErr = Math.max(maxErr, e);
    if (k > 0) {
      const step = frames[k].idx - frames[k - 1].idx;
      const expStep = expected - Math.floor(((frames[k - 1].ts - frames[0].ts) / 1e6) * srcFps + 1e-3);
      if (step === 0 && expStep > 0) repeats++;
      if (step > expStep && step > 1) skips++;
    }
  }
  return {
    codec: track.codec, size: `${w}x${h}`, outFrames: frames.length,
    outDurationS: +durS.toFixed(3), outFps: +outFps.toFixed(2),
    mismatches, repeats, skips, maxErr,
    sample: frames.slice(0, 24).map((f) => f.idx).join(','),
  };
}

const CAPTION = {
  text: 'WAIT FOR THE END', fontFamily: 'Bebas Neue', fontSize: 60, fontWeight: '700', textTransform: 'uppercase',
  textColor: '#FFE600', strokeColor: '#000000', strokeWidth: 8, shadowColor: 'rgba(0,0,0,0.9)', shadowBlur: 14,
  shadowOffsetX: 3, shadowOffsetY: 4, boxBg: 'transparent', boxPadding: 16, boxRadius: 10, position: 'center', yOffset: 0, textAlign: 'center',
};
const WATERMARK = {
  type: 'text', text: '@videofy.creator', anchor: 'top-right', scale: 18, opacity: 85, margin: 32, textColor: '#ffffff',
  fontSize: 28, fontFamily: 'Montserrat', badgeBg: 'rgba(0,0,0,0.45)', badgeRadius: 8,
};

export async function runBench({ impl = 'current', srcFps = 60, seconds = 4, w = 540, h = 960, quality = 'high', gopSeconds = 2, forceSeekPath = false } = {}) {
  const mod = impl === 'baseline' ? baseline : current;
  const file = await makeSource({ fps: srcFps, seconds, w, h, gopSeconds });
  const t0 = performance.now();
  const result = await mod.renderSingleVideoWebCodecs({
    file, index: 0, captionSettings: CAPTION, watermarkSettings: WATERMARK, watermarkImgElement: null,
    tweetCardSettings: { enabled: false }, tweetAvatarImgElement: null, exportQuality: quality, preserveAudio: false, forceSeekPath,
  });
  const renderMs = Math.round(performance.now() - t0);
  const report = await analyze(result.blob, { srcFps });
  return { impl, srcFps, seconds, src: `${w}x${h}`, quality, renderMs, realtimeX: +((seconds * 1000) / renderMs).toFixed(2), path: result.path || 'n/a', ...report };
}

import('mp4box').then((m) => { window.__mp4box = m; });
window.runBench = runBench;
window.makeSource = makeSource;

// Real-world shape: a MediaRecorder clip like the app's "Cortes de teste" (fragmented MP4 or WebM).
// It carries no frame code, so only fps, frame count and the render path are reported.
import { createSampleVideoCut } from '../../src/utils/sampleVideos.js';
export async function runSampleCut({ quality = 'high' } = {}) {
  const file = await createSampleVideoCut({ title: 'Bench cut', durationSeconds: 3 });
  const t0 = performance.now();
  const result = await current.renderSingleVideoWebCodecs({
    file, index: 0, captionSettings: CAPTION, watermarkSettings: WATERMARK, watermarkImgElement: null,
    tweetCardSettings: { enabled: false }, tweetAvatarImgElement: null, exportQuality: quality, preserveAudio: true,
  });
  const { track, samples } = await demux(await result.blob.arrayBuffer());
  return {
    input: `${file.type} ${(file.size / 1024).toFixed(0)} KB`, path: result.path, outFps: result.fps,
    outFrames: samples.length, renderMs: Math.round(performance.now() - t0), codec: track.codec,
  };
}
window.runSampleCut = runSampleCut;
