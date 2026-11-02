/* assets/js/components/task-card.js */ 

function refreshTaskDOM(compId, objId, taskId) {
  const found = findTask(taskId);
  if (!found) return;
  const taskEl = document.getElementById(`task-${taskId}`);
  if (taskEl) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = taskHTML(found.task, compId, objId).trim();
    taskEl.replaceWith(tempDiv.firstElementChild);
  }
}

function startEditTask(id, compId, objId) {
  if (!state._editingTasks) state._editingTasks = [];
  if (!state._editingTasks.includes(String(id))) {
    state._editingTasks.push(String(id));
  }
  refreshTaskDOM(compId, objId, id);
  setTimeout(() => document.getElementById(`edit-task-title-${id}`)?.focus(), 50);
}

function cancelEditTask(id, compId, objId) {
  if (state._editingTasks) {
    state._editingTasks = state._editingTasks.filter(x => String(x) !== String(id));
  }
  refreshTaskDOM(compId, objId, id);
}

async function saveTaskTitle(compId, taskId, objId) {
  // Evita salvar duas vezes se o usuário apertou ESC
  if (!state._editingTasks || !state._editingTasks.includes(String(taskId))) return;
  
  const input = document.getElementById(`edit-task-title-${taskId}`);
  if (!input) return;
  const newTitle = input.value.trim();
  const currentTask = findTask(taskId);
  if (!currentTask) return;

  if (!newTitle) {
    showToast("A descrição não pode ser vazia.", "error");
    return;
  }

  state._editingTasks = state._editingTasks.filter(x => String(x) !== String(taskId));
  
  if (newTitle !== currentTask.task.description) {
    await updateTask(compId, taskId, 'description', newTitle);
  }
  refreshTaskDOM(compId, objId, taskId);
}

