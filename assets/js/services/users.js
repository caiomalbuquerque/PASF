/* Acesso restrito — apenas admin e global_collaborator (regra de 2026-10-29). */
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
      ${can('manageUsers') ? `<button class="btn btn-primary" onclick="alert('Cadastro de novo usuário — implementar no backend.')">+ Novo responsável</button>` : ''}
    </div>
    <div class="panel"><table class="admin-table">
      <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Empresa</th><th>Gestor</th><th>Tarefas</th></tr></thead>
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
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
}