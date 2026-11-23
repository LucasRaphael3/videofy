import React from 'react';
import { Check, X } from 'lucide-react';
import { CHECKOUT_URLS } from '../lib/plans';

const OFFERS = [
  {
    id: 'creator',
    name: 'Criador',
    price: 'R$ 29',
    period: '/mês',
    perks: ['Lotes sem limite', '1080p, fps original até 60', 'Sem a marca do Videofy'],
    lead: true,
  },
  {
    id: 'agency',
    name: 'Agência',
    price: 'R$ 79',
    period: '/mês',
    perks: ['Tudo do Criador', 'Até 3 pessoas', 'Suporte no WhatsApp'],
  },
  {
    id: 'founder',
    name: 'Fundador',
    price: 'R$ 397',
    period: 'único',
    perks: ['Criador vitalício', 'Só no lançamento, 100 vagas'],
  },
];

// reason: { kind: 'batch', total, max } | { kind: 'quality', label } | { kind: 'branding' }
function reasonText(reason) {
  if (!reason) return 'Escolha um plano para liberar o Videofy completo.';
  if (reason.kind === 'batch') {
    return `O plano grátis renderiza até ${reason.max} cortes por lote. Sua fila tem ${reason.total}.`;
  }
  if (reason.kind === 'quality') {
    return `A qualidade ${reason.label} faz parte dos planos pagos. O grátis exporta até 720p.`;
  }
  return 'Os planos pagos exportam sem a marca "feito com Videofy".';
}

export default function UpgradeModal({ isOpen, onClose, reason, email, onContinueFree }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 id="upgrade-title" className="text-lg font-medium text-slate-100">Libere o lote completo</h3>
            <p className="text-sm text-slate-400">{reasonText(reason)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5" aria-label="Fechar">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OFFERS.map((offer) => {
            const href = CHECKOUT_URLS[offer.id] || '/#precos';
            return (
              <div
                key={offer.id}
                className={`rounded-xl border p-4 flex flex-col gap-3 ${offer.lead ? 'border-accent/70 bg-slate-800/60' : 'border-white/[0.08] bg-slate-900/60'}`}
              >
                <div className="text-sm font-medium text-slate-100">{offer.name}</div>
                <div className="tc text-2xl text-slate-100">
                  {offer.price} <span className="text-xs text-slate-500 font-sans">{offer.period}</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-400 flex-1">
                  {offer.perks.map((perk) => (
                    <li key={perk} className="flex gap-2">
                      <Check className="w-3.5 h-3.5 mt-px text-slate-500 shrink-0" strokeWidth={1.5} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${offer.lead ? 'btn-primary' : 'btn-secondary'} h-9 text-sm no-underline`}
                >
                  Assinar {offer.name}
                </a>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500">
            {email
              ? <>Use o e-mail <span className="text-slate-300">{email}</span> no pagamento para o plano cair nesta conta.</>
              : 'Depois do pagamento, o plano é liberado na sua conta.'}
          </p>
          {onContinueFree && (
            <button type="button" onClick={onContinueFree} className="text-sm text-slate-300 hover:text-slate-100 underline underline-offset-4 decoration-white/20 shrink-0">
              {reason?.kind === 'batch' ? `Renderizar só os ${reason.max} primeiros` : 'Continuar no grátis'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
