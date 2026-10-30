const NAV = [
  { section:'Visão geral' },
  { id:'dashboard', label:'Dashboard', icon:'◧', show:()=>true },
  { section:'Plano de ação' },
  { id:'objetivos', label:'Objetivos', icon:'◎', show:()=>true },
  { id:'minhas',    label:'Minhas tarefas', icon:'✓', show:()=>true },
  { section:'Administração', show:()=>can('seeUsers') || can('seeCompanies') },
  { id:'responsaveis', label:'Responsáveis', icon:'◕', show:()=>can('seeUsers') },
  { id:'empresas',     label:'Empresas',     icon:'▤', show:()=>can('seeCompanies') }
];

function renderSidebar(){
  let html = '';
  NAV.forEach(item => {
    if(item.section){
      if(item.show && !item.show()) return;
      html += `<div class="nav-section-label">${item.section}</div>`;
      return;
    }
    if(!item.show()) return;
    html += `<div class="nav-item" data-view="${item.id}">
      <span class="ico">${item.icon}</span>${item.label}
    </div>`;
  });
  $('sidebarNav').innerHTML = html;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => showView(el.dataset.view));
  });
}

function renderTopbar(){
  const u = state.currentUser;
  $('topAvatar').textContent = initials(u.name);
  $('topName').innerHTML = `${u.name} <span class="role-badge" style="background:${ROLE_COLORS[u.role]}22;color:${ROLE_COLORS[u.role]}">${ROLE_SHORT[u.role]}</span>`;
  $('topCompany').textContent = state.currentCompany ? companyById(state.currentCompany)?.name : '—';
}

function showView(viewId){
  if(!viewId) return;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const target = $('view-' + viewId);
  if(!target) return;
  target.classList.remove('hidden');
  if(viewId === 'dashboard')     renderDashboard();
  if(viewId === 'objetivos')     renderObjectives();
  if(viewId === 'minhas')        renderMyTasks();
  if(viewId === 'responsaveis')  renderUsers();
  if(viewId === 'empresas')      renderCompanies();
}

/* ---- Menu Dropdown do Usuário ---- */
function toggleUserMenu(ev) {
  ev?.stopPropagation();
  const existing = document.querySelector('.user-menu-panel');
  if(existing) { existing.remove(); return; }

  const u = state.currentUser;
  const isGlobal = can('scope') === 'all';
  const comps = accessibleCompanies();

  const panel = document.createElement('div');
  panel.className = 'user-menu-panel';
  panel.onclick = e => e.stopPropagation();

  let companyHTML = '';
  if (isGlobal && comps.length > 0) {
      companyHTML = `
        <div style="padding: 14px 16px; border-bottom: 1px solid var(--gray-100);">
          <label style="font-size:10px;text-transform:uppercase;color:var(--gray-500);font-weight:600;margin-bottom:6px;display:block">Trocar Empresa</label>
          <select id="companySelect" style="width:100%;padding:8px;border:1px solid var(--gray-300);border-radius:6px;outline:none;font-size:13px;font-weight:600;color:var(--gray-800)">
            ${comps.map(c => `<option value="${c.id}" ${c.id == state.currentCompany ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      `;
  }

  panel.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid var(--gray-100); display:flex; gap:10px; align-items:center; background:var(--gray-50)">
        <div class="avatar" style="width:38px;height:38px">${initials(u.name)}</div>
        <div style="overflow:hidden">
          <div style="font-weight:700;font-size:14px;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name}</div>
          <div style="font-size:11px;color:var(--gray-500)">${u.email}</div>
        </div>
    </div>
    ${companyHTML}
    <div class="user-menu-item" onclick="alert('As configurações do usuário serão implementadas em breve.')">
        <span style="font-size:16px">⚙</span> Configurações do Usuário
    </div>
    <div class="user-menu-item danger" onclick="logout()">
        <span style="font-size:16px">↩</span> Sair da conta
    </div>
  `;
  document.body.appendChild(panel);

  if (isGlobal && comps.length > 0) {
      $('companySelect').onchange = (e) => {
          state.currentCompany = Number(e.target.value);
          renderTopbar();
          showView(document.querySelector('.nav-item.active')?.dataset.view || 'objetivos');
          panel.remove();
      };
  }

  setTimeout(() => {
    document.addEventListener('click', function close(e){
      if(!e.target.closest('.user-menu-panel') && !e.target.closest('#userMenuBtn')){
        document.querySelector('.user-menu-panel')?.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}
