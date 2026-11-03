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

  if (email !== emailConfirm) {
    err.textContent = 'Os e-mails não coincidem.'; err.classList.remove('hidden'); return;
  }
  if (pass !== passConfirm) {
    err.textContent = 'As senhas não coincidem.'; err.classList.remove('hidden'); return;
  }
  if (!companyId) {
    err.textContent = 'Selecione sua unidade.'; err.classList.remove('hidden'); return;
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>_\-+=]).{8,}$/;
  if (!passwordRegex.test(pass)) {
    err.textContent = 'A senha deve ter no mínimo 8 caracteres, conter 1 letra maiúscula e 1 caractere especial.';
    err.classList.remove('hidden'); return;
  }

  btn.textContent = 'Cadastrando...'; btn.disabled = true;

  const { data, error } = await window.db.auth.signUp({
    email: email,
    password: pass,
    options: {
      data: {
        name: name,
        role: 'unique_user',
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

// --- FUNÇÕES DO SISTEMA (APP.HTML) ---

async function logout(){
  await window.db.auth.signOut();
  window.location.href = 'index.html';
}

async function requireAuth(){
  const { data: { session }, error } = await window.db.auth.getSession();
  
  if (error || !session) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: profile, error: profileError } = await window.db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Erro ao buscar perfil:", profileError);
    await window.db.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  return {
    ...profile,
    companyId: profile.company_id,
    gestorId: profile.manager_id
  };
}

// INICIALIZAÇÃO DA PÁGINA DE LOGIN
async function bootLoginPage(){
  const { data: { session } } = await window.db.auth.getSession();
  if(session){
    window.location.href = 'app.html';
    return;
  }
  
  $('loginForm').addEventListener('submit', handleLogin);
  $('signupForm').addEventListener('submit', handleSignUp);
  $('forgotForm').addEventListener('submit', handleForgot);

  const { data: comps, error } = await window.db.from('companies').select('id, name').eq('is_active', true).order('name');
  
  const sel = $('signupCompany');
  if (error) {
    console.error("Erro ao carregar empresas:", error);
    sel.innerHTML = '<option value="">Erro ao carregar empresas</option>';
  } else if (comps && comps.length > 0) {
    sel.innerHTML = '<option value="">Selecione sua empresa</option>';
    comps.forEach(c => {
      sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
  } else {
    sel.innerHTML = '<option value="">Nenhuma empresa ativa encontrada</option>';
  }
}

if(document.getElementById('loginForm')) bootLoginPage();
