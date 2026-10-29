const $ = id => document.getElementById(id);
const fmtBRL = v => (v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
const fmtDateTime = iso => iso ? new Date(iso).toLocaleString('pt-BR',
  {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const uid = () => 'id_' + Math.random().toString(36).slice(2,10);
const initials = n => (n||'').split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase();
const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowIso = () => new Date().toISOString();