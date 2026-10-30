const $ = id => document.getElementById(id);
const fmtBRL = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('pt-BR',
  {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id_' + Math.random().toString(36).slice(2,10);
const initials = n => (n||'').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowIso = () => new Date().toISOString();

// Sistema de Toasts (Notificações no canto da tela)
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6';
  const icon = type === 'error' ? '✕' : type === 'success' ? '✓' : 'ℹ';
  
  toast.style.cssText = `background:${bg};color:#fff;padding:12px 20px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;opacity:0;transform:translateX(20px);transition:all 0.3s ease;pointer-events:auto;`;
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateX(0)'; }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
