
/* assets/js/components/task-card.js */ 

function taskHTML(t, compId, objId){
  const users = usersOfCompany(compId);
  const edit = can('editTask');
  const del = can('delTask');
  const descEdit = can('editObj') || can('addTask');
  const eff = effectiveStatus(t);
  const autoLate = eff === 'Atrasada' && t.status !== 'Atrasada';
  
  const isOpen = state._openTasks && state._openTasks.includes(String(t.id));

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
        <span class="desc">${escapeHtml(descText)}</span>
        <span class="tag" style="background:${autoLate?'#fee2e2':'var(--gray-100)'};color:${autoLate?'#991b1b':'var(--gray-600)'}">${eff}</span>
      </div>
      <div class="task-actions" onclick="event.stopPropagation()">
        <button title="Histórico" onclick="openHistory('${t.id}')">◔</button>
        ${del ? `<button class="danger" title="Remover" onclick="removeTask('${compId}','${objId}','${t.id}')">✕</button>` : ''}
      </div>
    </div>

    <!-- Corpo da Tarefa -->
    <div class="task-body" onmousedown="this.closest('.task-card').draggable=false" onmouseup="this.closest('.task-card').draggable=true">
      <div class="task-top">
        <input class="task-desc" data-field="description" value="${escapeHtml(t.description)}" placeholder="O que precisa ser feito?"
               ${descEdit && edit ? '' : 'disabled'}
               onchange="updateTask('${compId}','${t.id}','description',this.value)">
      </div>
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
