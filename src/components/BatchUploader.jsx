import React, { useRef, useState } from 'react';
import { UploadCloud, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BatchUploader({ onFilesSelected, isExtracting, videoCount }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setErrorMessage('');

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('video/') ||
      /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name)
    );

    if (files.length === 0) {
      setErrorMessage('Nenhum vídeo reconhecido. Use .mp4, .mov ou .webm');
      return;
    }

    onFilesSelected(files);
  };

  const handleFileInputChange = (e) => {
    setErrorMessage('');
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = ''; // Reset for re-selection
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept="video/*,.mp4,.mov,.webm,.mkv"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors duration-150 ${
          isDragOver
            ? 'border-accent bg-accent/[0.06]'
            : 'border-white/15 bg-slate-900 hover:border-white/25 hover:bg-slate-800/60'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center border border-white/[0.08]">
            <UploadCloud className="w-5 h-5" strokeWidth={1.5} />
          </div>

          <div>
            <h3 className="text-base font-medium text-slate-100 mb-1">
              Solte os cortes aqui
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              MP4, MOV ou WEBM, quantos arquivos quiser. Tudo é processado no seu navegador.
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              className="btn-secondary text-xs py-2 px-4 pointer-events-none"
            >
              <PlusCircle className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              Escolher arquivos
            </button>
          </div>

          {/* Supported Format Badges */}
          <div className="tc text-xs text-slate-500">9:16 · 16:9 · 1:1</div>

          {/* Loading Indicator when parsing metadata */}
          {isExtracting && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
              Lendo metadados e gerando miniaturas
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
