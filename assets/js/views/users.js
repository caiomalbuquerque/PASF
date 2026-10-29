/* Acesso restrito — apenas admin e global_collaborator */
function renderUsers(){
  const el = $('view-responsaveis');
  if(!can('seeUsers')){
    el.innerHTML = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Você não tem permissão para acessar esta área.</div></div>`;
    return;
  }
  const scopeAll = can('scope') === 'all';
  const list = scopeAll ? state.users : state.users.filter(u => u.companyId === state.currentCompany);

  el.innerHTML = `
    <div class="page-header">
      <div><h1>Responsáveis</h1>
        <p>Pessoas que podem receber tarefas${scopeAll?' (todas as empresas)':` (${companyById(state.currentCompany)?.name||''})`}.</p></div>
      ${can('manageUsers') ? `<button class="btn btn-primary" onclick="openNewUserModal()">+ Novo responsável</button>` : ''}
    </div>
    <div class="panel"><table class="admin-table">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Empresa</th><th>Gestor</th><th>Tarefas</th><th>Ações</th></tr></thead>
      <tbody>
        ${list.map(u => {
          const comp = u.companyId ? companyById(u.companyId)?.name : 'Todas';
          const gestor = u.gestorId ? userById(u.gestorId)?.name : '—';
          const count = allTasksFlat().filter(t => t.responsibleId === u.id).length;
          return `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="width:28px;height:28px;font-size:10px;background:${ROLE_COLORS[u.role]}">${initials(u.name)}</div>
              <strong>${u.name}</strong></div></td>
            <td>${u.email}</td>
            <td><span class="tag" style="background:${ROLE_COLORS[u.role]}22;color:${ROLE_COLORS[u.role]}">${ROLE_LABELS[u.role]}</span></td>
            <td>${comp}</td>
            <td>${gestor}</td>
            <td>${count}</td>
            <td>
              ${can('manageUsers') ? `<button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="openEditUserModal('${u.id}')" title="Editar">✎</button>` : '—'}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}

function toggleCompanyField(role, prefix = 'newUser') {
  const isGlobal = role.startsWith('global_') || role === 'admin';
  const lbl = $(`lblCompany_${prefix}`);
  const sel = $(`${prefix}Company`);
  if(isGlobal){
    lbl.style.opacity = '0.5'; sel.style.opacity = '0.5'; sel.disabled = true; sel.value = '';
  } else {
    lbl.style.opacity = '1'; sel.style.opacity = '1'; sel.disabled = false;
  }
}

/* ---- Criar Usuário ---- */
function openNewUserModal(){
  const managers = state.users.filter(u => ['admin', 'global_collaborator', 'unique_collaborator'].includes(u.role));
  
  openModal(`
    <div class="modal-header">
      <h3>Novo Responsável</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <label>Nome Completo</label>
      <input id="newUserName" placeholder="Ex: João da Silva" required>
      <label>E-mail Corporativo</label>
      <input id="newUserEmail" type="email" placeholder="joao@fghsaude.org.br" required>
      <label>Senha Provisória</label>
      <input id="newUserPass" type="text" value="PASF@2026" required>
      <small style="color:var(--gray-500);font-size:11px;display:block;margin-top:4px">O usuário poderá alterar depois.</small>

      <label>Perfil de Acesso</label>
      <select id="newUserRole" onchange="toggleCompanyField(this.value, 'newUser')">
        <option value="unique_user">Usuário (Empresa)</option>
        <option value="unique_collaborator">Gestor (Empresa)</option>
        <option value="unique_viewer">Viewer (Empresa)</option>
        <option value="global_collaborator">Colaborador Global</option>
        <option value="global_viewer">Viewer Global</option>
        <option value="admin">Administrador</option>
      </select>

      <label id="lblCompany_newUser">Empresa Vinculada</label>
      <select id="newUserCompany">
        ${state.companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>

      <label>Gestor Imediato</label>
      <select id="newUserManager">
        <option value="">Nenhum (Topo da Hierarquia)</option>
        ${managers.map(m => `<option value="${m.id}">${m.name} (${ROLE_LABELS[m.role]})</option>`).join('')}
      </select>
      <div id="newUserError" class="login-error hidden" style="margin-top:14px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btnCreateUser" onclick="submitNewUser(this)">Criar</button>
    </div>`);
}

async function submitNewUser(btn){
  const name = $('newUserName').value.trim();
  const email = $('newUserEmail').value.trim().toLowerCase();
  const pass = $('newUserPass').value;
  const role = $('newUserRole').value;
  const company_id = $('newUserCompany').disabled ? null : $('newUserCompany').value;
  const manager_id = $('newUserManager').value || null;
  const errDiv = $('newUserError');

  if(!name || !email || !pass) { errDiv.textContent = 'Preencha nome, e-mail e senha.'; errDiv.classList.remove('hidden'); return; }

  btn.textContent = 'Criando...'; btn.disabled = true; errDiv.classList.add('hidden');

  const tempSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await tempSupabase.auth.signUp({
    email, password: pass,
    options: { data: { name, role, company_id, manager_id } }
  });

  if (error) { errDiv.textContent = error.message; errDiv.classList.remove('hidden'); btn.textContent = 'Criar'; btn.disabled = false; return; }

  btn.closest('.modal-overlay').remove();
  alert(`Usuário ${name} criado!\nSenha provisória: ${pass}`);
  await refreshUsersList();
}

/* ---- Editar Usuário ---- */
function openEditUserModal(userId) {
  const u = state.users.find(x => x.id === userId);
  if (!u) return;
  const managers = state.users.filter(m => ['admin', 'global_collaborator', 'unique_collaborator'].includes(m.role) && m.id !== u.id);

  openModal(`
    <div class="modal-header">
      <h3>Editar Responsável</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <label>Nome Completo</label>
      <input id="editUserName" value="${escapeHtml(u.name)}" required>
      <label>E-mail (Não editável)</label>
      <input value="${u.email}" disabled style="opacity:0.6">
      
      <label>Perfil de Acesso</label>
      <select id="editUserRole" onchange="toggleCompanyField(this.value, 'editUser')">
        <option value="unique_user" ${u.role==='unique_user'?'selected':''}>Usuário (Empresa)</option>
        <option value="unique_collaborator" ${u.role==='unique_collaborator'?'selected':''}>Gestor (Empresa)</option>
        <option value="unique_viewer" ${u.role==='unique_viewer'?'selected':''}>Viewer (Empresa)</option>
        <option value="global_collaborator" ${u.role==='global_collaborator'?'selected':''}>Colaborador Global</option>
        <option value="global_viewer" ${u.role==='global_viewer'?'selected':''}>Viewer Global</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>Administrador</option>
      </select>

      <label id="lblCompany_editUser">Empresa Vinculada</label>
      <select id="editUserCompany" ${(!u.companyId)?'disabled':''}>
        ${state.companies.map(c => `<option value="${c.id}" ${u.companyId==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>

      <label>Gestor Imediato</label>
      <select id="editUserManager">
        <option value="">Nenhum (Topo da Hierarquia)</option>
        ${managers.map(m => `<option value="${m.id}" ${u.gestorId===m.id?'selected':''}>${m.name} (${ROLE_LABELS[m.role]})</option>`).join('')}
      </select>
      <div id="editUserError" class="login-error hidden" style="margin-top:14px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btnEditUser" onclick="submitEditUser('${u.id}', this)">Salvar Alterações</button>
    </div>`);
    
  // Trigger o visual do select de empresa correto
  toggleCompanyField(u.role, 'editUser');
}

async function submitEditUser(userId, btn) {
  const name = $('editUserName').value.trim();
  const role = $('editUserRole').value;
  const company_id = $('editUserCompany').disabled ? null : $('editUserCompany').value;
  const manager_id = $('editUserManager').value || null;
  const errDiv = $('editUserError');

  if(!name) { errDiv.textContent = 'O nome é obrigatório.'; errDiv.classList.remove('hidden'); return; }

  btn.textContent = 'Salvando...'; btn.disabled = true; errDiv.classList.add('hidden');

  const { error } = await window.db.from('profiles').update({
    name, role, company_id, manager_id
  }).eq('id', userId);

  if (error) { errDiv.textContent = error.message; errDiv.classList.remove('hidden'); btn.textContent = 'Salvar'; btn.disabled = false; return; }

  btn.closest('.modal-overlay').remove();
  alert('Usuário atualizado com sucesso!');
  await refreshUsersList();
}

async function refreshUsersList(){
  const { data: profiles } = await window.db.from('profiles').select('*');
  state.users = (profiles || []).map(p => ({
    ...p, companyId: p.company_id, gestorId: p.manager_id
  }));
  renderUsers();
}
