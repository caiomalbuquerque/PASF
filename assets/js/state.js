/* assets/js/state.js */

// Estado inicial vazio (será preenchido pelo main.js via Supabase)
const state = {
  companies: [],
  users: [],
  objectives: {},
  auditLog: [],
  notifications: [],
  currentUser: null,
  currentCompany: null
};

// Função mantida por compatibilidade (agora os dados vão direto pro banco)
function saveState() {
}

// Função do botão de reset na tela de login
function resetDemo() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.clear();
  window.location.href = 'index.html';
}
