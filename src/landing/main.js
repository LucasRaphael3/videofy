import './landing.css';
import { supabase } from '../lib/supabase';
import { CHECKOUT_URLS } from '../lib/plans';

// Checkout links, when the payment provider is set up
document.querySelectorAll('[data-checkout]').forEach((a) => {
  const url = CHECKOUT_URLS[a.dataset.checkout];
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
});
if (CHECKOUT_URLS.founder) {
  document.querySelectorAll('[data-founder-link]').forEach((a) => {
    a.href = CHECKOUT_URLS.founder; a.target = '_blank'; a.rel = 'noopener noreferrer';
  });
}

// Founder waitlist
const form = document.getElementById('waitlist');
const status = document.getElementById('wl-status');

function setStatus(text, kind = '') {
  status.textContent = text;
  status.dataset.kind = kind;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.email.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setStatus('Digite um e-mail válido, como voce@exemplo.com.', 'error');
    form.email.focus();
    return;
  }
  if (!supabase) {
    setStatus('A lista ainda não está ligada neste ambiente. Faltam as chaves do Supabase.', 'error');
    return;
  }

  const button = form.querySelector('button');
  button.disabled = true;
  setStatus('Enviando');

  const { error } = await supabase.from('waitlist').insert({
    email,
    weekly_cuts: form.weekly_cuts.value || null,
    source: new URLSearchParams(window.location.search).get('ref') || null,
  });
  button.disabled = false;

  if (!error) {
    form.reset();
    setStatus('Pronto, você está na lista. Avisamos quando as vagas abrirem.', 'ok');
  } else if (error.code === '23505') {
    setStatus('Esse e-mail já está na lista.', 'ok');
  } else {
    setStatus('Não foi possível salvar agora. Tente de novo em alguns minutos.', 'error');
  }
});
