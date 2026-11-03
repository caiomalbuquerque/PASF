const $ = id => document.getElementById(id);

(async function bootstrapReset() {
  const form   = $('resetForm');
  const errDiv = $('resetError');
  const infoDiv= $('resetInfo');

  const { data: { session }, error } = await window.db.auth.getSession();

  if (error || !session) {
    form.innerHTML = `<div class="login-error">
      Link inválido ou expirado.<br>
      <a href="index.html" style="color:inherit;font-weight:700;text-decoration:underline">Voltar ao login</a> e solicite um novo e-mail.
    </div>`;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errDiv.classList.add('hidden');
    infoDiv.classList.add('hidden');

    const pass  = $('resetPass').value;
    const pass2 = $('resetPassConfirm').value;

    // Validação da Senha Forte (Mín 8, 1 Maiúscula, 1 Especial)
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;
    if (!passwordRegex.test(pass)) {
      errDiv.textContent = 'A senha deve ter no mínimo 8 caracteres, conter 1 letra maiúscula e 1 caractere especial.';
      errDiv.classList.remove('hidden');
      return;
    }

    if (pass !== pass2) {
      errDiv.textContent = 'As senhas não coincidem.';
      errDiv.classList.remove('hidden');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Salvando...'; btn.disabled = true;

    const { error: updateError } = await window.db.auth.updateUser({ password: pass });

    if (updateError) {
      errDiv.textContent = 'Erro: ' + updateError.message;
      errDiv.classList.remove('hidden');
      btn.textContent = 'Salvar nova senha'; btn.disabled = false;
      return;
    }

    infoDiv.textContent = 'Senha alterada com sucesso! Redirecionando para o login...';
    infoDiv.classList.remove('hidden');

    setTimeout(async () => {
      await window.db.auth.signOut();
      window.location.href = 'index.html';
    }, 2000);
  });
})();
