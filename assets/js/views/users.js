/* assets/js/views/users.js */

function renderUsers(){
  const el = $('view-responsaveis');
  if(!can('seeUsers')){
    el.innerHTML = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Você não tem permissão para acessar esta área.</div></div>`;
    return;
  }

  const scopeAll = can('scope') === 'all';
  const comps = scopeAll ? state.companies : [companyById(state.currentCompany)].filter(Boolean);
  
  // Inicializa filtros se não existirem
  if (!state._userFilters) {
    state._userFilters = { name: '', role: '', company: '', manager: '' };
  }
  const f = state._userFilters;

  el.innerHTML = `
    <div class="page-header">
      <div><h1>Responsáveis</h1>
        <p>Gerencie os acessos ao sistema.${scopeAll ? ' (Visão Global)' : ` (${companyById(state.currentCompany)?.name||''})`}</p></div>
      ${can('manageUsers') ? `<button class="btn btn-primary" onclick="openNewUserModal()">+ Novo responsável</button>` : ''}
    </div>

    <!-- CONTAINER DE FILTROS -->
    <div class="filter-bar" style="background: #fff; padding: 16px; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--gray-200); margin-bottom: 20px;">
      <input type="text" id="uFilterName" placeholder="Buscar nome..." value="${escapeHtml(f.name)}" style="flex: 1; min-width: 150px;">
      
      <select id="uFilterRole" style="min-width: 150px;">
        <option value="">Todos os perfis</option>
        <option value="admin" ${f.role==='admin'?'selected':''}>Administrador</option>
        <option value="global_collaborator" ${f.role==='global_collaborator'?'selected':''}>Global</option>
        <option value="unique_collaborator" ${f.role==='unique_collaborator'?'selected':''}>Gestor</option>
        <option value="unique_leader" ${f.role==='unique_leader'?'selected':''}>Líder</option>
        <option value="unique_user" ${f.role==='unique_user'?'selected':''}>Usuário Padrão</option>
      </select>

      <select id="uFilterCompany" style="min-width: 150px;">
        <option value="">Todas as empresas</option>
        ${comps.map(c => `<option value="${c.id}" ${f.company==c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
      </select>

      <select id="uFilterManager" style="min-width: 150px;">
        <option value="">Todos os gestores</option>
        ${state.users.filter(u => u.role === 'unique_collaborator').map(m => `<option value="${m.id}" ${f.manager==m.id?'selected':''}>${escapeHtml(m.name)}</option>`).join('')}
      </select>
    </div>

    <div id="users-table-container"></div>
  `;

  // Listeners dos filtros
  $('uFilterName').addEventListener('input', e => { f.name = e.target.value; renderUsersTable(); });
  $('uFilterRole').addEventListener('change', e => { f.role = e.target.value; renderUsersTable(); });
  $('uFilterCompany').addEventListener('change', e => { f.company = e.target.value; renderUsersTable(); });
  $('uFilterManager').addEventListener('change', e => { f.manager = e.target.value; renderUsersTable(); });

  renderUsersTable();
}

function renderUsersTable() {
  const container = $('users-table-container');
  if(!container) return;

  const scopeAll = can('scope') === 'all';
  const f = state._userFilters;
  
  let list = scopeAll ? state.users : state.users.filter(u => u.companyId === state.currentCompany || u.role === 'global_collaborator');
  list = list.filter(u => u.role !== 'admin');

  if (f.name) list = list.filter(u => u.name.toLowerCase().includes(f.name.toLowerCase()) || u.email.toLowerCase().includes(f.name.toLowerCase()));
  if (f.role) list = list.filter(u => u.role === f.role);
  if (f.company) list = list.filter(u => String(u.companyId) === String(f.company));
  if (f.manager) list = list.filter(u => String(u.gestorId) === String(f.manager));

  if (list.length === 0) {
    container.innerHTML = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Nenhum usuário encontrado com os filtros atuais.
    </div></div>`;
    return;
  }

  container.innerHTML = `
    <div class="panel"><table class="admin-table">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Empresa</th><th>Gestor</th><th>Tarefas</th><th>Ações</th></tr></thead>
      <tbody>
        ${list.map(u => {
          const comp = u.companyId ? companyById(u.companyId)?.name : '<span style="color:var(--primary);font-weight:600">Global</span>';
          const gestor = u.gestorId ? userById(u.gestorId)?.name : '—';
          const count = allTasksFlat().filter(t => t.responsibleId === u.id).length;
          const color = ROLE_COLORS[u.role] || '#999';
          const isSuspended = u.is_active === false;
          
          return `<tr style="${isSuspended ? 'opacity: 0.5; background: #f9fafb;' : ''}">
            <td><div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="width:28px;height:28px;font-size:10px;background:${isSuspended ? '#9ca3af' : color}">${initials(u.name)}</div>
              <strong>${escapeHtml(u.name)} ${isSuspended ? '<span style="color:var(--danger);font-size:10px;margin-left:6px;border:1px solid var(--danger);padding:1px 4px;border-radius:4px;">SUSPENSO</span>' : ''}</strong>
            </div></td>
            <td>${u.email}</td>
            <td><span class="tag" style="background:${isSuspended ? '#9ca3af' : color}22;color:${isSuspended ? '#9ca3af' : color}">${ROLE_LABELS[u.role] || u.role}</span></td>
            <td>${comp}</td>
            <td>${gestor}</td>
            <td>${count}</td>
            <td style="display:flex; gap:4px;">
              ${can('manageUsers') ? `
                <button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="openEditUserModal('${u.id}')" title="Editar">✎</button>
                <button class="btn btn-sm btn-ghost" style="padding:4px 8px" onclick="resetUserPassword('${u.email}')" title="Redefinir Senha">🔑</button>
                
                <!-- BOTÃO DE SUSPENDER / ATIVAR -->
                <button class="btn btn-sm btn-ghost" style="padding:4px 8px; color:${isSuspended ? 'var(--accent-dark)' : 'var(--warning)'};" onclick="toggleUserStatus('${u.id}', ${u.is_active !== false})" title="${isSuspended ? 'Reativar Acesso' : 'Suspender Acesso'}">
                  ${isSuspended ? '▶' : '⏸'}
                </button>

                <!-- BOTÃO DE EXCLUIR -->
                <button class="btn btn-sm btn-ghost" style="padding:4px 8px; color:var(--danger);" onclick="deleteUserPermanently('${u.id}', '${escapeHtml(u.name)}')" title="Excluir Permanentemente">✕</button>
              ` : '—'}
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  `;
}

// --- NOVAS FUNÇÕES ---

async function toggleUserStatus(userId, currentStatus) {
  const newStatus = !currentStatus;
  const actionText = newStatus ? 'reativar' : 'suspender';
  
  if(!confirm(`Deseja realmente ${actionText} o acesso deste usuário?`)) return;

  const { error } = await window.db.from('profiles').update({ is_active: newStatus }).eq('id', userId);
  
  if (error) {
    showToast("Erro ao alterar status: " + error.message, "error");
    return;
  }

  showToast(`Usuário ${newStatus ? 'reativado' : 'suspenso'} com sucesso!`, "success");
  
  // Atualiza o state local
  const u = state.users.find(x => x.id === userId);
  if (u) u.is_active = newStatus;
  
  renderUsersTable();
}

async function deleteUserPermanently(userId, userName) {
  if(!confirm(`⚠️ ATENÇÃO: Deseja excluir o usuário "${userName}" PERMANENTEMENTE?\n\nEssa ação não pode ser desfeita. As tarefas atribuídas a ele ficarão como "Não Atribuído".`)) return;

  // Chama a função RPC (Remote Procedure Call) que criamos no Supabase
  const { error } = await window.db.rpc('delete_user', { target_user_id: userId });
  
  if (error) {
    showToast("Erro ao excluir usuário: " + error.message, "error");
    return;
  }

  showToast("Usuário excluído permanentemente!", "success");
  
  // Remove do state local
  state.users = state.users.filter(u => u.id !== userId);
  
  renderUsersTable();
}

// --- RESETAR SENHA ---
async function resetUserPassword(email) {
  if(!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;
  
  const { error } = await window.db.auth.resetPasswordForEmail(email);
  if (error) {
    showToast("Erro ao enviar e-mail: " + error.message, "error");
  } else {
    showToast("E-mail de redefinição enviado!", "success");
  }
}

// --- LÓGICA DE GESTOR IMEDIATO ---
function updateManagerOptions(prefix, companyId, selectedManagerId = '', userId = null) {
  const sel = $(`${prefix}Manager`);
  if(!sel) return;
  
  sel.innerHTML = '<option value="">Nenhum (Topo da Hierarquia)</option>';
  if (!companyId) return; 

  const managers = state.users.filter(u =>
    u.role === 'unique_collaborator' &&
    String(u.companyId) === String(companyId) &&
    (u.id !== userId)
  );

  managers.forEach(m => {
    const isSelected = String(m.id) === String(selectedManagerId) ? 'selected' : '';
    sel.innerHTML += `<option value="${m.id}" ${isSelected}>${escapeHtml(m.name)}</option>`;
  });
}

function toggleCompanyField(role, prefix = 'newUser') {
  const isGlobal = role.startsWith('global_') || role === 'admin';
  const lbl = $(`lblCompany_${prefix}`);
  const sel = $(`${prefix}Company`);
  
  if(isGlobal){
    lbl.style.opacity = '0.5'; sel.style.opacity = '0.5'; sel.disabled = true; sel.value = '';
    updateManagerOptions(prefix, null);
  } else {
    lbl.style.opacity = '1'; sel.style.opacity = '1'; sel.disabled = false;
    updateManagerOptions(prefix, sel.value);
  }
}

/* ---- Criar Usuário ---- */
function openNewUserModal(){
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
        <option value="unique_user">Usuário Padrão</option>
        <option value="unique_leader">Líder</option>
        <option value="unique_collaborator">Gestor</option>
        <option value="global_collaborator">Global</option>
        <option value="admin">Administrador</option>
      </select>

      <label id="lblCompany_newUser">Empresa Vinculada</label>
      <select id="newUserCompany" onchange="updateManagerOptions('newUser', this.value)">
        ${state.companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>

      <label>Gestor Imediato</label>
      <select id="newUserManager">
        <option value="">Nenhum (Topo da Hierarquia)</option>
      </select>
      <div id="newUserError" class="login-error hidden" style="margin-top:14px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btnCreateUser" onclick="submitNewUser(this)">Criar</button>
    </div>`);
    
  setTimeout(() => {
    const firstCompany = $('newUserCompany').value;
    updateManagerOptions('newUser', firstCompany);
  }, 50);
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

  const tempSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data, error } = await tempSupabase.auth.signUp({
    email, password: pass,
    options: { data: { name, role, company_id, manager_id } }
  });

  if (error) { 
    errDiv.textContent = error.message; 
    errDiv.classList.remove('hidden'); btn.textContent = 'Criar'; btn.disabled = false; return; 
  }

  btn.closest('.modal-overlay').remove();
  showToast(`Usuário ${name} criado!`, "success");
  await refreshUsersList();
}

/* ---- Editar Usuário ---- */
function openEditUserModal(userId) {
  const u = state.users.find(x => x.id === userId);
  if (!u) return;

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
        <option value="unique_user" ${u.role==='unique_user'?'selected':''}>Usuário Padrão</option>
        <option value="unique_leader" ${u.role==='unique_leader'?'selected':''}>Líder</option>
        <option value="unique_collaborator" ${u.role==='unique_collaborator'?'selected':''}>Gestor</option>
        <option value="global_collaborator" ${u.role==='global_collaborator'?'selected':''}>Global</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>Administrador</option>
      </select>

      <label id="lblCompany_editUser">Empresa Vinculada</label>
      <select id="editUserCompany" ${(!u.companyId)?'disabled':''} onchange="updateManagerOptions('editUser', this.value, '${u.gestorId || ''}', '${u.id}')">
        ${state.companies.map(c => `<option value="${c.id}" ${u.companyId==c.id?'selected':''}>${c.name}</option>`).join('')}
      </select>

      <label>Gestor Imediato</label>
      <select id="editUserManager">
        <option value="">Nenhum (Topo da Hierarquia)</option>
      </select>
      <div id="editUserError" class="login-error hidden" style="margin-top:14px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" id="btnEditUser" onclick="submitEditUser('${u.id}', this)">Salvar Alterações</button>
    </div>`);

  toggleCompanyField(u.role, 'editUser');
  updateManagerOptions('editUser', u.companyId, u.gestorId, u.id);
}

async function submitEditUser(userId, btn) {
  const name = $('editUserName').value.trim();
  const role = $('editUserRole').value;
  const company_id = $('editUserCompany').disabled ? null : $('editUserCompany').value;
  const manager_id = $('editUserManager').value || null;
  const errDiv = $('editUserError');

  if(!name) { errDiv.textContent = 'O nome é obrigatório.'; errDiv.classList.remove('hidden'); return; }

  btn.textContent = 'Salvando...'; btn.disabled = true; errDiv.classList.add('hidden');

  const { data, error } = await window.db.from('profiles').update({
    name: name, role: role, company_id: company_id ? Number(company_id) : null, manager_id: manager_id
  }).eq('id', userId).select().single();

  if (error || !data) { 
    errDiv.textContent = "Erro no banco: " + (error ? error.message : 'Bloqueado'); 
    errDiv.classList.remove('hidden'); btn.textContent = 'Salvar'; btn.disabled = false; return; 
  }

  btn.closest('.modal-overlay').remove();
  showToast('Usuário atualizado com sucesso!', "success");
  await refreshUsersList();
}

async function refreshUsersList(){
  const { data: profiles } = await window.db.from('profiles').select('*');
  state.users = (profiles || []).map(p => ({ ...p, companyId: p.company_id, gestorId: p.manager_id }));
  
  // Atualiza a tabela
  if ($('users-table-container')) {
    renderUsersTable();
  } else {
    renderUsers();
  }
}
