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
  const u = state.currentUser;
  $('sideAvatar').textContent = initials(u.name);
  $('sideName').textContent = u.name;
  $('sideRole').textContent = ROLE_LABELS[u.role];

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

function renderCompanySelector(){
  const sel = $('companySelect');
  const comps = accessibleCompanies();
  sel.innerHTML = comps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = state.currentCompany;
  sel.disabled = comps.length <= 1;
  sel.onchange = () => {
    state.currentCompany = sel.value;
    renderTopbar();
    showView(document.querySelector('.nav-item.active')?.dataset.view || 'objetivos');
  };
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