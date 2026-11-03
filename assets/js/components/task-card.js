/* assets/js/components/task-card.js */

function refreshTaskDOM(compId, objId, taskId) {
  if (state.currentObjective) {
    renderObjectives(); 
  }
}

function taskHTML(t, compId, objId){
  if (t._pending) {
    return `<div class="task-card task-card-pending" id="task-${t.id}"><span style="color:var(--gray-500)">Salvando…</span></div>`;
  }

  const del = can('delTask');
  const eff = effectiveStatus(t);
  const late = eff === 'Atrasada';
  const resp = userById(t.responsibleId);
  const cost = +t.cost || 0;
  const result = +t.result || 0;
  const nAtt = (t.attachments || []).length;
  const descText = t.description || '(Nova tarefa sem descrição)';

  let statusBg = 'var(--status-todo-bg)', statusColor = 'var(--status-todo-text)';
  if (eff === 'Concluída') { statusBg = 'var(--status-done-bg)'; statusColor = 'var(--status-done-text)'; }
  else if (eff === 'Em Andamento') { statusBg = 'var(--status-progress-bg)'; statusColor = 'var(--status-progress-text)'; }
  else if (eff === 'Atrasada') { statusBg = 'var(--status-late-bg)'; statusColor = 'var(--status-late-text)'; }
  else if (eff === 'Cancelada') { statusBg = 'var(--status-cancel-bg)'; statusColor = 'var(--status-cancel-text)'; }

  return `
  <div class="task-card" id="task-${t.id}" data-task-id="${t.id}"
       draggable="true" ondragstart="handleDragStart(event, '${t.id}')" ondragend="handleDragEnd(event)"
       ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${t.id}', '${objId}', '${compId}')"
       onclick="openTaskModal('${compId}','${objId}','${t.id}')"
       style="padding: 12px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
    
    <div style="flex: 2; min-width: 250px; display: flex; align-items: center; gap: 8px;">
      <span class="drag-handle" onclick="event.stopPropagation()" title="Arrastar para reordenar">⋮⋮</span>
      <span style="font-size: 14px; font-weight: 600; color: var(--gray-900); word-break: break-word;">${escapeHtml(descText)}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 100px;">
      <span class="l">Responsável</span>
      <span class="v">${resp ? escapeHtml(resp.name) : '—'}</span>
    </div>
    
    <div class="task-stat" style="flex: 1; min-width: 80px;">
      <span class="l">Início</span>
      <span class="v">${fmtDate(t.startDate)}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 80px;">
      <span class="l">Conclusão</span>
      <span class="v" style="${late?'color:var(--danger)':''}">${fmtDate(t.endDate)}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 100px;">
      <span class="l">Status</span>
      <span class="v" style="background:${statusBg}; color:${statusColor}; padding: 2px 8px; border-radius: 4px; display: inline-block; width: fit-content; font-size: 12px;">${eff}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 80px;">
      <span class="l">Custo</span>
      <span class="v">${fmtBRL(cost)}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 80px;">
      <span class="l">Resultado</span>
      <span class="v" style="color:var(--accent-dark)">${fmtBRL(result)}</span>
    </div>

    <div class="task-stat" style="flex: 1; min-width: 60px;">
      <span class="l">Anexos</span>
      <span class="v">${nAtt ? '📎 ' + nAtt : '—'}</span>
    </div>
  </div>`;
}

function attachmentsInnerHTML(t, compId, edit){
  const atts = t.attachments || [];
  return `
    <div class="attach-row">
      <span class="attach-label">📎 Anexos:</span>
      ${atts.map(a =>
        `<span class="attach-item" style="cursor:pointer" onclick="openAttachment('${a.path}')" title="Clique para abrir/baixar">
          📄 ${escapeHtml(a.name)}
          ${edit ? `<button onclick="event.stopPropagation(); removeAttachment('${compId}','${t.id}','${a.id}')">×</button>` : ''}
        </span>`).join('')}
      ${atts.length === 0 ? '<span style="font-size:12px;color:var(--gray-400)">nenhum</span>' : ''}
      ${edit ? `
        <label class="btn btn-sm btn-ghost" style="margin-left:auto;padding:4px 10px;font-size:11px;cursor:pointer">
          + Anexar arquivo
          <input type="file" style="display:none" multiple onchange="addAttachments('${compId}','${t.id}', this)">
        </label>` : ''}
    </div>`;
}

function refreshAttachmentsUI(taskId){
  const found = findTask(taskId);
  if (!found) return;
  const box = document.getElementById(`task-modal-attachments-${taskId}`);
  if (box) box.innerHTML = attachmentsInnerHTML(found.task, found.compId, can('editTask'));
  refreshTaskDOM(found.compId, found.objective.id, taskId);
}

