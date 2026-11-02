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

  // 2. Busca o perfil na tabela profiles
  const { data: profile, error: profileError } = await window.db
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Erro detalhado do Supabase:", profileError);
    err.textContent = `Erro: ${profileError?.message || 'Perfil não encontrado'}`;
    err.classList.remove('hidden');
    await window.db.auth.signOut();
    btn.textContent = 'Entrar';
    btn.disabled = false;
    return;
  }

  // 3. Mapeia os dados (snake_case do banco para camelCase do frontend)
  const formattedProfile = {
    ...profile,
    companyId: profile.company_id,
    gestorId: profile.manager_id
  };

  // 4. Salva na sessão e redireciona
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(formattedProfile));
  window.location.href = 'app.html';
}

async function logout(){
  await window.db.auth.signOut();
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

function currentSessionUser(){
  const data = sessionStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

async function requireAuth(){
  const sessionUser = currentSessionUser();
  if(!sessionUser){ 
    window.location.href = 'index.html'; 
    return null; 
  }
  
  const { data: { session } } = await window.db.auth.getSession();
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
    return null;
  }
  
  return sessionUser;
}

function bootLoginPage(){
  if(currentSessionUser()){
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
