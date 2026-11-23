import React, { useEffect, useState } from 'react';
import { Loader2, Mail, X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onGoogle, onEmail, isSignedIn, onSignedIn }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && isSignedIn) onSignedIn?.();
  }, [isOpen, isSignedIn, onSignedIn]);

  useEffect(() => {
    if (!isOpen) { setStatus('idle'); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await onEmail(email.trim());
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Não foi possível enviar o link. Confira o e-mail e tente de novo.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await onGoogle();
    } catch (err) {
      setError(err?.message || 'Não foi possível abrir o login do Google.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="glass-panel w-full max-w-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 id="auth-title" className="text-lg font-medium text-slate-100">Entre para exportar</h3>
            <p className="text-sm text-slate-400">
              Seus cortes continuam aqui. A conta é grátis e guarda o seu plano.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5" aria-label="Fechar">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {status === 'sent' ? (
          <div className="rounded-lg border border-white/[0.08] bg-slate-800/60 p-4 text-sm text-slate-300 space-y-1">
            <p className="text-slate-100 font-medium">Link enviado para {email}</p>
            <p className="text-slate-400">Abra o e-mail e clique no link. Esta tela atualiza sozinha quando o login terminar.</p>
          </div>
        ) : (
          <>
            <button type="button" onClick={handleGoogle} className="btn-secondary w-full h-10 text-sm">
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-white/[0.08]" />ou<span className="h-px flex-1 bg-white/[0.08]" />
            </div>

            <form onSubmit={handleEmail} className="space-y-2">
              <label htmlFor="auth-email" className="text-xs text-slate-400">E-mail</label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                className="w-full h-10 px-3 rounded-lg bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder:text-slate-600 focus:border-accent/60 outline-none"
              />
              <button type="submit" disabled={status === 'sending'} className="btn-primary w-full h-10 text-sm">
                {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Mail className="w-4 h-4" strokeWidth={1.5} />}
                {status === 'sending' ? 'Enviando' : 'Receber link de acesso'}
              </button>
            </form>
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
