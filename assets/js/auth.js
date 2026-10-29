/* Login/logout e sessão (index.html + app.html) */

function handleLogin(e){
  e.preventDefault();
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  const u = state.users.find(x => x.email.toLowerCase() === email && x.password === pass);
  if(!u){
    const err = $('loginError');
    err.textContent = 'E-mail ou senha inválidos.';
    err.classList.remove('hidden');
    return;
  }
  sessionStorage.setItem(SESSION_KEY, u.id);
  window.location.href = 'app.html';
}

function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html';
}

function currentSessionUser(){
  const id = sessionStorage.getItem(SESSION_KEY);
  return id ? state.users.find(u => u.id === id) : null;
}

function requireAuth(){
  const u = currentSessionUser();
  if(!u){ window.location.href = 'index.html'; return null; }
  return u;
}

/* Boot específico de index.html */
function bootLoginPage(){
  if(currentSessionUser()){
    window.location.href = 'app.html';
    return;
  }
  $('loginForm').addEventListener('submit', handleLogin);

  const demoGrid = $('demoGrid');
  if(demoGrid){
    const order = ['u1','u2','u3','u4','u5','u6'];
    demoGrid.innerHTML = order.map(id => {
      const u = state.users.find(x => x.id === id);
      if(!u) return '';
      const comp = u.companyId ? companyById(u.companyId)?.name : 'Todas';
      return `<button type="button" class="demo-btn" onclick="quickLogin('${u.id}')">
        <div class="avatar" style="background:${ROLE_COLORS[u.role]}">${initials(u.name)}</div>
        <div class="info">
          <strong>${u.name}</strong>
          <small>${ROLE_SHORT[u.role]} · ${comp}</small>
        </div>
      </button>`;
    }).join('');
  }
}

function quickLogin(userId){
  const u = state.users.find(x => x.id === userId);
  if(!u) return;
  sessionStorage.setItem(SESSION_KEY, u.id);
  window.location.href = 'app.html';
}

/* index.html é a única página que chama bootLoginPage diretamente */
if(document.getElementById('loginForm')) bootLoginPage();