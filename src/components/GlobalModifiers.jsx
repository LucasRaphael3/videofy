import React, { useRef } from 'react';
import { 
  Type, 
  Sparkles, 
  Image as ImageIcon, 
  Sliders, 
  Upload, 
  Trash2, 
  AlignCenter, 
  AlignLeft, 
  AlignRight, 
  MoveVertical,
  Move,
  Cpu,
  MessageSquare,
  Palette,
  User,
  CheckCircle2,
  Zap,
  Crop,
  Maximize,
  Scissors,
  ZoomIn,
  RotateCcw
} from 'lucide-react';
import { EXPORT_QUALITY_PRESETS } from '../utils/videoProcessor';

export default function GlobalModifiers({
  activeTab,
  setActiveTab,
  captionSettings,
  setCaptionSettings,
  watermarkSettings,
  setWatermarkSettings,
  watermarkImgPreview,
  setWatermarkImgPreview,
  onLogoUploaded,
  onClearLogo,
  tweetCardSettings,
  setTweetCardSettings,
  tweetAvatarPreview,
  onTweetAvatarUploaded,
  onClearTweetAvatar,
  exportQuality = 'high',
  setExportQuality,
  concurrency,
  setConcurrency,
  preserveAudio,
  setPreserveAudio
}) {
  const logoInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const handleAvatarFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onTweetAvatarUploaded(e.target.files[0]);
      e.target.value = '';
    }
  };

  // Quick Style Presets for Captions
  const applyCaptionPreset = (presetKey) => {
    switch (presetKey) {
      case 'viral':
        setCaptionSettings((prev) => ({
          ...prev,
          fontFamily: 'Bebas Neue',
          fontSize: 64,
          textColor: '#FFE600',
          strokeColor: '#000000',
          strokeWidth: 8,
          shadowColor: 'rgba(0, 0, 0, 0.9)',
          shadowBlur: 14,
          boxBg: 'transparent',
          position: 'center',
          yOffset: 0,
        }));
        break;
      case 'minimal':
        setCaptionSettings((prev) => ({
          ...prev,
          fontFamily: 'Montserrat',
          fontSize: 42,
          textColor: '#ffffff',
          strokeWidth: 0,
          shadowBlur: 6,
          boxBg: 'rgba(15, 23, 42, 0.75)',
          boxPadding: 16,
          boxRadius: 10,
          position: 'bottom',
          yOffset: -40,
        }));
        break;
      case 'headline':
        setCaptionSettings((prev) => ({
          ...prev,
          fontFamily: 'Impact',
          fontSize: 52,
          textColor: '#ffffff',
          strokeColor: '#000000',
          strokeWidth: 4,
          boxBg: 'rgba(220, 38, 38, 0.9)',
          boxPadding: 18,
          boxRadius: 6,
          position: 'top',
          yOffset: 30,
        }));
        break;
      case 'neon':
        setCaptionSettings((prev) => ({
          ...prev,
          fontFamily: 'Oswald',
          fontSize: 56,
          textColor: '#38bdf8',
          strokeColor: '#4f46e5',
          strokeWidth: 6,
          shadowColor: '#a855f7',
          shadowBlur: 20,
          boxBg: 'rgba(0, 0, 0, 0.5)',
          boxPadding: 14,
          boxRadius: 12,
          position: 'center',
          yOffset: 0,
        }));
        break;
      default:
        break;
    }
  };

  const handleLogoFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onLogoUploaded(file);
      e.target.value = '';
    }
  };

  return (
    <div className="glass-panel p-5">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-3 mb-5">
        <button
          onClick={() => setActiveTab('captions')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'captions'
              ? 'bg-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          }`}
        >
          <Type className="w-4 h-4" />
          Legenda
        </button>

        <button
          onClick={() => setActiveTab('watermark')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'watermark'
              ? 'bg-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Marca d'água
        </button>

        <button
          onClick={() => setActiveTab('tweet')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'tweet'
              ? 'bg-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Card do X
          {tweetCardSettings?.enabled && (
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'engine'
              ? 'bg-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
          }`}
        >
          <Cpu className="w-4 h-4" />
          Exportação
        </button>
      </div>

      {/* TAB 1: CAPTIONS / TEXT OVERLAY */}
      {activeTab === 'captions' && (
        <div className="space-y-4">
          {/* Text Input Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                Texto da legenda
              </label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <span>Variáveis:</span>
                <button
                  type="button"
                  onClick={() => setCaptionSettings(prev => ({ ...prev, text: prev.text + ' {filename}' }))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 tc text-slate-100 font-medium text-[11px]"
                  title="Insere o nome do arquivo individual de cada corte"
                >
                  {'{filename}'}
                </button>
                <button
                  type="button"
                  onClick={() => setCaptionSettings(prev => ({ ...prev, text: prev.text + ' #{index}' }))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 tc text-slate-100 font-medium text-[11px]"
                  title="Insere o número do corte na fila"
                >
                  {'#{index}'}
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              value={captionSettings.text}
              onChange={(e) => setCaptionSettings(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Legenda aplicada a todos os cortes"
              className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-accent transition-colors font-medium resize-none placeholder:text-slate-500"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-xs font-medium text-slate-400 block mb-2">
              Estilos prontos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyCaptionPreset('viral')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/[0.08] hover:border-white/20 hover:bg-slate-800 text-xs font-medium text-slate-100 flex flex-col items-start gap-1 transition-colors"
              >
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFE600' }} aria-hidden="true" />Amarelo viral</span>
                <span className="text-[11px] text-slate-400 font-normal">Amarelo com contorno</span>
              </button>
              <button
                type="button"
                onClick={() => applyCaptionPreset('minimal')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/[0.08] hover:border-white/20 hover:bg-slate-800 text-xs font-medium text-slate-100 flex flex-col items-start gap-1 transition-colors"
              >
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffffff' }} aria-hidden="true" />Caixa discreta</span>
                <span className="text-[11px] text-slate-400 font-normal">Caixa escura suave</span>
              </button>
              <button
                type="button"
                onClick={() => applyCaptionPreset('headline')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/[0.08] hover:border-white/20 hover:bg-slate-800 text-xs font-medium text-slate-100 flex flex-col items-start gap-1 transition-colors"
              >
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5484d' }} aria-hidden="true" />Plantão</span>
                <span className="text-[11px] text-slate-400 font-normal">Badge vermelha</span>
              </button>
              <button
                type="button"
                onClick={() => applyCaptionPreset('neon')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-white/[0.08] hover:border-white/20 hover:bg-slate-800 text-xs font-medium text-slate-100 flex flex-col items-start gap-1 transition-colors"
              >
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#22d3ee' }} aria-hidden="true" />Neon</span>
                <span className="text-[11px] text-slate-400 font-normal">Brilho ciano</span>
              </button>
            </div>
          </div>

          {/* Typography Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
            {/* Font Family */}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Fonte
              </label>
              <select
                value={captionSettings.fontFamily}
                onChange={(e) => setCaptionSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
              >
                <option value="Bebas Neue">Bebas Neue</option>
                <option value="Impact">Impact</option>
                <option value="Montserrat">Montserrat (Moderno & Clean)</option>
                <option value="Inter">Inter (Elegante & Nítido)</option>
                <option value="Anton">Anton (Grosso & Marcante)</option>
                <option value="Oswald">Oswald (Dinâmico)</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  Tamanho da fonte
                  <span className="text-[11px] text-slate-500">
                    ⤢ ou direto no vídeo
                  </span>
                </span>
                <span className="text-white font-mono font-medium">{captionSettings.fontSize}px</span>
              </div>
              <input
                type="range"
                min={18}
                max={130}
                value={captionSettings.fontSize}
                onChange={(e) => setCaptionSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              />
            </div>

            {/* Text Color & Stroke Color */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-slate-400 block mb-1">Cor do texto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={captionSettings.textColor}
                    onChange={(e) => setCaptionSettings(prev => ({ ...prev, textColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{captionSettings.textColor}</span>
                </div>
              </div>

              <div className="flex-1">
                <label className="text-xs font-medium text-slate-400 block mb-1">Cor do contorno</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={captionSettings.strokeColor}
                    onChange={(e) => setCaptionSettings(prev => ({ ...prev, strokeColor: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs font-mono text-slate-300">{captionSettings.strokeColor}</span>
                </div>
              </div>
            </div>

            {/* Stroke Width Slider */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Espessura do contorno</span>
                <span className="text-white">{captionSettings.strokeWidth}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                value={captionSettings.strokeWidth}
                onChange={(e) => setCaptionSettings(prev => ({ ...prev, strokeWidth: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          {/* Positioning & Drag Indicator */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="p-3 bg-slate-800/60 border border-white/[0.08] rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-slate-500" />
                  Posição da legenda
                </span>
                <span className="text-[11px] text-slate-400">
                  Arraste diretamente na tela ou use os atalhos abaixo
                </span>
              </div>
              <div className="text-right font-mono text-xs font-medium text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-md border border-white/[0.08]">
                X: {typeof captionSettings.xPercent === 'number' ? captionSettings.xPercent : 50}% | Y: {typeof captionSettings.yPercent === 'number' ? captionSettings.yPercent : 50}%
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">
                Atalhos de posição
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top', label: 'Topo', x: 50, y: 18 },
                  { id: 'center', label: 'Centro', x: 50, y: 50 },
                  { id: 'bottom', label: 'Rodapé', x: 50, y: 78 }
                ].map((pos) => {
                  const isActive = (captionSettings.position === pos.id && typeof captionSettings.yPercent !== 'number') ||
                    (typeof captionSettings.yPercent === 'number' && Math.abs(captionSettings.yPercent - pos.y) < 5);

                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setCaptionSettings(prev => ({
                        ...prev,
                        position: pos.id,
                        xPercent: pos.x,
                        yPercent: pos.y,
                        yOffset: 0
                      }))}
                      className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                        isActive
                          ? 'bg-slate-800 border-accent/70 text-white'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Ajuste vertical</span>
                <span className="text-white">
                  {typeof captionSettings.yPercent === 'number' ? `${captionSettings.yPercent}%` : `${captionSettings.yOffset}px`}
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={94}
                value={typeof captionSettings.yPercent === 'number' ? captionSettings.yPercent : 50}
                onChange={(e) => setCaptionSettings(prev => ({ 
                  ...prev, 
                  yPercent: parseInt(e.target.value),
                  xPercent: typeof prev.xPercent === 'number' ? prev.xPercent : 50
                }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT LANDMARK (WATERMARK) */}
      {activeTab === 'watermark' && (
        <div className="space-y-4">
          {/* Watermark Type Selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setWatermarkSettings(prev => ({ ...prev, type: 'logo' }))}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                watermarkSettings.type === 'logo'
                  ? 'bg-slate-800 border-accent/70 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Logo Imagem (PNG)
            </button>
            <button
              type="button"
              onClick={() => setWatermarkSettings(prev => ({ ...prev, type: 'text' }))}
              className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border transition-colors ${
                watermarkSettings.type === 'text'
                  ? 'bg-slate-800 border-accent/70 text-white'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Type className="w-4 h-4" />
              Texto (@Canal / Handle)
            </button>
          </div>

          {/* Logo Upload Section */}
          {watermarkSettings.type === 'logo' ? (
            <div>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoFileChange}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
              />

              {watermarkImgPreview ? (
                <div className="p-3 bg-slate-900/90 border border-white/10 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-black/60 border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                      <img
                        src={watermarkImgPreview}
                        alt="Logo Preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-white block">Logo carregado</span>
                      <span className="text-[11px] text-emerald-400">Pronto para aplicar em lote</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={onClearLogo}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800 transition-colors"
                      title="Remover logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-white/15 hover:border-white/25 rounded-lg bg-slate-900/40 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                  <span className="text-xs font-medium text-white block">Fazer upload do Logo (PNG)</span>
                  <span className="text-[11px] text-slate-400">Recomendado PNG com fundo transparente</span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Texto do Landmark / Canal
              </label>
              <input
                type="text"
                value={watermarkSettings.text}
                onChange={(e) => setWatermarkSettings(prev => ({ ...prev, text: e.target.value }))}
                placeholder="@seuusuario.oficial"
                className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-accent"
              />
            </div>
          )}

          {/* Landmark Position Indicator */}
          <div className="p-3 bg-slate-800/60 border border-white/[0.08] rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <MoveVertical className="w-3.5 h-3.5 text-slate-500" />
                Posição do Landmark no Vídeo
              </span>
              <span className="text-[11px] text-slate-400">
                Arraste no vídeo ou clique nas âncoras
              </span>
            </div>
            <div className="text-right font-mono text-xs font-medium text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-md border border-white/[0.08]">
              X: {typeof watermarkSettings.xPercent === 'number' ? watermarkSettings.xPercent : 86}% | Y: {typeof watermarkSettings.yPercent === 'number' ? watermarkSettings.yPercent : 10}%
            </div>
          </div>

          {/* Anchor Points 3x3 Selector */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Ponto de Fixação (Âncora do Landmark)
            </label>
            <div className="grid grid-cols-3 gap-2 max-w-[280px]">
              {[
                { id: 'top-left', label: '↖ Topo Esq', x: 12, y: 10 },
                { id: 'center', label: '• Centro', x: 50, y: 50 },
                { id: 'top-right', label: '↗ Topo Dir', x: 86, y: 10 },
                { id: 'bottom-left', label: '↙ Base Esq', x: 12, y: 88 },
                { id: 'center', label: '• Centro', x: 50, y: 50 },
                { id: 'bottom-right', label: '↘ Base Dir', x: 86, y: 88 },
              ].map((anchor, idx) => {
                if (idx === 4) return <div key="spacer" />;
                const isActive = (watermarkSettings.anchor === anchor.id && typeof watermarkSettings.xPercent !== 'number') ||
                  (typeof watermarkSettings.xPercent === 'number' && Math.abs(watermarkSettings.xPercent - anchor.x) < 8 && Math.abs(watermarkSettings.yPercent - anchor.y) < 8);

                return (
                  <button
                    key={anchor.id + idx}
                    type="button"
                    onClick={() => setWatermarkSettings(prev => ({ 
                      ...prev, 
                      anchor: anchor.id,
                      xPercent: anchor.x,
                      yPercent: anchor.y
                    }))}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                      isActive
                        ? 'bg-accent border-accent text-accent-ink'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {anchor.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders: Scale, Opacity, Margin */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            {/* Scale */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  Escala / Tamanho do Landmark
                  <span className="text-[11px] text-slate-500">
                    ⤢ ou direto no vídeo
                  </span>
                </span>
                <span className="text-white font-mono font-medium">{watermarkSettings.scale}%</span>
              </div>
              <input
                type="range"
                min={6}
                max={60}
                value={watermarkSettings.scale}
                onChange={(e) => setWatermarkSettings(prev => ({ ...prev, scale: parseInt(e.target.value) }))}
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Opacidade (Transparência)</span>
                <span className="text-white">{watermarkSettings.opacity}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={100}
                value={watermarkSettings.opacity}
                onChange={(e) => setWatermarkSettings(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
              />
            </div>

            {/* Margin from edges */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
                <span>Margem das bordas</span>
                <span className="text-white">{watermarkSettings.margin}px</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                value={watermarkSettings.margin}
                onChange={(e) => setWatermarkSettings(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH ENGINE CONCURRENCY, QUALITY & AUDIO SETTINGS */}
      {activeTab === 'engine' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-800/60 border border-white/[0.08] text-xs text-slate-300">
            <p className="font-semibold mb-1">Renderização e exportação</p>
            <p className="text-[11px] text-slate-400">
              Processamento acelerado por hardware no navegador com empacotamento ZIP instantâneo e controle refinado de bitrate e resolução.
            </p>
          </div>

          {/* Export Quality Preset Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Qualidade de Renderização & Bitrate
              </label>
              <span className="text-[11px] text-slate-400">
                Altera nitidez e tamanho do arquivo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(EXPORT_QUALITY_PRESETS).map((preset) => {
                const isSelected = (exportQuality || 'high') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setExportQuality(preset.id)}
                    className={`p-3 rounded-lg border text-left transition-colors relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-800 border-accent/70'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-medium text-white mb-0.5">{preset.label}</div>
                    <div className="text-[11px] text-slate-400 mb-2 leading-tight">{preset.sublabel}</div>

                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-300 border border-white/[0.08]">
                        {preset.bitrate / 1_000_000} Mbps • {preset.fps} FPS
                      </span>
                      <span className="text-slate-400 font-sans">
                        {preset.sizeEstimate}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concurrency Threads */}
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-1">
              <span>Cortes renderizados em paralelo</span>
              <span className="text-white font-medium">{concurrency} em paralelo</span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value))}
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Configuração recomendada: 2 para equilíbrio térmico, 3-4 para processadores velozes.
            </span>
          </div>

          {/* Audio toggle */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white block">Manter áudio original</span>
              <span className="text-[11px] text-slate-400">Multiplexa a trilha sonora e voz dos cortes renderizados</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preserveAudio}
                onChange={(e) => setPreserveAudio(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-colors peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      )}

      {/* TAB 4: TWITTER / X MEME CARD FORMAT */}
      {activeTab === 'tweet' && (
        <div className="space-y-4">
          {/* Main Activation Toggle */}
          <div className="p-4 rounded-lg bg-slate-800/60 border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 border border-white/[0.08] flex items-center justify-center text-slate-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">Card do X</span>
                  {tweetCardSettings?.enabled && (
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ATIVO
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">
                  Cabeçalho de post com avatar, nome, selo, @ e legenda sobre o vídeo
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tweetCardSettings?.enabled || false}
                onChange={(e) => setTweetCardSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-colors peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* Mode Selector: 9:16 Frame vs Floating Overlay */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Modo de Exibição
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTweetCardSettings(prev => ({ ...prev, mode: 'frame' }))}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  tweetCardSettings?.mode === 'frame'
                    ? 'bg-slate-800 border-accent/70 text-white'
                    : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-medium text-xs flex items-center justify-between mb-0.5">
                  <span>Moldura 9:16 Vertical</span>
                  <span className="text-[11px] text-slate-500">Recomendado</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cabeçalho no topo com fundo colorido e vídeo ajustado embaixo (Reels / TikTok).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTweetCardSettings(prev => ({ ...prev, mode: 'overlay' }))}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  tweetCardSettings?.mode === 'overlay'
                    ? 'bg-slate-800 border-accent/70 text-white'
                    : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-medium text-xs mb-0.5">Card flutuante</div>
                <p className="text-[11px] text-slate-400">
                  Vídeo original preenche o quadro e o tweet flutua como um adesivo reposicionável.
                </p>
              </button>
            </div>
          </div>

          {/* Twitter Card Position & Movement Indicator */}
          <div className="p-3 bg-slate-800/60 border border-white/[0.08] rounded-lg flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-slate-500" />
                Posição do Card ({tweetCardSettings?.mode === 'frame' ? 'Moldura 9:16' : 'Flutuante'})
              </span>
              <span className="text-[11px] text-slate-400">
                Arraste no vídeo livremente ou reposicione
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="font-mono text-xs font-medium text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-md border border-white/[0.08]">
                X: {typeof tweetCardSettings?.xPercent === 'number' ? tweetCardSettings.xPercent : 50}% | Y: {typeof tweetCardSettings?.yPercent === 'number' ? tweetCardSettings.yPercent : (tweetCardSettings?.mode === 'frame' ? 16 : 20)}%
              </div>
              <button
                type="button"
                onClick={() => setTweetCardSettings(prev => ({ 
                  ...prev, 
                  xPercent: 50, 
                  yPercent: prev.mode === 'frame' ? 16 : 20 
                }))}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 hover:text-white rounded-lg border border-white/10 transition-colors"
                title="Resetar posição no topo central"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Background Style Selector (white, black, dim, blur, custom) */}
          {tweetCardSettings?.mode === 'frame' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                Cor / Estilo do Fundo (Background)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {/* White */}
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, bgType: 'white' }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    tweetCardSettings?.bgType === 'white'
                      ? 'border-accent/70 bg-slate-800 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-white border border-slate-300 shadow-sm mb-1"></div>
                  <span className="text-[11px] font-medium block leading-tight">Branco</span>
                </button>

                {/* Black */}
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, bgType: 'black' }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    tweetCardSettings?.bgType === 'black'
                      ? 'border-accent/70 bg-slate-800 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-black border border-white/20 shadow-sm mb-1"></div>
                  <span className="text-[11px] font-medium block leading-tight">Preto</span>
                </button>

                {/* Dim */}
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, bgType: 'dim' }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    tweetCardSettings?.bgType === 'dim'
                      ? 'border-accent/70 bg-slate-800 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-[#15202b] border border-white/10 mb-1"></div>
                  <span className="text-[11px] font-medium block leading-tight">Dim (X)</span>
                </button>

                {/* Blur */}
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, bgType: 'blur' }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    tweetCardSettings?.bgType === 'blur'
                      ? 'border-accent/70 bg-slate-800 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-slate-500 blur-[1px] mb-1"></div>
                  <span className="text-[11px] font-medium block leading-tight">Vídeo desfocado</span>
                </button>

                {/* Custom / Diverse */}
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, bgType: 'custom' }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    tweetCardSettings?.bgType === 'custom'
                      ? 'border-accent/70 bg-slate-800 text-white'
                      : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-5 h-5 mx-auto rounded-full bg-gradient-to-r from-blue-700 to-slate-900 border border-white/20 shadow-sm mb-1"></div>
                  <span className="text-[11px] font-medium block leading-tight">Diverso</span>
                </button>
              </div>

              {/* Custom Color / Gradient Input */}
              {tweetCardSettings?.bgType === 'custom' && (
                <div className="pt-2 flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Cor do fundo</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={tweetCardSettings.bgColor || '#1e293b'}
                        onChange={(e) => setTweetCardSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={tweetCardSettings.bgColor || '#1e293b'}
                        onChange={(e) => setTweetCardSettings(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono text-white flex-1"
                        placeholder="#hex"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile & Identity (Avatar, Name, Badge, Handle) */}
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-white/10 space-y-3">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Identidade do Perfil (Twitter / X)
            </span>

            {/* Avatar Upload & Preview */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {tweetAvatarPreview ? (
                  <img
                    src={tweetAvatarPreview}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover border border-white/[0.08]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-100 font-medium text-sm">
                    {(tweetCardSettings?.displayName || 'B').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {tweetAvatarPreview ? 'Trocar foto' : 'Enviar foto'}
                  </button>

                  {tweetAvatarPreview && (
                    <button
                      type="button"
                      onClick={onClearTweetAvatar}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  PNG ou JPG. Se vazio, exibe as iniciais do canal.
                </span>
              </div>
            </div>

            {/* Display Name & Handle */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Nome de exibição</label>
                <input
                  type="text"
                  value={tweetCardSettings?.displayName || ''}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Ex: BALLERS"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Usuário (@)</label>
                <input
                  type="text"
                  value={tweetCardSettings?.handle || ''}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, handle: e.target.value }))}
                  placeholder="Ex: @ballers"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
                />
              </div>
            </div>

            {/* Verified Badge Checkbox & Type */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={tweetCardSettings?.verified || false}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, verified: e.target.checked }))}
                  className="rounded border-slate-700 text-accent focus:ring-accent/30"
                />
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  Selo de Verificado
                </span>
              </label>

              {tweetCardSettings?.verified && (
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setTweetCardSettings(prev => ({ ...prev, verifiedType: 'blue' }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      tweetCardSettings?.verifiedType === 'blue'
                        ? 'bg-accent text-accent-ink'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Azul
                  </button>
                  <button
                    type="button"
                    onClick={() => setTweetCardSettings(prev => ({ ...prev, verifiedType: 'gold' }))}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      tweetCardSettings?.verifiedType === 'gold'
                        ? 'bg-amber-500 text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dourado
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tweet Text Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Texto do tweet</label>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, text: prev.text + ' {filename}' }))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 tc text-slate-100 font-medium text-[11px]"
                >
                  {'{filename}'}
                </button>
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({ ...prev, text: prev.text + ' #{index}' }))}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 tc text-slate-100 font-medium text-[11px]"
                >
                  {'#{index}'}
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={tweetCardSettings?.text || ''}
              onChange={(e) => setTweetCardSettings(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Texto do tweet"
              className="w-full px-3 py-2 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-white leading-relaxed resize-none focus:border-accent/50"
            />

            {/* Font Size & Card Scale Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Tamanho da fonte</span>
                  <span className="text-white font-medium">{tweetCardSettings?.fontSize || 32}px</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={64}
                  value={tweetCardSettings?.fontSize || 32}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Largura do card</span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings?.scale || (tweetCardSettings?.mode === 'frame' ? 92 : 90)}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={tweetCardSettings?.scale || (tweetCardSettings?.mode === 'frame' ? 92 : 90)}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, scale: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            {/* Font Family Selector */}
            <div className="pt-1">
              <label className="text-[11px] text-slate-400 block mb-1">Fonte</label>
              <select
                value={tweetCardSettings?.fontFamily || 'Inter'}
                onChange={(e) => setTweetCardSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              >
                <option value="Inter">Inter (padrão do X)</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Arial">Arial</option>
                <option value="Segoe UI">Segoe UI</option>
              </select>
            </div>
          </div>

          {/* Timestamp */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={tweetCardSettings?.showTimestamp || false}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, showTimestamp: e.target.checked }))}
                  className="rounded border-slate-700 text-accent focus:ring-accent/30"
                />
                <span>Mostrar data e hora</span>
              </label>
            </div>

            {tweetCardSettings?.showTimestamp && (
              <input
                type="text"
                value={tweetCardSettings?.timestamp || ''}
                onChange={(e) => setTweetCardSettings(prev => ({ ...prev, timestamp: e.target.value }))}
                placeholder="Ex: 10:00 PM · 15/09/2026"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
              />
            )}
          </div>

          {/* Video Appearance, Cropping & Framing in Frame Mode */}
          {tweetCardSettings?.mode === 'frame' && (
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <Crop className="w-3.5 h-3.5 text-slate-500" />
                  Corte & Redimensionamento do Vídeo
                </span>
                <button
                  type="button"
                  onClick={() => setTweetCardSettings(prev => ({
                    ...prev,
                    videoFit: 'cover',
                    videoScale: 100,
                    videoHeightPercent: 48,
                    videoCropOffsetY: 50,
                    videoCropOffsetX: 50,
                  }))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
                  title="Restaurar valores de enquadramento padrão"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              {/* Fit Modes: Cover, Contain, Square, Custom */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 block">
                  Modo de Corte / Enquadramento (Fit)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cover', label: 'Cover', desc: 'Preencher' },
                    { id: 'contain', label: 'Contain', desc: 'Sem cortes' },
                    { id: 'square', label: '1:1', desc: 'Quadrado' },
                    { id: 'custom', label: 'Livre', desc: 'Ajuste fino' },
                  ].map(mode => {
                    const isSelected = (tweetCardSettings.videoFit || 'cover') === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTweetCardSettings(prev => ({ ...prev, videoFit: mode.id }))}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                          isSelected
                            ? 'bg-accent/15 border-accent tc text-slate-100 font-medium shadow-xs'
                            : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-xs font-medium leading-tight">{mode.label}</div>
                        <div className="text-[11px] opacity-75">{mode.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zoom / Scale Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="w-3 h-3 text-slate-500" />
                    Zoom do Vídeo
                  </span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings.videoScale || 100}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={200}
                  step={5}
                  value={tweetCardSettings.videoScale || 100}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoScale: parseInt(e.target.value) }))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>70% (Abrir)</span>
                  <span>100% (Padrão)</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Video Frame Height Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <Maximize className="w-3 h-3 text-slate-500" />
                    Altura da Moldura do Vídeo
                  </span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings.videoHeightPercent || 48}% da tela</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={70}
                  step={2}
                  value={tweetCardSettings.videoHeightPercent || 48}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoHeightPercent: parseInt(e.target.value), videoFit: 'custom' }))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>30% (Compacto)</span>
                  <span>48% (Equilibrado)</span>
                  <span>70% (Expandido)</span>
                </div>
              </div>

              {/* Vertical Pan Offset (Framing) */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <MoveVertical className="w-3 h-3 text-slate-500" />
                    Enquadramento Vertical (Pan Y)
                  </span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings.videoCropOffsetY ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={2}
                  value={tweetCardSettings.videoCropOffsetY ?? 50}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoCropOffsetY: parseInt(e.target.value) }))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>0% (Topo)</span>
                  <span>50% (Centro)</span>
                  <span>100% (Base)</span>
                </div>
              </div>

              {/* Horizontal Pan Offset */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1">
                    <Move className="w-3 h-3 text-slate-500" />
                    Enquadramento Horizontal (Pan X)
                  </span>
                  <span className="tc text-slate-100 font-medium">{tweetCardSettings.videoCropOffsetX ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={2}
                  value={tweetCardSettings.videoCropOffsetX ?? 50}
                  onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoCropOffsetX: parseInt(e.target.value) }))}
                  className="w-full accent-accent"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>0% (Esquerda)</span>
                  <span>50% (Centro)</span>
                  <span>100% (Direita)</span>
                </div>
              </div>

              {/* Edge-to-Edge & Border Radius */}
              <div className="pt-2 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-white font-medium block">Vídeo de ponta a ponta</span>
                    <span className="text-[11px] text-slate-400">Preenche 100% da largura horizontalmente</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tweetCardSettings?.videoFlush !== false}
                      onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoFlush: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-colors peer-checked:bg-accent"></div>
                  </label>
                </div>

                {tweetCardSettings?.videoFlush === false && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Arredondamento do vídeo</span>
                      <span className="text-white font-medium">{tweetCardSettings?.videoBorderRadius || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={36}
                      value={tweetCardSettings?.videoBorderRadius || 0}
                      onChange={(e) => setTweetCardSettings(prev => ({ ...prev, videoBorderRadius: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
