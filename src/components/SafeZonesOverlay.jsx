import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Music, 
  Search, 
  Disc, 
  Send, 
  MoreVertical, 
  ThumbsUp, 
  ThumbsDown, 
  Repeat2, 
  Camera, 
  CheckCircle2, 
  AlertOctagon 
} from 'lucide-react';

export default function SafeZonesOverlay({ platform = 'tiktok', opacity = 85 }) {
  if (!platform || platform === 'off') return null;

  const alpha = opacity / 100;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden select-none transition-opacity duration-200"
      style={{ opacity: alpha }}
    >
      {/* ========================================================
          1. TIKTOK SAFE ZONE OVERLAY
          ======================================================== */}
      {platform === 'tiktok' && (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          {/* Top Bar Danger Zone */}
          <div className="bg-red-500/20 border-b border-red-500/40 pb-2 pt-1 px-2 flex items-center justify-between text-white backdrop-blur-[2px]">
            <div className="flex items-center gap-1 bg-red-600/60 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">
              LIVE
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-white/60 text-[11px]">Seguindo</span>
              <span className="text-white border-b-2 border-white pb-0.5 text-[11px]">Para você</span>
            </div>
            <Search className="w-4 h-4 text-white" />
          </div>

          {/* Danger zone banner top */}
          <div className="absolute top-12 left-0 right-0 text-center">
            <span className="bg-red-950/80 border border-red-500/40 text-red-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
              ▲ Evitar Topo: Barra de Busca e Abas do TikTok (12%)
            </span>
          </div>

          {/* Right Action Rail (Likes, Comments, Share, Disc) */}
          <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3.5 bg-red-500/20 border-l border-red-500/40 p-1.5 rounded-2xl backdrop-blur-[2px]">
            {/* Profile Avatar */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500 p-0.5">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                  TK
                </div>
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-pink-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold leading-none">
                +
              </div>
            </div>

            {/* Like */}
            <div className="flex flex-col items-center">
              <Heart className="w-6 h-6 text-white fill-white/20" />
              <span className="text-[9px] font-bold text-white mt-0.5">842K</span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center">
              <MessageCircle className="w-6 h-6 text-white fill-white/20" />
              <span className="text-[9px] font-bold text-white mt-0.5">14.2K</span>
            </div>

            {/* Bookmark */}
            <div className="flex flex-col items-center">
              <Bookmark className="w-6 h-6 text-white fill-white/20" />
              <span className="text-[9px] font-bold text-white mt-0.5">45.8K</span>
            </div>

            {/* Share */}
            <div className="flex flex-col items-center">
              <Share2 className="w-6 h-6 text-white fill-white/20" />
              <span className="text-[9px] font-bold text-white mt-0.5">89K</span>
            </div>

            {/* Spinning Disc */}
            <div className="w-7 h-7 rounded-full bg-slate-950 border-2 border-white/40 flex items-center justify-center animate-spin">
              <Disc className="w-4 h-4 text-pink-400" />
            </div>
          </div>

          {/* Danger zone label right rail */}
          <div className="absolute right-14 bottom-44 -rotate-90 origin-right">
            <span className="bg-red-950/80 border border-red-500/40 text-red-300 text-[9px] px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
              ▶ Evitar Direita: Botões do TikTok (16%)
            </span>
          </div>

          {/* Bottom Footer Danger Zone (Handle, Caption, Audio, Nav) */}
          <div className="bg-red-500/20 border-t border-red-500/40 pt-2 pb-1 px-3 mt-auto space-y-1 backdrop-blur-[2px] pr-16">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">@criador.oficial</span>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 flex items-center justify-center text-[7px] text-black font-bold">✓</span>
            </div>
            <p className="text-[10px] text-white/90 line-clamp-2 leading-tight">
              Aquele corte viral imperdível que você precisa ver até o fim! 🔥 #fyp #viral
            </p>
            <div className="flex items-center gap-1 text-[9px] text-white/70">
              <Music className="w-3 h-3 text-pink-400 animate-pulse" />
              <span className="truncate">Som original - Criador Oficial</span>
            </div>

            <div className="text-center pt-1">
              <span className="bg-red-950/80 border border-red-500/40 text-red-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
                ▼ Evitar Rodapé: Legenda nativa & Menu do TikTok (18%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. INSTAGRAM REELS SAFE ZONE OVERLAY
          ======================================================== */}
      {platform === 'reels' && (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          {/* Top Bar Header */}
          <div className="bg-fuchsia-500/20 border-b border-fuchsia-500/40 pb-2 pt-1 px-2 flex items-center justify-between text-white backdrop-blur-[2px]">
            <span className="text-sm font-extrabold tracking-wide">Reels</span>
            <div className="flex items-center gap-3">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Top warning */}
          <div className="absolute top-12 left-0 right-0 text-center">
            <span className="bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
              ▲ Topo do Instagram Reels (10%)
            </span>
          </div>

          {/* Right Action Rail */}
          <div className="absolute right-2 bottom-14 flex flex-col items-center gap-3.5 bg-fuchsia-500/20 border-l border-fuchsia-500/40 p-1.5 rounded-2xl backdrop-blur-[2px]">
            <div className="flex flex-col items-center">
              <Heart className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white mt-0.5">512K</span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white mt-0.5">3,820</span>
            </div>
            <div className="flex flex-col items-center">
              <Send className="w-5 h-5 text-white -rotate-12" />
              <span className="text-[9px] font-bold text-white mt-0.5">74K</span>
            </div>
            <div className="flex flex-col items-center">
              <MoreVertical className="w-5 h-5 text-white" />
            </div>
            <div className="w-6 h-6 rounded-md bg-slate-900 border border-white/40 flex items-center justify-center">
              <Music className="w-3 h-3 text-fuchsia-400" />
            </div>
          </div>

          {/* Bottom Footer (Reel Account & Audio) */}
          <div className="bg-fuchsia-500/20 border-t border-fuchsia-500/40 pt-2 pb-1 px-3 mt-auto space-y-1 backdrop-blur-[2px] pr-16">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-0.5">
                <div className="w-full h-full bg-slate-900 rounded-full" />
              </div>
              <span className="text-xs font-bold text-white">canal_reels</span>
              <button className="text-[10px] font-semibold border border-white/40 px-2 py-0.5 rounded-full text-white">
                Seguir
              </button>
            </div>
            <p className="text-[10px] text-white/90 line-clamp-1">
              Confira os melhores momentos desta edição imperdível...
            </p>
            <div className="text-center pt-1">
              <span className="bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
                ▼ Evitar Rodapé: Perfil & Áudio do Instagram Reels (16%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. YOUTUBE SHORTS SAFE ZONE OVERLAY
          ======================================================== */}
      {platform === 'shorts' && (
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          {/* Top Bar Header */}
          <div className="bg-red-600/20 border-b border-red-600/40 pb-2 pt-1 px-2 flex items-center justify-between text-white backdrop-blur-[2px]">
            <div className="flex items-center gap-1 text-red-500 font-extrabold text-xs">
              <span className="bg-red-600 text-white px-1 rounded text-[9px]">Shorts</span>
            </div>
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4 text-white" />
              <MoreVertical className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Top Warning */}
          <div className="absolute top-12 left-0 right-0 text-center">
            <span className="bg-red-950/80 border border-red-600/40 text-red-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
              ▲ Topo do YouTube Shorts (10%)
            </span>
          </div>

          {/* Right Action Rail */}
          <div className="absolute right-2 bottom-14 flex flex-col items-center gap-3.5 bg-red-600/20 border-l border-red-600/40 p-1.5 rounded-2xl backdrop-blur-[2px]">
            <div className="flex flex-col items-center">
              <ThumbsUp className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white mt-0.5">1.2M</span>
            </div>
            <div className="flex flex-col items-center">
              <ThumbsDown className="w-5 h-5 text-white" />
              <span className="text-[9px] text-white/70 mt-0.5">Não gostei</span>
            </div>
            <div className="flex flex-col items-center">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-[9px] font-bold text-white mt-0.5">8.4K</span>
            </div>
            <div className="flex flex-col items-center">
              <Share2 className="w-5 h-5 text-white" />
              <span className="text-[9px] text-white/70 mt-0.5">Compartilhar</span>
            </div>
            <div className="flex flex-col items-center">
              <Repeat2 className="w-5 h-5 text-white" />
              <span className="text-[9px] text-white/70 mt-0.5">Remix</span>
            </div>
          </div>

          {/* Bottom Footer (Channel, Subscribe, Sound) */}
          <div className="bg-red-600/20 border-t border-red-600/40 pt-2 pb-1 px-3 mt-auto space-y-1.5 backdrop-blur-[2px] pr-16">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white">
                YT
              </div>
              <span className="text-xs font-bold text-white">@CanalYouTube</span>
              <button className="text-[9px] font-bold bg-white text-black px-2 py-0.5 rounded-full">
                Inscrever-se
              </button>
            </div>
            <p className="text-[10px] text-white font-medium line-clamp-1">
              O corte mais incrível do YouTube Shorts de hoje! 😱
            </p>
            <div className="text-center pt-0.5">
              <span className="bg-red-950/80 border border-red-600/40 text-red-300 text-[9px] px-2 py-0.5 rounded-full font-mono">
                ▼ Evitar Rodapé: Inscrição & Título Shorts (18%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. UNIVERSAL (TODAS AS REDES COMBINADAS)
          ======================================================== */}
      {platform === 'universal' && (
        <div className="absolute inset-0 flex flex-col justify-between">
          {/* Top Obscured Area */}
          <div className="h-[14%] bg-red-600/25 border-b border-red-500/50 flex flex-col items-center justify-center p-1 backdrop-blur-[1px]">
            <span className="text-[10px] font-bold text-red-300 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" />
              ÁREA SUPERIOR OCUPADA (14%)
            </span>
            <span className="text-[8px] text-red-200/80">Busca, LIVE e abas das redes</span>
          </div>

          {/* Middle Guaranteed Safe Zone with Left/Right margins */}
          <div className="flex-1 flex justify-between relative">
            {/* Left margin */}
            <div className="w-[5%] bg-red-600/20 border-r border-red-500/30" />

            {/* Central 100% Safe Island Box */}
            <div className="flex-1 m-1 rounded-xl border-2 border-dashed border-emerald-400/80 bg-emerald-500/5 flex flex-col items-center justify-center p-2 relative shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]">
              <div className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ÁREA 100% SEGURA UNIVERSAL
              </div>
              <span className="text-[9px] text-emerald-200/80 mt-1 font-medium text-center">
                Posicione sua legenda e landmark aqui para visibilidade perfeita no TikTok, Reels e Shorts
              </span>
            </div>

            {/* Right Action Rail Danger Zone */}
            <div className="w-[18%] bg-red-600/25 border-l border-red-500/50 flex flex-col items-center justify-center p-1 text-center backdrop-blur-[1px]">
              <span className="text-[9px] font-bold text-red-300 -rotate-90 whitespace-nowrap">
                BOTÕES LATERAIS (18%)
              </span>
            </div>
          </div>

          {/* Bottom Obscured Area */}
          <div className="h-[20%] bg-red-600/25 border-t border-red-500/50 flex flex-col items-center justify-center p-1 backdrop-blur-[1px]">
            <span className="text-[10px] font-bold text-red-300 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3" />
              ÁREA INFERIOR OCUPADA (20%)
            </span>
            <span className="text-[8px] text-red-200/80">Legendas nativas, nomes de usuário, áudio e navegação</span>
          </div>
        </div>
      )}
    </div>
  );
}
