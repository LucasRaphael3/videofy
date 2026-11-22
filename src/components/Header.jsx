import React from 'react';
import { FlaskConical, Play, Loader2 } from 'lucide-react';

export default function Header({
  totalVideos,
  completedVideos,
  onGenerateSamples,
  isGeneratingSamples,
  onStartBatch,
  isProcessing,
  hasActiveQueue
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-slate-950/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 py-3 md:py-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/[0.08] flex items-center justify-center">
            <Play className="w-4 h-4 text-accent fill-current" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-base font-semibold leading-none text-slate-100">Videofy</h1>
            <p className="text-xs text-slate-400">
              Legenda, marca d'água e card em lote para TikTok, Reels e Shorts
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onGenerateSamples}
            disabled={isGeneratingSamples || isProcessing}
            className="btn-secondary text-sm h-9 px-3"
            title="Gera 3 cortes de teste para experimentar o fluxo"
          >
            {isGeneratingSamples ? (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" strokeWidth={1.5} />
            ) : (
              <FlaskConical className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            )}
            {isGeneratingSamples ? 'Gerando cortes' : 'Cortes de teste'}
          </button>

          {/* Queue counter, timecode style */}
          <div className="tc flex items-center gap-2 h-9 px-3 rounded-lg border border-white/[0.08] text-xs text-slate-400">
            <span>Fila</span>
            <span className="text-slate-100">{String(totalVideos).padStart(2, '0')}</span>
            {completedVideos > 0 && (
              <>
                <span className="text-slate-600">/</span>
                <span className="text-[#4cc38a]">{String(completedVideos).padStart(2, '0')} prontos</span>
              </>
            )}
          </div>

          <button
            onClick={onStartBatch}
            disabled={!hasActiveQueue || isProcessing}
            className="btn-primary text-sm h-9 px-4"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
            )}
            {isProcessing ? 'Renderizando' : 'Renderizar todos'}
          </button>
        </div>
      </div>
    </header>
  );
}
