function renderCompanies(){
  const el = $('view-empresas');
  if(!can('seeCompanies')){
    el.innerHTML = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Você não tem permissão para acessar esta área.</div></div>`;
    return;
  }
  el.innerHTML = `
    <div class="page-header">
      <div><h1>Empresas</h1><p>Ambientes multiempresa. Cada empresa tem seu próprio plano de ação.</p></div>
      ${can('manageUsers') ? `<button class="btn btn-primary" onclick="alert('Cadastro de nova empresa — implementar no backend.')">+ Nova empresa</button>` : ''}
    </div>
    <div class="company-grid">
      ${state.companies.map(c => {
        const objs = state.objectives[c.id] || [];
        const uCount = state.users.filter(u => u.companyId === c.id).length;
        const est = objs.reduce((s,o) => s + (+o.monthlySavings||0), 0);
        return `<div class="company-card">
          <h3>${c.name}</h3><p>${c.cnpj}</p>
          <div class="stats">
            <div><span class="v">${objs.length}</span><span class="l">Objetivos</span></div>
            <div><span class="v">${uCount}</span><span class="l">Usuários</span></div>
            <div><span class="v" style="color:var(--accent-dark)">${fmtBRL(est)}</span><span class="l">Economia/mês</span></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}