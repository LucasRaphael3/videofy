import React from 'react';
import { CheckCircle2, Download, Loader2, AlertCircle, X, Archive, Sparkles } from 'lucide-react';
import { saveFileBlob } from '../utils/videoProcessor';

export default function BatchProgressModal({
  isOpen,
  onClose,
  isProcessing,
  overallProgress,
  completedCount,
  totalCount,
  videos,
  onDownloadZip,
  isZipping,
  zipProgress
}) {
  if (!isOpen) return null;

  const isAllDone = !isProcessing && completedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isAllDone 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-accent/15 text-accent border border-accent/30'
            }`}>
              {isAllDone ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                {isAllDone ? 'Lote renderizado' : 'Renderizando lote'}
              </h3>
              <p className="text-xs text-slate-400">
                {isAllDone 
                  ? `${completedCount} cortes prontos para postar` 
                  : `Renderizando ${completedCount} de ${totalCount} cortes`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Overall Progress Bar */}
          <div className="space-y-2 bg-slate-900/60 p-4 rounded-lg border border-white/5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Progresso do lote</span>
              <span className="text-accent font-mono text-sm">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="bg-accent h-full rounded-full transition-[width] duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Individual Videos Progress List */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400 block">
              Por corte
            </span>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {videos.map((item, index) => {
                const isItemDone = item.status === 'completed';
                const isItemRendering = item.status === 'rendering';
                const isItemFailed = item.status === 'failed';

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="font-mono text-slate-500 w-5">#{index + 1}</span>
                      <span className="text-white font-medium truncate max-w-[280px]">
                        {item.file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isItemDone ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Concluído</span>
                          {item.result && (
                            <button
                              type="button"
                              onClick={() => {
                                const cleanBase = (item.file.name || 'video').replace(/\.[^/.]+$/, "").replace(/[/\\?%*:|"<>]/g, "_");
                                const ext = item.result.extension || 'mp4';
                                saveFileBlob(item.result.blob, `${cleanBase}_videofy.${ext}`);
                              }}
                              className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                              title="Baixar vídeo individual"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : isItemRendering ? (
                        <div className="flex items-center gap-2 text-accent">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="font-mono">{item.progress || 0}%</span>
                        </div>
                      ) : isItemFailed ? (
                        <div className="flex items-center gap-1 text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                          <span>Falhou</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Na fila</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-6 border-t border-white/10 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="btn-secondary text-xs py-2.5 px-4 w-full sm:w-auto"
          >
            {isAllDone ? 'Fechar' : 'Ocultar'}
          </button>

          {isAllDone && (
            <button
              onClick={onDownloadZip}
              disabled={isZipping}
              className="btn-primary text-xs py-2.5 px-6 w-full sm:w-auto"
            >
              <Archive className="w-4 h-4" strokeWidth={1.5} />
              {isZipping ? `Compactando ${zipProgress}%` : 'Baixar todos (.zip)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
