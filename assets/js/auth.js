/* assets/js/auth.js */

async function handleLogin(e){
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass  = $('loginPass').value;
  const err   = $('loginError');
  const info  = $('loginInfo');
  const btn   = e.target.querySelector('button[type="submit"]');

  btn.textContent = 'Entrando...';
  btn.disabled = true;
  err.classList.add('hidden');
  info?.classList.add('hidden');

  // 1. Autentica no Supabase Auth
  const { error: authError } = await window.db.auth.signInWithPassword({ email, password: pass });

  if (authError) {
    err.textContent = 'E-mail ou senha inválidos.';
    err.classList.remove('hidden');
    btn.textContent = 'Entrar';
    btn.disabled = false;
    return;
  }

  // Sessão é salva automaticamente pelo Supabase no localStorage.
  window.location.href = 'app.html';
}

async function handleForgotPassword(e){
  e?.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const err   = $('loginError');
  const info  = $('loginInfo');
  const btn   = $('forgotBtn');

  err.classList.add('hidden');
  info?.classList.add('hidden');

  if (!email) {
    err.textContent = 'Digite seu e-mail acima primeiro, depois clique em "Esqueci minha senha".';
    err.classList.remove('hidden');
    $('loginEmail').focus();
    return;
  }

  if (!confirm(`Enviar e-mail de redefinição de senha para ${email}?`)) return;

  btn.textContent = 'Enviando...';
  btn.disabled = true;

  // URL absoluta do reset.html — funciona em dev e prod
  const redirectTo = new URL('reset.html', window.location.href).href;

  const { error } = await window.db.auth.resetPasswordForEmail(email, { redirectTo });

  btn.textContent = 'Esqueci minha senha';
  btn.disabled = false;

  if (error) {
    err.textContent = 'Erro: ' + error.message;
    err.classList.remove('hidden');
  } else if (info) {
    info.textContent = 'E-mail enviado! Verifique sua caixa de entrada (e o spam).';
    info.classList.remove('hidden');
  }
}

async function logout(){
  await window.db.auth.signOut();
  window.location.href = 'index.html';
}

async function requireAuth(){
  // 1. Sessão ativa?
  const { data: { session }, error } = await window.db.auth.getSession();

  if (error || !session) {
    window.location.href = 'index.html';
    return null;
  }

  // 2. Perfil em tempo real
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

  // 3. Mapeamento
  return {
    ...profile,
    companyId: profile.company_id,
    gestorId: profile.manager_id
  };
}

async function bootLoginPage(){
  const { data: { session } } = await window.db.auth.getSession();
  if(session){
    window.location.href = 'app.html';
    return;
  }

  $('loginForm').addEventListener('submit', handleLogin);
  $('forgotBtn')?.addEventListener('click', handleForgotPassword);
}

if(document.getElementById('loginForm')) bootLoginPage();
