/* assets/js/auth.js */

async function handleLogin(e){
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  const err = $('loginError');
  const btn = e.target.querySelector('button[type="submit"]');
  
  btn.textContent = 'Entrando...';
  btn.disabled = true;
  err.classList.add('hidden');

  // 1. Autentica no Supabase Auth
  const { data: authData, error: authError } = await window.db.auth.signInWithPassword({ email, password: pass });

  if (authError) {
    err.textContent = 'E-mail ou senha inválidos.';
    err.classList.remove('hidden');
    btn.textContent = 'Entrar';
    btn.disabled = false;
    return;
  }

  // A sessão já é salva automaticamente pelo Supabase no localStorage.
  // Apenas redireciona para o app.
  window.location.href = 'app.html';
}

async function logout(){
  await window.db.auth.signOut();
  window.location.href = 'index.html';
}

async function requireAuth(){
  // 1. Verifica se existe uma sessão ativa no Supabase
  const { data: { session }, error } = await window.db.auth.getSession();
  
  if (error || !session) {
    window.location.href = 'index.html';
    return null;
  }

  // 2. Busca os dados do perfil em tempo real no banco de dados
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

  // 3. Mapeia e retorna os dados sempre atualizados
  return {
    ...profile,
    companyId: profile.company_id,
    gestorId: profile.manager_id
  };
}

async function bootLoginPage(){
  // Se o usuário já tem uma sessão válida, pula a tela de login
  const { data: { session } } = await window.db.auth.getSession();
  if(session){
    window.location.href = 'app.html';
    return;
  }
  
  $('loginForm').addEventListener('submit', handleLogin);
  
  const demoGrid = $('demoGrid');
  if(demoGrid) {
    demoGrid.innerHTML = `<p style="font-size:11px;color:var(--gray-500);text-align:center;grid-column:1/-1">
      Para testar, crie usuários no painel do Supabase (Authentication > Users)<br>
      e vincule-os na tabela 'profiles'.
    </p>`;
  }
}

if(document.getElementById('loginForm')) bootLoginPage();
