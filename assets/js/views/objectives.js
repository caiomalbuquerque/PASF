/* assets/js/views/objectives.js */

function renderObjectives(){
  const el = $('view-objetivos');
  
  if (state.currentObjective) {
    renderObjectiveDetail(state.currentObjective, el);
    return;
  }

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

    $('searchObj')?.addEventListener('input', e => { state._objSearch = e.target.value; renderObjectives(); });
    $('filterStatus')?.addEventListener('change', e => { state._objStatus = e.target.value; renderObjectives(); });
  } else {
    const searchInput = $('searchObj');
    if(searchInput && searchInput.value !== (state._objSearch || '')){ searchInput.value = state._objSearch || ''; }
  }

  renderObjectivesListOnly();
}

function openObjectiveDetail(objId) {
  if (String(objId).startsWith('temp_')) {
    showToast("Aguarde — objetivo ainda sendo criado…", "info");
    return;
  }
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
  
  const filteredTasks = state._objStatus ? allTasks.filter(t => effectiveStatus(t) === state._objStatus) : allTasks;
  const taskCountText = filteredTasks.length !== allTasks.length ? `${filteredTasks.length} de ${allTasks.length}` : `${allTasks.length}`;

  el.innerHTML = `
    <!-- CONTAINER FIXO (STICKY) -->
    <div style="position: sticky; top: 59px; z-index: 20; background: var(--gray-100); margin-top: -24px; padding-top: 24px;">
      
      <!-- Botão Voltar alinhado -->
      <div style="margin-bottom: 12px;">
        <button onclick="closeObjectiveDetail()" style="display: inline-flex; align-items: center; gap: 6px; color: var(--gray-600); font-weight: 600; font-size: 13px; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--gray-300); background: #fff; box-shadow: var(--shadow-sm); transition: var(--transition);" onmouseover="this.style.color='var(--primary)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.color='var(--gray-600)'; this.style.borderColor='var(--gray-300)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Voltar para Objetivos
        </button>
      </div>

      <!-- Cabeçalho do Objetivo (Clicável para Editar) -->
      <div class="objective-card" style="box-shadow: var(--shadow-md); border: 1px solid var(--gray-200); margin: 0; border-bottom: none; border-bottom-left-radius: 0; border-bottom-right-radius: 0; cursor: pointer; transition: var(--transition);" onclick="openObjectiveModal('${compId}', '${o.id}')" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--gray-200)'">
        <div class="objective-header" style="align-items: flex-start; padding: 20px; background: #fff; border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg);">
          <div style="display:flex; gap:14px; flex: 1; min-width: 250px; flex-wrap: wrap;">
            <div style="flex:1; min-width: 200px;">
              <h3 style="font-size:20px; line-height:1.3; margin:0; word-break: break-word;">
                ${escapeHtml(o.title)}
              </h3>
              <div class="meta" style="margin-top: 8px; display:flex; gap:12px;">
                <span style="font-weight:600; color:var(--gray-500); font-size: 13px;">${done}/${allTasks.length} tarefas concluídas</span>
                ${late ? `<span class="tag" style="background:var(--status-late-bg); color:var(--status-late-text); font-weight:700;">${late} em atraso</span>` : ''}
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
              <span style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${resultadoEntregue > 0 ? fmtBRL(resultadoEntregue) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Custos Envolvidos</span>
              <span style="font-size:14px; font-weight:800; color:var(--gray-800); margin-top:4px">${totalCost > 0 ? fmtBRL(totalCost) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">Saldo</span>
              <span style="font-size:14px; font-weight:800; color:${saldo >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; margin-top:4px">${saldo !== 0 ? fmtBRL(saldo) : '—'}</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Realizado</span>
              <span style="font-size:14px; font-weight:800; color:var(--primary); margin-top:4px">${pctRealizado.toFixed(1)}%</span>
            </div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--gray-500); letter-spacing:.05em">% Pendente</span>
              <span style="font-size:14px; font-weight:800; color:${pctPendente > 0 ? 'var(--warning)' : 'var(--gray-800)'}; margin-top:4px">${pctPendente.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CORPO ROLÁVEL (Tarefas) -->
    <div class="objective-card" style="margin: 0; border: 1px solid var(--gray-200); border-top: none; border-top-left-radius: 0; border-top-right-radius: 0; box-shadow: var(--shadow-md);">
      <div class="objective-body" style="display: block; padding: 20px; background: var(--gray-50); border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);">
        
        <div class="tasks-header" style="margin-top: 10px;">
          <h4 style="font-size: 16px;">Tarefas <span class="count">${taskCountText}</span></h4>
          ${canAddTask ? `<button class="btn btn-sm btn-ghost" onclick="addTask('${compId}','${o.id}')">+ Adicionar tarefa</button>` : ''}
        </div>
        
        <div>
          ${filteredTasks.length > 0 ? filteredTasks.map(t => taskHTML(t, compId, o.id)).join('') : `<p style="color:var(--gray-500);font-size:13px;padding:16px;background:#fff;border:1px solid var(--gray-200);border-radius:6px;text-align:center">Nenhuma tarefa encontrada.</p>`}
        </div>
        
      </div>
    </div>
  `;
}

function updateObjectiveMetrics(objId, compId) {
  // Atualiza apenas se estiver na tela de lista, pois na tela de detalhe o renderObjectives() já é chamado
  if (state.currentObjective) return;
  
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

/* --- MODAL DE EDIÇÃO DO OBJETIVO --- */
function openObjectiveModal(compId, objId) {
  if (!can('editObj')) return;
  
  const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
  if (!o) return;

  openModal(`
    <div class="modal-header">
      <h3>Editar Objetivo</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body">
      <label>Descrição do Objetivo</label>
      <textarea id="editObjTitle" style="min-height: 60px; resize: vertical;" placeholder="Descreva o objetivo...">${escapeHtml(o.title)}</textarea>

      <label>Estimativa de Economia Mensal (R$)</label>
      <input type="number" id="editObjSavings" step="0.01" min="0" value="${o.monthlySavings || 0}" placeholder="0,00">
    </div>
    <div class="modal-footer" style="display: flex; align-items: center; width: 100%;">
      ${can('delObj') ? `<button class="btn btn-danger" style="margin-right: auto;" onclick="if(confirm('Remover este objetivo e todas as suas tarefas?')) { deleteObjective('${compId}','${o.id}'); this.closest('.modal-overlay').remove(); }">Excluir Objetivo</button>` : ''}
      
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
      <button class="btn btn-primary" onclick="saveObjectiveModal('${compId}', '${o.id}', this)">Salvar</button>
    </div>
  `);
}

async function saveObjectiveModal(compId, objId, btn) {
  const overlay = btn.closest('.modal-overlay');
  const newTitle = overlay.querySelector('#editObjTitle').value.trim();
  const newSavings = +overlay.querySelector('#editObjSavings').value || 0;
  
  if (!newTitle) { showToast("O título não pode ser vazio.", "error"); return; }
  
  btn.textContent = 'Salvando...'; btn.disabled = true;
  
  const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
  
  if (o.title !== newTitle) await updateObjectiveTitle(compId, objId, newTitle);
  if (o.monthlySavings !== newSavings) await updateSavings(compId, objId, newSavings);
  
  overlay.remove();
  renderObjectives();
  showToast("Objetivo atualizado!", "success");
}

function startEditObjective(id, compId) {} // Desativado (agora usa modal)
function cancelEditObjective(id, compId) {} // Desativado
async function saveObjectiveTitle(compId, objId) {} // Desativado

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
