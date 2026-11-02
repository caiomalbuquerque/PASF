/* assets/js/reset-password.js */

const $ = id => document.getElementById(id);

(async function bootstrapReset() {
  const form   = $('resetForm');
  const errDiv = $('resetError');
  const infoDiv= $('resetInfo');

  // Supabase (v2 com PKCE) processa o `?code=...` da URL automaticamente
  // (detectSessionInUrl: true). Basta aguardar a sessão.
  const { data: { session }, error } = await window.db.auth.getSession();

  if (error || !session) {
    form.innerHTML = `<div class="login-error">
      Link inválido ou expirado.<br>
      <a href="index.html" style="color:inherit;font-weight:700;text-decoration:underline">Voltar ao login</a>
      e solicite um novo e-mail de redefinição.
    </div>`;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errDiv.classList.add('hidden');
    infoDiv.classList.add('hidden');

    const pass  = $('resetPass').value;
    const pass2 = $('resetPassConfirm').value;

    if (pass.length < 6) {
      errDiv.textContent = 'A senha deve ter no mínimo 6 caracteres.';
      errDiv.classList.remove('hidden');
      return;
    }
    if (pass !== pass2) {
      errDiv.textContent = 'As senhas não coincidem.';
      errDiv.classList.remove('hidden');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const { error: updateError } = await window.db.auth.updateUser({ password: pass });

    if (updateError) {
      errDiv.textContent = 'Erro: ' + updateError.message;
      errDiv.classList.remove('hidden');
      btn.textContent = 'Salvar nova senha';
      btn.disabled = false;
      return;
    }

    infoDiv.textContent = 'Senha alterada com sucesso! Redirecionando para o login...';
    infoDiv.classList.remove('hidden');

    // Encerra a sessão para forçar novo login com a senha nova
    setTimeout(async () => {
      await window.db.auth.signOut();
      window.location.href = 'index.html';
    }, 1200);
  });
})();