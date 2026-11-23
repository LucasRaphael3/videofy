// Finishes a Google or magic-link login, then hands control back to the editor tab.
import { supabase } from './lib/supabase';

const title = document.getElementById('title');
const detail = document.getElementById('detail');

function show(t, d) {
  title.textContent = t;
  detail.innerHTML = d;
}

async function finish() {
  if (!supabase) {
    show('Login não configurado', 'Faltam as chaves do Supabase neste ambiente.');
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const errorText = params.get('error_description');
  if (errorText) {
    show('Não foi possível entrar', `${errorText}. <a href="/app/">Voltar ao editor</a>`);
    return;
  }

  // detectSessionInUrl exchanges the ?code= on load; getSession waits for it
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    show('O link expirou', 'Peça um novo link no editor. <a href="/app/">Voltar ao editor</a>');
    return;
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage('videofy:signed-in', window.location.origin);
    window.close();
    return;
  }
  show('Pronto, você entrou', 'Volte para a aba do Videofy, ela já foi atualizada. Ou <a href="/app/">abra o editor aqui</a>.');
}

finish();