function taskHTML(t, compId, objId){
  const users = usersOfCompany(compId);
  const edit = can('editTask');
  const del = can('delTask');
  const descEdit = can('editObj') || can('addTask');
  const eff = effectiveStatus(t);
  const autoLate = eff === 'Atrasada' && t.status !== 'Atrasada';
  
  const isOpen = state._openTasks && state._openTasks.includes(String(t.id));
  const isEditingTask = state._editingTasks && state._editingTasks.includes(String(t.id));
  const descText = t.description || '(Nova tarefa sem descrição)';

  return `
  <div class="task-card ${isOpen ? 'open' : ''}" id="task-${t.id}" data-task-id="${t.id}"
       draggable="true" 
       ondragstart="handleDragStart(event, '${t.id}')" 
       ondragend="handleDragEnd(event)"
       ondragover="handleDragOver(event)"
       ondrop="handleDrop(event, '${t.id}', '${objId}', '${compId}')">
    
    <!-- Cabeçalho (Sempre visível) -->
    <div class="task-header" onclick="toggleTask('${t.id}')">
      <span class="drag-handle" onclick="event.stopPropagation()" title="Arrastar para reordenar">⋮⋮</span>
      <span class="chevron">▶</span>
      <div class="task-summary">
        
        ${isEditingTask ? `
          <input type="text" id="edit-task-title-${t.id}" value="${escapeHtml(t.description)}" 
                 class="task-title-input" 
                 onclick="event.stopPropagation()"
                 onkeypress="if(event.key === 'Enter') saveTaskTitle('${compId}','${t.id}', '${objId}')"
                 onblur="setTimeout(() => saveTaskTitle('${compId}','${t.id}', '${objId}'), 150)"
                 onkeydown="if(event.key === 'Escape') cancelEditTask('${t.id}', '${compId}', '${objId}')">
        ` : `
          <span class="desc" 
                onclick="event.stopPropagation(); ${edit ? `startEditTask('${t.id}', '${compId}', '${objId}')` : `toggleTask('${t.id}')`}" 
                style="cursor: ${edit ? 'text' : 'pointer'}; transition: color 0.2s;"
                onmouseover="${edit ? 'this.style.color=\'var(--primary)\'' : ''}" 
                onmouseout="${edit ? 'this.style.color=\'\'' : ''}">
            ${escapeHtml(descText)}
          </span>
        `}
        
        <span class="tag" style="background:${autoLate?'#fee2e2':'var(--gray-100)'};color:${autoLate?'#991b1b':'var(--gray-600)'}">${eff}</span>
      </div>
      <div class="task-actions" onclick="event.stopPropagation()">
        <button title="Histórico" onclick="openHistory('${t.id}')">◔</button>
        ${del ? `<button class="danger" title="Remover" onclick="removeTask('${compId}','${objId}','${t.id}')">✕</button>` : ''}
      </div>
    </div>

    <!-- Corpo da Tarefa (Sem o campo de título duplicado) -->
    <div class="task-body" onmousedown="this.closest('.task-card').draggable=false" onmouseup="this.closest('.task-card').draggable=true">
      
      <div class="task-grid">
        <div class="task-field">
          <label>Responsável</label>
          <select data-field="responsibleId" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','responsibleId',this.value)">
            ${users.map(u => `<option value="${u.id}" ${u.id===t.responsibleId?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="task-field">
          <label>Início</label>
          <input type="date" data-field="startDate" value="${t.startDate||''}" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','startDate',this.value)">
        </div>
        <div class="task-field">
          <label>Conclusão</label>
          <input type="date" data-field="endDate" value="${t.endDate||''}" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','endDate',this.value)">
        </div>
        <div class="task-field">
          <label>Status ${autoLate ? `<span class="late-badge">⚠ Atrasada</span>` : ''}</label>
          <select class="status-select" data-field="status" data-status="${t.status}" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','status',this.value); this.dataset.status=this.value;">
            ${STATUS_OPTIONS.map(s => `<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="task-field">
          <label>Custo (R$)</label>
          <input type="number" data-field="cost" step="0.01" min="0" value="${t.cost||''}" placeholder="0,00" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','cost',this.value)">
        </div>
        <div class="task-field">
          <label>Resultado (R$)</label>
          <input type="number" data-field="result" step="0.01" min="0" value="${t.result||''}" placeholder="0,00" ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','result',this.value)">
        </div>
        <div class="task-field full">
          <label>Observações</label>
          <textarea data-field="notes" placeholder="Anotações..." ${edit?'':'disabled'} onchange="updateTask('${compId}','${t.id}','notes',this.value)">${escapeHtml(t.notes||'')}</textarea>
        </div>
      </div>
      <div class="attachments">
        <div class="attach-row">
          <span class="attach-label">📎 Anexos:</span>
          ${(t.attachments||[]).map(a =>
            `<span class="attach-item" style="cursor:pointer; transition:var(--transition)" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--gray-200)'" onclick="openAttachment('${a.path}')" title="Clique para abrir/baixar">
              📄 ${escapeHtml(a.name)}
              ${edit ? `<button onclick="event.stopPropagation(); removeAttachment('${compId}','${t.id}','${a.id}')">×</button>` : ''}
            </span>`).join('')}
          ${(t.attachments||[]).length === 0 ? '<span style="font-size:12px;color:var(--gray-400)">nenhum</span>' : ''}
          ${edit ? `
            <label class="btn btn-sm btn-ghost" style="margin-left:auto;padding:4px 10px;font-size:11px;cursor:pointer">
              + Anexar arquivo
              <input type="file" style="display:none" multiple onchange="addAttachments('${compId}','${t.id}', this)">
            </label>` : ''}
        </div>
      </div>
    </div>
  </div>`;
}

function toggleTask(id) {
  const el = $(`task-${id}`);
  if (!el) return;
  
  if (el.classList.contains('open')) {
    el.classList.remove('open');
    if (state._openTasks) state._openTasks = state._openTasks.filter(x => x !== id);
  } else {
    el.classList.add('open');
    if (!state._openTasks) state._openTasks = [];
    if (!state._openTasks.includes(id)) state._openTasks.push(id);
  }
}

function openHistory(taskId){
  // ... (Mantenha a função openHistory exatamente como estava)
  const entries = historyFor(taskId);
  const found = findTask(taskId);
  const title = found ? (found.task.description || '(sem descrição)') : 'Tarefa';
  const html = entries.length
    ? entries.map(e => {
        const u = userById(e.userId);
        return `<div class="history-item">
          <div class="head"><strong>${u?u.name:'—'}</strong> · ${fmtDateTime(e.timestamp)}</div>
          <div class="body">alterou <span class="field">${FIELD_LABELS[e.field]||e.field}</span>:
            <span class="old">${escapeHtml(String(e.oldValue||'—'))}</span>
            → <span class="new">${escapeHtml(String(e.newValue||'—'))}</span>
          </div></div>`;
      }).join('')
    : '<p style="color:var(--gray-500);text-align:center;padding:20px">Nenhuma alteração registrada.</p>';

  openModal(`
    <div class="modal-header">
      <h3>Histórico — ${escapeHtml(title)}</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body" style="padding:8px 22px">${html}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
    </div>`);
}
