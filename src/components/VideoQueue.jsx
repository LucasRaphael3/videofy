import React from 'react';
import { Trash2, Play, CheckCircle2, AlertTriangle, Loader2, Download, Eye, Video } from 'lucide-react';
import { saveFileBlob } from '../utils/videoProcessor';

export default function VideoQueue({
  videos,
  selectedVideoId,
  onSelectVideo,
  onRemoveVideo,
  onClearQueue,
  isProcessing
}) {
  if (videos.length === 0) {
    return null;
  }

  const formatTime = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
          <h3 className="font-medium text-slate-100 text-sm">
            Fila <span className="tc text-slate-500 font-normal ml-1">{String(videos.length).padStart(2, '0')}</span>
          </h3>
        </div>

        <button
          onClick={onClearQueue}
          disabled={isProcessing}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar fila
        </button>
      </div>

      {/* Video Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[440px] overflow-y-auto pr-1">
        {videos.map((item, index) => {
          const isSelected = item.id === selectedVideoId;
          const isRendered = item.status === 'completed' && item.result;
          const isFailed = item.status === 'failed';
          const isRendering = item.status === 'rendering';

          return (
            <div
              key={item.id}
              onClick={() => onSelectVideo(item.id)}
              className={`group relative flex flex-col rounded-lg overflow-hidden border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                  : 'border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-[16/10] bg-black overflow-hidden flex items-center justify-center">
                {item.metadata.thumbnail ? (
                  <img
                    src={item.metadata.thumbnail}
                    alt={item.file.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                ) : (
                  <Film className="w-8 h-8 text-slate-600" />
                )}

                {/* Aspect Ratio Badge */}
                <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
                  {item.metadata.aspectRatioLabel || '9:16'}
                </span>

                {/* Duration Badge */}
                <span className="absolute bottom-2 right-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/10">
                  {formatTime(item.metadata.duration)}
                </span>

                {/* Play / Preview Icon Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-9 h-9 rounded-full bg-slate-100/90 text-slate-950 flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>

                {/* Progress Bar during rendering */}
                {isRendering && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-3">
                    <Loader2 className="w-6 h-6 text-accent animate-spin mb-1.5" />
                    <span className="text-xs font-medium text-white mb-1">
                      {item.progress || 0}%
                    </span>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-accent h-full transition-[width] duration-200"
                        style={{ width: `${item.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Meta & Details */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-white truncate flex-1" title={item.file.name}>
                      <span className="tc text-slate-500 mr-1.5">{String(index + 1).padStart(2, '0')}</span>
                      {item.file.name}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveVideo(item.id);
                      }}
                      disabled={isProcessing}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1 -mr-1 -mt-1 disabled:opacity-30"
                      title="Remover corte da fila"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="tc">{item.metadata.width}×{item.metadata.height}</span>
                    <span className="tc">{formatBytes(item.file.size)}</span>
                  </div>
                </div>

                {/* Status Indicator at bottom of card */}
                <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                  {isRendered ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pronto
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cleanBase = (item.file.name || 'video').replace(/\.[^/.]+$/, "").replace(/[/\\?%*:|"<>]/g, "_");
                          const ext = item.result.extension || 'mp4';
                          saveFileBlob(item.result.blob, `${cleanBase}_videofy.${ext}`);
                        }}
                        className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                        title="Baixar vídeo individual"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : isFailed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Erro
                    </span>
                  ) : isRendering ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Renderizando
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">
                      Na fila
                    </span>
                  )}

                  {isSelected && (
                    <span className="text-[11px] text-slate-500">
                      No preview
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
