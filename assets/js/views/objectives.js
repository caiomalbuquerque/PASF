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
    let objs = [...(state.objectives[comp.id] || [])];
    
    // Ordena sempre pela data de criação (ou ID, se created_at não existir)
    objs.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      return String(a.id).localeCompare(String(b.id));
    });
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
  
  // Cálculos de Status e Tarefas
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  
  // Cálculos Financeiros
  const estMensal = +o.monthlySavings || 0;
  
  // O valor "Entregue" soma apenas os resultados das tarefas CONCLUÍDAS
  const resultadoEntregue = allTasks
    .filter(t => effectiveStatus(t) === 'Concluída')
    .reduce((s,t) => s + (+t.result||0), 0);
    
  // O Custo soma todas as tarefas
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  
  // Saldo é Entregue - Custo
  const saldo = resultadoEntregue - totalCost;
  
  // Porcentagens baseadas na Estimativa Mensal
  const pctRealizado = estMensal > 0 ? (resultadoEntregue / estMensal) * 100 : 0;
  const pctPendente = estMensal > 0 ? Math.max(0, 100 - pctRealizado) : 0;

  const canEditObj = can('editObj');
  const canAddTask = can('addTask');

  const isOpen = state._openObjectives && state._openObjectives.includes(String(o.id));
  const isEditing = state._editingObjectives && state._editingObjectives.includes(String(o.id));

  // Filtro de status do topo da página
  const filteredTasks = state._objStatus 
    ? allTasks.filter(t => effectiveStatus(t) === state._objStatus)
    : allTasks;

  const taskCountText = filteredTasks.length !== allTasks.length 
    ? `${filteredTasks.length} de ${allTasks.length}` 
    : `${allTasks.length}`;

  return `
  <div class="objective-card ${isOpen ? 'open' : ''}" id="obj-${o.id}" data-id="${o.id}">
    
    <!-- CABEÇALHO REPROJETADO -->
    <div class="objective-header" onclick="toggleObjective('${o.id}')" style="align-items: flex-start; padding: 20px;">
      
      <!-- Coluna 1: Chevron, Número, Título e Meta -->
      <div style="display:flex; gap:14px; flex: 1; min-width: 250px;">
        <span class="chevron" style="margin-top: 4px;">▶</span>
        <span class="objective-num" style="margin-top: 2px;">${String(idx+1).padStart(2,'0')}</span>
        <div style="flex:1;">
          
          ${isEditing ? `
            <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation()">
              <input type="text" id="edit-obj-title-${o.id}" value="${escapeHtml(o.title)}" 
                     class="task-desc" style="margin:0; width:100%; max-width:400px; font-size:15px; padding:4px 8px; height:32px;"
                     onkeypress="if(event.key === 'Enter') saveObjectiveTitle('${compId}','${o.id}')">
              <button class="btn btn-sm btn-primary" style="padding:4px 10px; height:32px;" onclick="saveObjectiveTitle('${compId}','${o.id}')" title="Salvar">✓</button>
              <button class="btn btn-sm btn-ghost" style="padding:4px 10px; height:32px;" onclick="cancelEditObjective('${o.id}')" title="Cancelar">✕</button>
            </div>
          ` : `
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <h3 style="font-size:16px; line-height:1.3; margin:0;">${escapeHtml(o.title)}</h3>
              ${canEditObj ? `<button class="btn btn-sm btn-ghost" style="padding:2px 6px; color:var(--gray-400);" onclick="event.stopPropagation(); startEditObjective('${o.id}')" title="Editar nome">✎</button>` : ''}
            </div>
          `}

          <!-- TEXTO DE TAREFAS CONCLUÍDAS -->
          <div class="meta" style="margin-top: 8px;">
            <span style="font-weight:600; color:var(--gray-500)">${done}/${allTasks.length} tarefas concluídas</span>
            ${late ? `<span class="tag" style="background:var(--status-late-bg); color:var(--status-late-text); font-weight:700; margin-left: 6px">${late} em atraso</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Coluna 2, 3, 4, 5, 6: Métricas Financeiras -->
      <div style="display:flex; gap:24px; flex-wrap:wrap; margin-top: 2px; text-align:center; justify-content:flex-end;">
        
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
    
    <!-- CORPO EXPANDIDO (Oculto por padrão) -->
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
        <div class="t"><span class="label">Resultado atingido</span><span class="value pos">${fmtBRL(resultadoEntregue)}</span></div>
        <div class="t"><span class="label">Saldo Financeiro</span><span class="value ${saldo>=0?'pos':'neg'}">${fmtBRL(saldo)}</span></div>
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
