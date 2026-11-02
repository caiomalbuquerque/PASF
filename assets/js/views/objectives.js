/* assets/js/views/objectives.js */

function renderObjectives(){
  const el = $('view-objetivos');
  
  // Se tem um objetivo selecionado, renderiza a tela de detalhes
  if (state.currentObjective) {
    renderObjectiveDetail(state.currentObjective, el);
    return;
  }

  // Se não, renderiza a lista de objetivos
  const isGlobal = can('scope') === 'all';
  if (!el.querySelector('#obj-header-container')) {
    let headerHTML = `
      <div id="obj-header-container">
        <div class="page-header">
          <div>
            <h1>Objetivos do plano de ação</h1>
            <p>${isGlobal ? 'Visão consolidada de todas as empresas. Clique em um objetivo para gerenciar as tarefas.' : 'Clique em um objetivo para ver e gerenciar suas tarefas (5W2H).'}</p>
          </div>
          ${can('createObj') ? `<button class="btn btn-primary" onclick="openNewObjectiveModal()">+ Novo objetivo</button>` : ''}
        </div>
        <div class="filter-bar">
          <input type="text" id="searchObj" placeholder="Buscar objetivo..." value="${escapeHtml(state._objSearch||'')}">
          <select id="filterStatus">
            <option value="">Todos os status</option>
            ${ALL_STATUS.map(s => `<option ${state._objStatus===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="obj-list-container"></div>
    `;
    el.innerHTML = headerHTML;

    let _searchDebounce;
    $('searchObj')?.addEventListener('input', e => {
      state._objSearch = e.target.value;
      clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(() => renderObjectivesListOnly(), 200);
    });
    $('filterStatus')?.addEventListener('change', e => {
      state._objStatus = e.target.value;
      renderObjectivesListOnly();
    });
  } else {
    const searchInput = $('searchObj');
    if(searchInput && searchInput.value !== (state._objSearch || '')){ searchInput.value = state._objSearch || ''; }
  }

  renderObjectivesListOnly();
}

function openObjectiveDetail(objId) {
  state.currentObjective = objId;
  renderObjectives();
}

function closeObjectiveDetail() {
  state.currentObjective = null;
  renderObjectives();
}

function renderObjectivesListOnly(){
  const elList = $('obj-list-container');
  if(!elList) return;

  const isGlobal = can('scope') === 'all';
  const comps = isGlobal ? accessibleCompanies() : [companyById(state.currentCompany)].filter(Boolean);
  const search = (state._objSearch||'').toLowerCase();
  const fStatus = state._objStatus || '';

  let body = '';
  comps.forEach(comp => {
    let objs = [...(state.objectives[comp.id] || [])];
    objs.sort((a, b) => (a.created_at && b.created_at) ? new Date(a.created_at) - new Date(b.created_at) : String(a.id).localeCompare(String(b.id)));
    
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
      body += objs.map((o, idx) => objectiveSummaryHTML(o, idx, comp.id)).join('');
    }
    if(isGlobal) body += `</div>`;
  });

  elList.innerHTML = body;
}

// O CARTÃO DA LISTA (Sem as tarefas dentro)
function objectiveSummaryHTML(o, idx, compId){
  const allTasks = o.tasks;
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const estMensal = +o.monthlySavings || 0;
  const resultadoEntregue = allTasks.filter(t => effectiveStatus(t) === 'Concluída').reduce((s,t) => s + (+t.result||0), 0);
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  const saldo = resultadoEntregue - totalCost;
  const pctRealizado = estMensal > 0 ? (resultadoEntregue / estMensal) * 100 : 0;
  const pctPendente = estMensal > 0 ? Math.max(0, 100 - pctRealizado) : 0;

  return `
  <div class="objective-card" style="margin-bottom: 16px; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;" 
       onclick="openObjectiveDetail('${o.id}')"
       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)'"
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow)'">
    
    <div class="objective-header" style="align-items: flex-start; padding: 20px; border-bottom: none;">
      
      <div style="display:flex; gap:14px; flex: 1; min-width: 250px;">
        <span class="objective-num" style="margin-top: 2px;">${String(idx+1).padStart(2,'0')}</span>
        <div style="flex:1;">
          <h3 style="font-size:16px; line-height:1.3; margin:0;">${escapeHtml(o.title)}</h3>
          <div class="meta" style="margin-top: 8px; display:flex; gap:8px;">
            <span id="meta-done-${o.id}" style="font-weight:600; color:var(--gray-500)">${done}/${allTasks.length} tarefas concluídas</span>
            ${late ? `<span class="tag" style="background:var(--status-late-bg); color:var(--status-late-text); font-weight:700;">${late} em atraso</span>` : ''}
          </div>
        </div>
      </div>

      <div style="display:flex; gap:24px; flex-wrap:wrap; margin-top: 2px; text-align:center; justify-content:flex-end;">
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Estimativa Mensal</span>
          <span style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${fmtBRL(estMensal)}</span>
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Entregue</span>
          <span id="metric-entregue-${o.id}" style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${resultadoEntregue > 0 ? fmtBRL(resultadoEntregue) : '—'}</span>
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Custos Envolvidos</span>
          <span id="metric-cost-${o.id}" style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${totalCost > 0 ? fmtBRL(totalCost) : '—'}</span>
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Saldo</span>
          <span id="metric-saldo-${o.id}" style="font-size:14px; font-weight:800; color:${saldo >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; margin-top:4px">${saldo !== 0 ? fmtBRL(saldo) : '—'}</span>
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Realizado</span>
          <span id="metric-pct-${o.id}" style="font-size:14px; font-weight:800; color:var(--primary); margin-top:4px">${pctRealizado.toFixed(1)}%</span>
        </div>
        <div style="display:flex; flex-direction:column;">
          <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Pendente</span>
          <span id="metric-pend-${o.id}" style="font-size:14px; font-weight:800; color:${pctPendente > 0 ? 'var(--warning)' : 'var(--gray-800)'}; margin-top:4px">${pctPendente.toFixed(1)}%</span>
        </div>
      </div>
      
      <div style="margin-left: 20px; color: var(--primary); font-size: 20px; font-weight: bold; align-self: center;">
        &rarr;
      </div>
    </div>
  </div>`;
}

// A TELA DE DETALHES DO OBJETIVO (COM CABEÇALHO FIXO)
function renderObjectiveDetail(objId, el) {
  let compId = null;
  let o = null;
  for (const cid in state.objectives) {
    const found = state.objectives[cid].find(x => String(x.id) === String(objId));
    if (found) { compId = cid; o = found; break; }
  }
  if (!o) { closeObjectiveDetail(); return; }

  const allTasks = o.tasks;
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const estMensal = +o.monthlySavings || 0;
  const resultadoEntregue = allTasks.filter(t => effectiveStatus(t) === 'Concluída').reduce((s,t) => s + (+t.result||0), 0);
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  const saldo = resultadoEntregue - totalCost;
  const pctRealizado = estMensal > 0 ? (resultadoEntregue / estMensal) * 100 : 0;
  const pctPendente = estMensal > 0 ? Math.max(0, 100 - pctRealizado) : 0;

  const canEditObj = can('editObj');
  const canAddTask = can('addTask');
  const isEditing = state._editingObjectives && state._editingObjectives.includes(String(o.id));
  const filteredTasks = state._objStatus ? allTasks.filter(t => effectiveStatus(t) === state._objStatus) : allTasks;
  const taskCountText = filteredTasks.length !== allTasks.length ? `${filteredTasks.length} de ${allTasks.length}` : `${allTasks.length}`;

  el.innerHTML = `
    <!-- CONTAINER FIXO (STICKY) -->
    <div style="position: sticky; top: 59px; z-index: 20; background: var(--gray-100); margin-top: -24px; padding-top: 24px;">
      
      <!-- Botão Voltar -->
      <div style="margin-bottom: 12px;">
        <button class="btn btn-ghost" onclick="closeObjectiveDetail()" style="padding: 6px 12px; font-size: 13px; background: #fff; border: 1px solid var(--gray-300); box-shadow: var(--shadow-sm);">
          &larr; Voltar para Objetivos
        </button>
      </div>

      <!-- Cabeçalho do Objetivo -->
      <div class="objective-card" style="box-shadow: var(--shadow-md); border: 1px solid var(--gray-200); margin: 0; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0;">
        <div class="objective-header" style="align-items: flex-start; padding: 20px; background: #fff; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg);">
          <div style="display:flex; gap:14px; flex: 1; min-width: 250px; flex-wrap: wrap;">
            <div style="flex:1; min-width: 200px;">
              ${isEditing ? `
                <div style="display:flex; flex-direction: column; width: 100%;">
                  <input type="text" id="edit-obj-title-${o.id}" value="${escapeHtml(o.title)}" 
                         class="task-title-input"
                         onkeypress="if(event.key === 'Enter') saveObjectiveTitle('${compId}','${o.id}')"
                         onblur="setTimeout(() => saveObjectiveTitle('${compId}','${o.id}'), 150)"
                         onkeydown="if(event.key === 'Escape') cancelEditObjective('${o.id}', '${compId}')">
                </div>
              ` : `
                <h3 style="font-size:20px; line-height:1.3; margin:0; word-break: break-word; ${canEditObj ? 'cursor:text; transition: color 0.2s;' : ''}" 
                    onclick="${canEditObj ? `startEditObjective('${o.id}', '${compId}')` : ''}"
                    onmouseover="${canEditObj ? 'this.style.color=\'var(--primary)\'' : ''}" 
                    onmouseout="${canEditObj ? 'this.style.color=\'\'' : ''}">
                  ${escapeHtml(o.title)}
                </h3>
              `}
              <div class="meta" style="margin-top: 8px; display:flex; gap:12px;">
                <span id="meta-done-${o.id}" style="font-weight:600; color:var(--gray-500); font-size: 13px;">${done}/${allTasks.length} tarefas concluídas</span>
                <span id="meta-late-${o.id}" class="tag" style="background:var(--status-late-bg); color:var(--status-late-text); font-weight:700; ${late === 0 ? 'display:none' : ''}">${late} em atraso</span>
              </div>
            </div>
          </div>

          <div style="display:flex; gap:20px; flex-wrap:wrap; margin-top: 10px; text-align:center; justify-content:flex-end;">
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Estimativa Mensal</span>
              <span style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${fmtBRL(estMensal)}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Entregue</span>
              <span id="metric-entregue-${o.id}" style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${resultadoEntregue > 0 ? fmtBRL(resultadoEntregue) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Custos Envolvidos</span>
              <span id="metric-cost-${o.id}" style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${totalCost > 0 ? fmtBRL(totalCost) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Saldo</span>
              <span id="metric-saldo-${o.id}" style="font-size:14px; font-weight:800; color:${saldo >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; margin-top:4px">${saldo !== 0 ? fmtBRL(saldo) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Realizado</span>
              <span id="metric-pct-${o.id}" style="font-size:14px; font-weight:800; color:var(--primary); margin-top:4px">${pctRealizado.toFixed(1)}%</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Pendente</span>
              <span id="metric-pend-${o.id}" style="font-size:14px; font-weight:800; color:${pctPendente > 0 ? 'var(--warning)' : 'var(--gray-800)'}; margin-top:4px">${pctPendente.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CORPO ROLÁVEL (Tarefas) -->
    <div class="objective-card" style="margin: 0; border: 1px solid var(--gray-200); border-top: none; border-top-left-radius: 0; border-top-right-radius: 0; box-shadow: var(--shadow-md);">
      <div class="objective-body" style="display: block; padding: 20px; background: var(--gray-50);">
        
        <div class="savings-edit">
          <label>Estimativa de economia mensal</label>
          <div class="input-wrap">
            <span>R$</span>
            <input type="number" step="0.01" min="0" value="${o.monthlySavings}" ${canEditObj?'':'disabled'} onchange="updateSavings('${compId}','${o.id}', this.value)">
          </div>
          ${canEditObj ? `<button class="btn btn-sm btn-danger" style="margin-left:auto" onclick="deleteObjective('${compId}','${o.id}')">🗑 Remover objetivo</button>` : ''}
        </div>
        
        <div class="tasks-header" style="margin-top: 10px;">
          <h4 style="font-size: 16px;">Tarefas <span class="count">${taskCountText}</span></h4>
          ${canAddTask ? `<button class="btn btn-sm btn-ghost" onclick="addTask('${compId}','${o.id}')">+ Adicionar tarefa</button>` : ''}
        </div>
        
        <div>
          ${filteredTasks.length > 0 ? filteredTasks.map(t => taskHTML(t, compId, o.id)).join('') : `<p style="color:var(--gray-500);font-size:13px;padding:16px;background:#fff;border:1px solid var(--gray-200);border-radius:6px;text-align:center">Nenhuma tarefa encontrada.</p>`}
        </div>
        
        <div class="objective-totals" style="background: #fff;">
          <div class="t"><span class="label">Custo total</span><span class="value">${fmtBRL(totalCost)}</span></div>
          <div class="t"><span class="label">Resultado atingido</span><span class="value pos">${fmtBRL(resultadoEntregue)}</span></div>
          <div class="t"><span class="label">Saldo Financeiro</span><span class="value ${saldo>=0?'pos':'neg'}">${fmtBRL(saldo)}</span></div>
        </div>
      </div>
    </div>
  `;
}

function updateObjectiveMetrics(objId, compId) {
  const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
  if (!o) return;

  const allTasks = o.tasks;
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const estMensal = +o.monthlySavings || 0;
  const resultadoEntregue = allTasks.filter(t => effectiveStatus(t) === 'Concluída').reduce((s,t) => s + (+t.result||0), 0);
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  const saldo = resultadoEntregue - totalCost;
  const pctRealizado = estMensal > 0 ? (resultadoEntregue / estMensal) * 100 : 0;
  const pctPendente = estMensal > 0 ? Math.max(0, 100 - pctRealizado) : 0;

  const elDone = $(`meta-done-${objId}`);
  if (elDone) elDone.textContent = `${done}/${allTasks.length} tarefas concluídas`;
  const elLate = $(`meta-late-${objId}`);
  if (elLate) elLate.textContent = late > 0 ? `${late} em atraso` : '';
  const elEntregue = $(`metric-entregue-${objId}`);
  if (elEntregue) elEntregue.textContent = resultadoEntregue > 0 ? fmtBRL(resultadoEntregue) : '—';
  const elCost = $(`metric-cost-${objId}`);
  if (elCost) elCost.textContent = totalCost > 0 ? fmtBRL(totalCost) : '—';
  const elSaldo = $(`metric-saldo-${objId}`);
  if (elSaldo) {
    elSaldo.textContent = saldo !== 0 ? fmtBRL(saldo) : '—';
    elSaldo.style.color = saldo >= 0 ? 'var(--gray-800)' : 'var(--danger)';
  }
  const elPctRealizado = $(`metric-pct-${objId}`);
  if (elPctRealizado) elPctRealizado.textContent = `${pctRealizado.toFixed(1)}%`;
  const elPctPendente = $(`metric-pend-${objId}`);
  if (elPctPendente) {
    elPctPendente.textContent = `${pctPendente.toFixed(1)}%`;
    elPctPendente.style.color = pctPendente > 0 ? 'var(--warning)' : 'var(--gray-800)';
  }
}

function refreshObjectiveDOM(objId, compId) {
  if (state.currentObjective && String(state.currentObjective) === String(objId)) {
    renderObjectives(); // Atualiza a tela inteira se estiver nos detalhes
    return;
  }
  const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
  if (!o) return;
  const card = document.getElementById(`obj-${objId}`);
  if (card) {
    let objs = [...(state.objectives[compId] || [])];
    objs.sort((a, b) => (a.created_at && b.created_at) ? new Date(a.created_at) - new Date(b.created_at) : String(a.id).localeCompare(String(b.id)));
    const idx = objs.findIndex(x => String(x.id) === String(objId));
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = objectiveSummaryHTML(o, idx, compId).trim();
    card.replaceWith(tempDiv.firstElementChild);
  }
}

function startEditObjective(id, compId) {
  if (!state._editingObjectives) state._editingObjectives = [];
  if (!state._editingObjectives.includes(String(id))) state._editingObjectives.push(String(id));
  renderObjectives();
  setTimeout(() => document.getElementById(`edit-obj-title-${id}`)?.focus(), 50);
}

function cancelEditObjective(id, compId) {
  if (state._editingObjectives) state._editingObjectives = state._editingObjectives.filter(x => String(x) !== String(id));
  renderObjectives();
}

async function saveObjectiveTitle(compId, objId) {
  if (!state._editingObjectives || !state._editingObjectives.includes(String(objId))) return;
  const input = document.getElementById(`edit-obj-title-${objId}`);
  if (!input) return;
  const newTitle = input.value.trim();
  
  if (!newTitle) { showToast("O título não pode ser vazio.", "error"); return; }
  
  state._editingObjectives = state._editingObjectives.filter(x => String(x) !== String(objId));
  
  const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
  if (o && o.title !== newTitle) await updateObjectiveTitle(compId, objId, newTitle);
  else renderObjectives();
}

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
  if(!title){ showToast('Informe o título.', 'error'); return; }
  overlay.remove();
  createObjective(title, savings);
}
