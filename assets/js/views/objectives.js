function renderObjectives(){
  const el = $('view-objetivos');
  const isGlobal = can('scope') === 'all';
  const comps = isGlobal ? accessibleCompanies() : [companyById(state.currentCompany)].filter(Boolean);

  let header = `
    <div class="page-header">
      <div>
        <h1>Objetivos do plano de ação</h1>
        <p>${isGlobal
          ? 'Visão consolidada de todas as empresas.'
          : 'Cada linha representa um objetivo. Clique para expandir e gerenciar as tarefas (5W2H).'}</p>
      </div>
      ${can('createObj') ? `<button class="btn btn-primary" onclick="openNewObjectiveModal()">+ Novo objetivo</button>` : ''}
    </div>
    <div class="filter-bar">
      <input type="text" id="searchObj" placeholder="Buscar objetivo..." value="${escapeHtml(state._objSearch||'')}">
      <select id="filterStatus">
        <option value="">Todos os status</option>
        ${ALL_STATUS.map(s => `<option ${state._objStatus===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>`;

  const search = (state._objSearch||'').toLowerCase();
  const fStatus = state._objStatus || '';

  let body = '';
  comps.forEach(comp => {
    let objs = state.objectives[comp.id] || [];
    if(search) objs = objs.filter(o => o.title.toLowerCase().includes(search));
    if(fStatus) objs = objs.filter(o => o.tasks.some(t => effectiveStatus(t) === fStatus));

    if(isGlobal){
      if(objs.length === 0 && (search || fStatus)) return;
      body += `<div class="company-group"><h2>${comp.name}</h2>`;
    }
    if(objs.length === 0){
      body += `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
        ${can('createObj') ? 'Nenhum objetivo. Clique em <strong>+ Novo objetivo</strong>.' : 'Nenhum objetivo cadastrado.'}
      </div></div>`;
    } else {
      body += objs.map((o, idx) => objectiveHTML(o, idx, comp.id)).join('');
    }
    if(isGlobal) body += `</div>`;
  });

  el.innerHTML = header + body;
  $('searchObj')?.addEventListener('input', e => { state._objSearch = e.target.value; renderObjectives(); });
  $('filterStatus')?.addEventListener('change', e => { state._objStatus = e.target.value; renderObjectives(); });
}

function objectiveHTML(o, idx, compId){
  const allTasks = o.tasks;
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  const totalResult = allTasks.reduce((s,t) => s + (+t.result||0), 0);
  const net = totalResult - totalCost;
  const canEditObj = can('editObj');
  const canAddTask = can('addTask');

  return `
  <div class="objective-card" id="obj-${o.id}" data-id="${o.id}">
    <div class="objective-header" onclick="toggleObjective('${o.id}')">
      <span class="chevron">▶</span>
      <span class="objective-num">${String(idx+1).padStart(2,'0')}</span>
      <div class="objective-title">
        <h3>${escapeHtml(o.title)}</h3>
        <div class="meta">
          <span>${allTasks.length} tarefa${allTasks.length!==1?'s':''}</span>
          <span>${done} concluída${done!==1?'s':''}</span>
          ${late ? `<span style="color:#991b1b;font-weight:600">${late} em atraso</span>` : ''}
        </div>
      </div>
      <div class="objective-savings">
        <div class="label">Economia estimada</div>
        <div class="value">${fmtBRL(o.monthlySavings)}/mês</div>
      </div>
    </div>
    <div class="objective-body">
      <div class="savings-edit">
        <label>Estimativa de economia mensal</label>
        <div class="input-wrap">
          <span>R$</span>
          <input type="number" step="0.01" min="0" value="${o.monthlySavings}" ${canEditObj?'':'disabled'}
                 onchange="updateSavings('${compId}','${o.id}', this.value)">
        </div>
        ${canEditObj ? `<button class="btn btn-sm btn-danger" style="margin-left:auto" onclick="deleteObjective('${compId}','${o.id}')">🗑 Remover objetivo</button>` : ''}
      </div>
      <div class="tasks-header">
        <h4>Como? <span class="count">${allTasks.length}</span></h4>
        ${canAddTask ? `<button class="btn btn-sm btn-ghost" onclick="addTask('${compId}','${o.id}')">+ Adicionar tarefa</button>` : ''}
      </div>
      <div>${allTasks.map(t => taskHTML(t, compId, o.id)).join('') || '<p style="color:var(--gray-500);font-size:12px;padding:8px 0">Nenhuma tarefa cadastrada.</p>'}</div>
      <div class="objective-totals">
        <div class="t"><span class="label">Custo total</span><span class="value">${fmtBRL(totalCost)}</span></div>
        <div class="t"><span class="label">Resultado atingido</span><span class="value pos">${fmtBRL(totalResult)}</span></div>
        <div class="t"><span class="label">Saldo</span><span class="value ${net>=0?'pos':'neg'}">${fmtBRL(net)}</span></div>
      </div>
    </div>
  </div>`;
}

function toggleObjective(id){ $(`obj-${id}`)?.classList.toggle('open'); }

function openNewObjectiveModal(){
  if(!can('createObj')) return;
  openModal(`
    <div class="modal-header">
      <h3>Novo objetivo</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <label>O quê? (título do objetivo)</label>
      <input id="newObjTitle" placeholder="Ex.: Reduzir custos com telefonia">
      <label>Estimativa de economia mensal (R$)</label>
      <input id="newObjSavings" type="number" step="0.01" min="0" placeholder="0,00">
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitNewObjective(this)">Criar</button>
    </div>`);
  $('newObjTitle').focus();
}

function submitNewObjective(btn){
  const overlay = btn.closest('.modal-overlay');
  const title = overlay.querySelector('#newObjTitle').value.trim();
  const savings = +overlay.querySelector('#newObjSavings').value || 0;
  if(!title){ alert('Informe o título.'); return; }
  overlay.remove();
  createObjective(title, savings);
}