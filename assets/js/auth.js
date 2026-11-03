/* assets/js/auth.js */

function showAuthView(view) {
  $('view-login').classList.add('hidden');
  $('view-signup').classList.add('hidden');
  $('view-forgot').classList.add('hidden');
  
  $(`view-${view}`).classList.remove('hidden');
}

// LOGIN
async function handleLogin(e){
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  const err = $('loginError');
  const btn = e.target.querySelector('button[type="submit"]');
  
  btn.textContent = 'Entrando...'; btn.disabled = true; err.classList.add('hidden');

  const { data: authData, error: authError } = await window.db.auth.signInWithPassword({ email, password: pass });

  if (authError) {
    err.textContent = 'E-mail ou senha inválidos.';
    err.classList.remove('hidden');
    btn.textContent = 'Entrar'; btn.disabled = false;
    return;
  }
  window.location.href = 'app.html';
}

// CADASTRO
async function handleSignUp(e){
  e.preventDefault();
  const name = $('signupName').value.trim();
  const email = $('signupEmail').value.trim().toLowerCase();
  const emailConfirm = $('signupEmailConfirm').value.trim().toLowerCase();
  const companyId = $('signupCompany').value;
  const pass = $('signupPass').value;
  const passConfirm = $('signupPassConfirm').value;
  const err = $('signupError');
  const btn = e.target.querySelector('button[type="submit"]');

  err.classList.add('hidden');

  // Validações
  if (email !== emailConfirm) {
    err.textContent = 'Os e-mails não coincidem.'; err.classList.remove('hidden'); return;
  }
  if (pass !== passConfirm) {
    err.textContent = 'As senhas não coincidem.'; err.classList.remove('hidden'); return;
  }
  if (!companyId) {
    err.textContent = 'Selecione sua unidade.'; err.classList.remove('hidden'); return;
  }

  // Validação da Senha Forte (Mín 8, 1 Maiúscula, 1 Especial)
  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;
  if (!passwordRegex.test(pass)) {
    err.textContent = 'A senha deve ter no mínimo 8 caracteres, conter 1 letra maiúscula e 1 caractere especial.';
    err.classList.remove('hidden'); return;
  }

  btn.textContent = 'Cadastrando...'; btn.disabled = true;

  // Cria a conta. O Gatilho no banco vai inserir na tabela profiles automaticamente
  const { data, error } = await window.db.auth.signUp({
    email: email,
    password: pass,
    options: {
      data: {
        name: name,
        role: 'unique_user', // Força ser usuário padrão
        company_id: companyId,
        manager_id: null
      }
    }
  });

  if (error) {
    err.textContent = error.message; 
    err.classList.remove('hidden'); btn.textContent = 'Cadastrar'; btn.disabled = false;
    return;
  }

  // Sucesso
  alert('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro ou faça login.');
  showAuthView('login');
  btn.textContent = 'Cadastrar'; btn.disabled = false;
}

// RECUPERAÇÃO DE SENHA
async function handleForgot(e){
  e.preventDefault();
  const email = $('forgotEmail').value.trim().toLowerCase();
  const err = $('forgotError');
  const succ = $('forgotSuccess');
  const btn = e.target.querySelector('button[type="submit"]');

  err.classList.add('hidden'); succ.classList.add('hidden');
  btn.textContent = 'Enviando...'; btn.disabled = true;

  const { error } = await window.db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password.html',
  });

  if (error) {
    err.textContent = error.message; err.classList.remove('hidden');
  } else {
    succ.textContent = 'Link enviado! Verifique sua caixa de entrada e o spam.'; succ.classList.remove('hidden');
    $('forgotEmail').value = '';
  }
  btn.textContent = 'Enviar Link'; btn.disabled = false;
}

// INICIALIZAÇÃO DA PÁGINA
async function bootLoginPage(){
  const { data: { session } } = await window.db.auth.getSession();
  if(session){
    window.location.href = 'app.html';
    return;
  }
  
  $('loginForm').addEventListener('submit', handleLogin);
  $('signupForm').addEventListener('submit', handleSignUp);
  $('forgotForm').addEventListener('submit', handleForgot);

  // Carrega empresas para o select de cadastro
  const { data: comps } = await window.db.from('companies').select('id, name').eq('is_active', true).order('name');
  if (comps) {
    const sel = $('signupCompany');
    sel.innerHTML = '<option value="">Selecione sua empresa</option>';
    comps.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  }
}

if(document.getElementById('loginForm')) bootLoginPage();
