function renderCompanies(){
  const el = $('view-empresas');
  if(!can('seeCompanies')){
    el.innerHTML = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Você não tem permissão para acessar esta área.</div></div>`;
    return;
  }
  
  // AQUI ESTÁ A MUDANÇA: Ordenando pelo ID numérico (crescente)
  const comps = [...state.companies].sort((a,b) => a.id - b.id);

  el.innerHTML = `
    <div class="page-header">
      <div><h1>Empresas</h1><p>Gerencie os ambientes multiempresa. Empresas inativas não aparecem nos menus.</p></div>
    </div>
    <div class="company-grid">
      ${comps.map(c => {
        const objs = state.objectives[c.id] || [];
        const uCount = state.users.filter(u => u.companyId === c.id).length;
        const est = objs.reduce((s,o) => s + (+o.monthlySavings||0), 0);
        const isInactive = c.is_active === false;
        
        return `<div class="company-card" style="opacity:${isInactive ? '0.6' : '1'}; border-left-color:${isInactive?'var(--gray-400)':'var(--primary)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <h3>${escapeHtml(c.name)}</h3>
            ${can('manageUsers') ? `<button class="btn btn-sm btn-ghost" style="padding:2px 6px" onclick="openEditCompanyModal(${c.id})">✎</button>` : ''}
          </div>
          <p>ID: <strong>${c.id}</strong> ${isInactive ? '• <span style="color:var(--danger);font-weight:600">(Inativa)</span>' : ''}</p>
          <div class="stats">
            <div><span class="v">${objs.length}</span><span class="l">Objetivos</span></div>
            <div><span class="v">${uCount}</span><span class="l">Usuários</span></div>
            <div><span class="v" style="color:var(--accent-dark)">${fmtBRL(est)}</span><span class="l">Economia/mês</span></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

function openEditCompanyModal(companyId) {
  const c = state.companies.find(x => x.id === companyId);
  if(!c) return;

  openModal(`
    <div class="modal-header">
      <h3>Editar Empresa</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      
      <!-- Campo do ID (Somente leitura) -->
      <label>ID da Empresa (Não editável)</label>
      <input value="${c.id}" disabled style="opacity:0.6;background:var(--gray-100);cursor:not-allowed">
      
      <!-- Campo do Nome -->
      <label>Nome da Empresa</label>
      <input id="editCompName" value="${escapeHtml(c.name)}" required>
      
      <!-- Campo de Status -->
      <label style="display:flex;align-items:center;gap:8px;margin-top:24px;cursor:pointer">
        <input type="checkbox" id="editCompActive" ${c.is_active !== false ? 'checked' : ''} style="width:auto;margin:0">
        Empresa Ativa (Exibir nos menus)
      </label>
      <small style="color:var(--gray-500);font-size:11px;display:block;margin-top:4px">Se desmarcado, a empresa some da listagem geral e do seletor no topo.</small>
      
      <div id="editCompError" class="login-error hidden" style="margin-top:14px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitEditCompany(${c.id}, this)">Salvar</button>
    </div>`);
}

async function submitEditCompany(companyId, btn) {
  const name = $('editCompName').value.trim();
  const is_active = $('editCompActive').checked;
  const errDiv = $('editCompError');

  if(!name) { errDiv.textContent = 'O nome é obrigatório.'; errDiv.classList.remove('hidden'); return; }

  btn.textContent = 'Salvando...'; btn.disabled = true; errDiv.classList.add('hidden');

  const { data, error } = await window.db.from('companies').update({
    name: name, 
    is_active: is_active
  }).eq('id', companyId).select().single();

  if(error) { 
    errDiv.textContent = "Erro no banco: " + error.message; 
    errDiv.classList.remove('hidden'); 
    btn.textContent = 'Salvar'; btn.disabled = false; 
    return; 
  }

  if(!data) {
    errDiv.textContent = "A alteração não foi permitida pelo banco (RLS).";
    errDiv.classList.remove('hidden');
    btn.textContent = 'Salvar'; btn.disabled = false;
    return;
  }

  // Atualiza o state local
  const compIndex = state.companies.findIndex(x => x.id === companyId);
  if(compIndex > -1) {
    state.companies[compIndex] = { ...state.companies[compIndex], name, is_active };
  }

  btn.closest('.modal-overlay').remove();
  renderCompanies();
}
