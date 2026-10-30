/* assets/js/views/objectives.js */

function renderObjectives(){
  const el = $('view-objetivos');
  const isGlobal = can('scope') === 'all';
  
  if (!el.querySelector('#obj-header-container')) {
    let headerHTML = `
      <div id="obj-header-container">
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
        </div>
      </div>
      <div id="obj-list-container"></div>
    `;
    el.innerHTML = headerHTML;

    $('searchObj')?.addEventListener('input', e => { 
      state._objSearch = e.target.value; 
      renderObjectivesListOnly(); 
    });
    $('filterStatus')?.addEventListener('change', e => { 
      state._objStatus = e.target.value; 
      renderObjectivesListOnly(); 
    });
  } else {
    const searchInput = $('searchObj');
    if(searchInput && searchInput.value !== (state._objSearch || '')){
       searchInput.value = state._objSearch || '';
    }
  }

  renderObjectivesListOnly();
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

  elList.innerHTML = body;
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

  const isOpen = state._openObjectives && state._openObjectives.includes(String(o.id));
  const isEditing = state._editingObjectives && state._editingObjectives.includes(String(o.id));

  const filteredTasks = state._objStatus 
    ? allTasks.filter(t => effectiveStatus(t) === state._objStatus)
    : allTasks;

  const taskCountText = filteredTasks.length !== allTasks.length 
    ? `${filteredTasks.length} de ${allTasks.length}` 
    : `${allTasks.length}`;

  return `
  <div class="objective-card ${isOpen ? 'open' : ''}" id="obj-${o.id}" data-id="${o.id}">
    <div class="objective-header" onclick="toggleObjective('${o.id}')">
      <span class="chevron">▶</span>
      <span class="objective-num">${String(idx+1).padStart(2,'0')}</span>
      
      <div class="objective-title" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
        
        <!-- ÁREA DO TÍTULO COM EDIÇÃO INLINE -->
        ${isEditing ? `
          <div style="display:flex; align-items:center; gap:8px; flex:1;" onclick="event.stopPropagation()">
            <input type="text" id="edit-obj-title-${o.id}" value="${escapeHtml(o.title)}" 
                   class="task-desc" style="margin:0; width:100%; max-width:400px; font-size:15px; padding:4px 8px; height:32px;"
                   onkeypress="if(event.key === 'Enter') saveObjectiveTitle('${compId}','${o.id}')">
            <button class="btn btn-sm btn-primary" style="padding:4px 10px; height:32px;" onclick="saveObjectiveTitle('${compId}','${o.id}')" title="Salvar">✓</button>
            <button class="btn btn-sm btn-ghost" style="padding:4px 10px; height:32px;" onclick="cancelEditObjective('${o.id}')" title="Cancelar">✕</button>
          </div>
        ` : `
          <div style="display:flex; align-items:center; gap:8px; flex:1;">
            <h3>${escapeHtml(o.title)}</h3>
            ${canEditObj ? `<button class="btn btn-sm btn-ghost" style="padding:2px 6px; color:var(--gray-400);" onclick="event.stopPropagation(); startEditObjective('${o.id}')" title="Editar nome">✎</button>` : ''}
          </div>
        `}

        <div class="meta">
          <span>${allTasks.length} tarefa${allTasks.length!==1?'s':''}</span>
          <span>${done} concluída${done!==1?'s':''}</span>
          ${late ? `<span style="color:#991b1b;font-weight:600">${late} em atraso</span>` : ''}
        </div>
      </div>

      <div class="objective-savings" style="margin-left: 16px;">
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
        <h4>Tarefas <span class="count">${taskCountText}</span></h4>
        ${canAddTask ? `<button class="btn btn-sm btn-ghost" onclick="addTask('${compId}','${o.id}')">+ Adicionar tarefa</button>` : ''}
      </div>
      <div>
        ${filteredTasks.length > 0 
          ? filteredTasks.map(t => taskHTML(t, compId, o.id)).join('') 
          : `<p style="color:var(--gray-500);font-size:12px;padding:12px;background:var(--gray-100);border-radius:6px;text-align:center">
              Nenhuma tarefa encontrada ${state._objStatus ? `com o status <strong>${state._objStatus}</strong>` : 'cadastrada'}.
             </p>`
        }
      </div>
      <div class="objective-totals">
        <div class="t"><span class="label">Custo total</span><span class="value">${fmtBRL(totalCost)}</span></div>
        <div class="t"><span class="label">Resultado atingido</span><span class="value pos">${fmtBRL(totalResult)}</span></div>
        <div class="t"><span class="label">Saldo</span><span class="value ${net>=0?'pos':'neg'}">${fmtBRL(net)}</span></div>
      </div>
    </div>
  </div>`;
}

function toggleObjective(id){ 
  const el = $(`obj-${id}`);
  if(!el) return;
  
  if (el.classList.contains('open')) {
    el.classList.remove('open');
    if(state._openObjectives) {
      state._openObjectives = state._openObjectives.filter(x => String(x) !== String(id));
    }
  } else {
    el.classList.add('open');
    if(!state._openObjectives) state._openObjectives = [];
    if(!state._openObjectives.includes(String(id))) {
      state._openObjectives.push(String(id));
    }
  }
}

/* --- LÓGICA DE EDIÇÃO DO TÍTULO --- */

function startEditObjective(id) {
  if (!state._editingObjectives) state._editingObjectives = [];
  if (!state._editingObjectives.includes(String(id))) {
    state._editingObjectives.push(String(id));
  }
  renderObjectivesListOnly();
  // Foca o input automaticamente
  setTimeout(() => document.getElementById(`edit-obj-title-${id}`)?.focus(), 50);
}

function cancelEditObjective(id) {
  if (state._editingObjectives) {
    state._editingObjectives = state._editingObjectives.filter(x => String(x) !== String(id));
  }
  renderObjectivesListOnly();
}

async function saveObjectiveTitle(compId, objId) {
  const input = document.getElementById(`edit-obj-title-${objId}`);
  if (!input) return;
  const newTitle = input.value.trim();
  
  if (!newTitle) {
    showToast("O título não pode ser vazio.", "error");
    return;
  }
  
  // Atualiza no banco
  await updateObjectiveTitle(compId, objId, newTitle);
  
  // Remove o estado de edição e re-renderiza
  cancelEditObjective(objId);
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
