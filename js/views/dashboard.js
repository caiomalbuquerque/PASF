function renderDashboard(){
  const el = $('view-dashboard');
  const isGlobal = can('scope') === 'all';
  const comps = isGlobal ? accessibleCompanies() : [companyById(state.currentCompany)].filter(Boolean);

  const objsAll = comps.flatMap(c => state.objectives[c.id] || []);
  const tasks = objsAll.flatMap(o => o.tasks);
  const totalEst = objsAll.reduce((s,o) => s + (+o.monthlySavings||0), 0);
  const totalResult = tasks.reduce((s,t) => s + (+t.result||0), 0);
  const totalCost = tasks.reduce((s,t) => s + (+t.cost||0), 0);
  const done = tasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = tasks.filter(t => effectiveStatus(t) === 'Atrasada').length;

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>${isGlobal ? 'Visão consolidada das empresas acessíveis' : 'Panorama da empresa'}</p>
      </div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card accent"><div class="label">Economia estimada</div>
        <div class="value">${fmtBRL(totalEst)}</div><div class="sub">por mês</div></div>
      <div class="kpi-card info"><div class="label">Resultado atingido</div>
        <div class="value">${fmtBRL(totalResult)}</div><div class="sub">soma das tarefas</div></div>
      <div class="kpi-card warning"><div class="label">Custos envolvidos</div>
        <div class="value">${fmtBRL(totalCost)}</div><div class="sub">soma das tarefas</div></div>
      <div class="kpi-card ${late?'danger':''}"><div class="label">Tarefas concluídas</div>
        <div class="value">${done}/${tasks.length}</div>
        <div class="sub">${late} em atraso</div></div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Economia estimada por objetivo</h3>
        <span style="font-size:12px;color:var(--gray-500)">Mensal</span></div>
      <div class="panel-body">${dashboardBars(comps)}</div>
    </div>`;
}

function dashboardBars(comps){
  const items = [];
  comps.forEach(c => (state.objectives[c.id]||[]).forEach(o => items.push({ ...o, _comp: c.name })));
  if(!items.length) return '<p style="color:var(--gray-500)">Nenhum objetivo cadastrado.</p>';
  const max = Math.max(1, ...items.map(o => +o.monthlySavings||0));
  return items.map(o => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(o.title)} — ${escapeHtml(o._comp)}">${escapeHtml(o.title)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${((+o.monthlySavings||0)/max*100).toFixed(1)}%"></div></div>
      <div class="bar-value">${fmtBRL(o.monthlySavings)}</div>
    </div>`).join('');
}