function openTaskModal(compId, objId, taskId, focusField){
  const found = findTask(taskId);
  if (!found || found.task._pending) return;

  const t     = found.task;
  const edit  = can('editTask');
  const del   = can('delTask');
  const dis   = edit ? '' : 'disabled';
  const users = usersOfCompany(found.compId);
  const eff   = effectiveStatus(t);
  const autoLate = eff === 'Atrasada' && t.status !== 'Atrasada';

  const overlay = openModal(`
    <div class="modal-header">
      <h3>${edit ? 'Editar tarefa' : 'Tarefa'}</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>

    <div class="modal-body">
      <label>Descrição</label>
      <textarea data-field="description" style="min-height: 60px; resize: vertical;" placeholder="Descreva a tarefa detalhadamente..." ${dis}>${escapeHtml(t.description || '')}</textarea>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
        <div>
          <label>Responsável</label>
          <select data-field="responsibleId" ${dis}>
            <option value="">Não atribuído</option>
            ${users.map(u => `<option value="${u.id}" ${u.id===t.responsibleId?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Status ${autoLate ? `<span class="late-badge">⚠ Atrasada</span>` : ''}</label>
          <select class="status-select" data-field="status" data-status="${t.status}" ${dis} onchange="this.dataset.status=this.value">
            ${STATUS_OPTIONS.map(s => `<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>Início</label>
          <input type="date" data-field="startDate" value="${t.startDate||''}" ${dis}>
        </div>
        <div>
          <label>Conclusão</label>
          <input type="date" data-field="endDate" value="${t.endDate||''}" ${dis}>
        </div>
        <div>
          <label>Custo (R$)</label>
          <input type="number" data-field="cost" step="0.01" min="0" value="${t.cost||''}" placeholder="0,00" ${dis}>
        </div>
        <div>
          <label>Resultado (R$)</label>
          <input type="number" data-field="result" step="0.01" min="0" value="${t.result||''}" placeholder="0,00" ${dis}>
        </div>
      </div>

      <label>Observações</label>
      <textarea data-field="notes" placeholder="Anotações..." ${dis} style="min-height: 80px;">${escapeHtml(t.notes||'')}</textarea>

      <div class="attachments" id="task-modal-attachments-${t.id}" style="margin-top: 14px;">
        ${attachmentsInnerHTML(t, found.compId, edit)}
      </div>
    </div>

    <div class="modal-footer" style="display: flex; align-items: center; width: 100%;">
      ${del ? `<button class="btn btn-danger" style="margin-right: auto;" onclick="removeTask('${found.compId}','${found.objective.id}','${t.id}'); this.closest('.modal-overlay').remove();">Excluir</button>` : ''}
      
      <button class="btn btn-ghost" onclick="openHistory('${t.id}')">◔ Histórico</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">${edit ? 'Cancelar' : 'Fechar'}</button>
      
      ${edit ? `<button class="btn btn-primary" id="btnSaveTask" onclick="saveTaskModal('${found.compId}','${found.objective.id}','${t.id}', this)">Salvar</button>` : ''}
    </div>`, { className: 'task-modal' });

  if (focusField) {
    setTimeout(() => {
      const el = overlay.querySelector(`[data-field="${focusField}"]`);
      if (el) {
        el.focus();
        el.classList.add('pulse-highlight');
        setTimeout(() => el.classList.remove('pulse-highlight'), 3500);
      }
    }, 100);
  }
}

async function saveTaskModal(compId, objId, taskId, btn){
  const overlay = btn.closest('.modal-overlay');
  const found = findTask(taskId);
  if (!found) { overlay.remove(); return; }

  const val = f => overlay.querySelector(`[data-field="${f}"]`)?.value ?? '';
  const description = val('description').trim();
  if (!description) { showToast('A descrição não pode ser vazia.', 'error'); return; }

  const newValues = {
    description,
    responsibleId: val('responsibleId'),
    status:        val('status'),
    startDate:     val('startDate'),
    endDate:       val('endDate'),
    cost:          val('cost'),
    result:        val('result'),
    notes:         val('notes')
  };

  btn.textContent = 'Salvando...'; btn.disabled = true;

  for (const [field, value] of Object.entries(newValues)) {
    const old = found.task[field];
    const isNum = field === 'cost' || field === 'result';
    const same = isNum
      ? (Number(old || 0) === Number(value || 0))
      : (String(old || '') === String(value || ''));
    if (same) continue;
    await updateTask(compId, taskId, field, value);
  }

  overlay.remove();
  refreshTaskDOM(found.compId, objId, taskId);
  showToast("Tarefa atualizada!", "success");
}

function openHistory(taskId){
  const entries = historyFor(taskId);
  const found = findTask(taskId);
  const title = found ? (found.task.description || '(sem descrição)') : 'Tarefa';
  
  const html = entries.length
    ? entries.map(e => {
        const u = userById(e.userId);
        return `<div class="history-item">
          <div class="head"><strong>${u?escapeHtml(u.name):'—'}</strong> · ${fmtDateTime(e.timestamp)}</div>
          <div class="body">alterou <span class="field">${FIELD_LABELS[e.field]||e.field}</span>:
            <span class="old">${escapeHtml(String(e.oldValue||'—'))}</span>
            → <span class="new">${escapeHtml(String(e.newValue||'—'))}</span>
          </div></div>`;
      }).join('')
    : '<p style="color:var(--gray-500);text-align:center;padding:20px">Nenhuma alteração registrada.</p>';

  const overlay = openModal(`
    <div class="modal-header">
      <h3>Histórico — ${escapeHtml(title)}</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>
    <div class="modal-body" style="padding:8px 22px">${html}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
    </div>`);
    
  overlay.style.zIndex = '105'; 
}
