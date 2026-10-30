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

const ICONS = {
  dashboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
  objetivos: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
  minhas: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  responsaveis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  empresas: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>`
};

const NAV = [
  { section:'Visão geral' },
  { id:'dashboard', label:'Dashboard', icon:ICONS.dashboard, show:()=>true },
  { section:'Plano de ação' },
  { id:'objetivos', label:'Objetivos', icon:ICONS.objetivos, show:()=>true },
  { id:'minhas',    label:'Minhas tarefas', icon:ICONS.minhas, show:()=>true },
  { section:'Administração', show:()=>can('seeUsers') || can('seeCompanies') },
  { id:'responsaveis', label:'Responsáveis', icon:ICONS.responsaveis, show:()=>can('seeUsers') },
  { id:'empresas',     label:'Empresas',     icon:ICONS.empresas, show:()=>can('seeCompanies') }
];

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if(sidebar) sidebar.classList.toggle('open');
  if(overlay) overlay.classList.toggle('hidden');
}

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
    el.addEventListener('click', () => {
      showView(el.dataset.view);
      // No mobile, fecha o menu ao clicar
      if(window.innerWidth <= 900) toggleSidebar();
    });
  });
}

function renderTopbar(){
  const u = state.currentUser;
  $('topAvatar').textContent = initials(u.name);
  $('topName').innerHTML = `${escapeHtml(u.name)} <span class="role-badge" style="background:${ROLE_COLORS[u.role]}22;color:${ROLE_COLORS[u.role]}">${ROLE_SHORT[u.role]}</span>`;
  $('topCompany').textContent = state.currentCompany ? companyById(state.currentCompany)?.name : '—';

  // Lógica do Seletor de Empresa na Topbar
  const isGlobal = can('scope') === 'all';
  const comps = accessibleCompanies();
  const selectorEl = $('topbarCompanySelector');
  
  if (isGlobal && comps.length > 0) {
    selectorEl.innerHTML = `
      <div class="company-selector">
        <div class="dot"></div>
        <select id="topCompanySelect">
          ${comps.map(c => `<option value="${c.id}" ${c.id == state.currentCompany ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
        </select>
      </div>
    `;
    $('topCompanySelect').onchange = (e) => {
      state.currentCompany = Number(e.target.value);
      renderTopbar();
      showView(document.querySelector('.nav-item.active')?.dataset.view || 'objetivos');
    };
  } else {
    selectorEl.innerHTML = ''; 
  }
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
  const panel = document.createElement('div');
  panel.className = 'user-menu-panel';
  panel.onclick = e => e.stopPropagation();

  panel.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid var(--gray-100); display:flex; gap:10px; align-items:center; background:var(--gray-50)">
        <div class="avatar" style="width:38px;height:38px">${initials(u.name)}</div>
        <div style="overflow:hidden">
          <div style="font-weight:700;font-size:14px;color:var(--gray-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.name)}</div>
          <div style="font-size:12px;color:var(--gray-500)">${u.email}</div>
        </div>
    </div>
    <div class="user-menu-item danger" onclick="logout()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        Sair da conta
    </div>
  `;
  document.body.appendChild(panel);

  setTimeout(() => {
    document.addEventListener('click', function close(e){
      if(!e.target.closest('.user-menu-panel') && !e.target.closest('#userMenuBtn')){
        document.querySelector('.user-menu-panel')?.remove();
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}
