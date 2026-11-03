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
  if (!t.id) return ''; 
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

function openNewTaskModal(compId, objId) {
  if (!can('addTask')) return;
  openTaskModal(compId, objId, null); 
}

function openTaskModal(compId, objId, taskId, focusField){
  const isNew = !taskId;
  const found = isNew ? null : findTask(taskId);
  
  if (!isNew && (!found || found.task._pending)) return;

  const t     = isNew ? { description: '', responsibleId: null, status: 'A Iniciar', cost: '', result: '', notes: '', attachments: [] } : found.task;
  
  // REGRA DE PERMISSÃO: Usuário Padrão só edita se for o responsável
  const isAssignedToMe = String(t.responsibleId) === String(state.currentUser.id);
  const canEditTaskGlobal = can('editTask');
  const edit = (state.currentUser.role === 'unique_user') ? isAssignedToMe : canEditTaskGlobal;
  
  const del   = !isNew && can('delTask');
  const dis   = edit ? '' : 'disabled';
  const users = usersOfCompany(compId);
  const eff   = effectiveStatus(t);
  const autoLate = eff === 'Atrasada' && t.status !== 'Atrasada';

  const overlay = openModal(`
    <div class="modal-header" style="padding: 14px 20px;">
      <h3>${isNew ? 'Nova Tarefa' : (edit ? 'Editar tarefa' : 'Visualizar tarefa')}</h3>
      <button onclick="this.closest('.modal-overlay').remove()">✕</button>
    </div>

    <div class="modal-body" style="padding: 16px 20px; overflow-y: hidden;">
      
      <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Descrição <span style="color:var(--danger)">*</span></label>
          <textarea id="newTaskDescription" data-field="description" style="min-height: 50px; max-height: 60px; resize: none; padding: 8px 12px;" placeholder="O que precisa ser feito?" ${dis}>${escapeHtml(t.description || '')}</textarea>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Responsável</label>
          <select data-field="responsibleId" ${dis} style="padding: 8px 12px;">
            <option value="">Não atribuído</option>
            ${users.map(u => `<option value="${u.id}" ${u.id===t.responsibleId?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Status ${autoLate ? `<span class="late-badge">⚠</span>` : ''}</label>
          <select class="status-select" data-field="status" data-status="${t.status}" ${dis} onchange="this.dataset.status=this.value" style="padding: 8px 12px;">
            ${STATUS_OPTIONS.map(s => `<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Início</label>
          <input type="date" data-field="startDate" value="${t.startDate||''}" ${dis} style="padding: 8px 12px;">
        </div>
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Conclusão</label>
          <input type="date" data-field="endDate" value="${t.endDate||''}" ${dis} style="padding: 8px 12px;">
        </div>
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Custo (R$)</label>
          <input type="number" data-field="cost" step="0.01" min="0" value="${t.cost||''}" placeholder="0,00" ${dis} style="padding: 8px 12px;">
        </div>
        <div>
          <label style="margin-top: 0; margin-bottom: 4px;">Resultado (R$)</label>
          <input type="number" data-field="result" step="0.01" min="0" value="${t.result||''}" placeholder="0,00" ${dis} style="padding: 8px 12px;">
        </div>
      </div>

      <div style="margin-top: 10px;">
        <label style="margin-top: 0; margin-bottom: 4px;">Observações</label>
        <textarea data-field="notes" placeholder="Anotações..." ${dis} style="min-height: 50px; max-height: 70px; resize: none; padding: 8px 12px;">${escapeHtml(t.notes||'')}</textarea>
      </div>

      ${!isNew ? `
      <div class="attachments" id="task-modal-attachments-${t.id}" style="margin-top: 10px; padding-top: 10px;">
        ${attachmentsInnerHTML(t, compId, edit)}
      </div>` : ''}
    </div>

    <div class="modal-footer" style="padding: 14px 20px; display: flex; align-items: center; width: 100%;">
      ${del ? `<button class="btn btn-danger" style="margin-right: auto; padding: 6px 12px;" onclick="removeTask('${compId}','${objId}','${t.id}'); this.closest('.modal-overlay').remove();">Excluir</button>` : ''}
      
      ${!isNew ? `<button class="btn btn-ghost" onclick="openHistory('${t.id}')" style="padding: 6px 12px;">◔ Histórico</button>` : ''}
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()" style="padding: 6px 12px;">${edit ? 'Cancelar' : 'Fechar'}</button>
      
      ${edit ? `<button class="btn btn-primary" id="btnSaveTask" onclick="saveTaskModal('${compId}','${objId}','${isNew ? '' : t.id}', this)" style="padding: 6px 16px;">Salvar</button>` : ''}
    </div>`, { className: 'task-modal' });

  if (!isNew && focusField) {
    setTimeout(() => {
      const el = overlay.querySelector(`[data-field="${focusField}"]`);
      if (el) {
        el.focus();
        el.classList.add('pulse-highlight');
        setTimeout(() => el.classList.remove('pulse-highlight'), 3500);
      }
    }, 100);
  } else if (isNew) {
    setTimeout(() => overlay.querySelector('#newTaskDescription')?.focus(), 100);
  }
}

async function saveTaskModal(compId, objId, taskId, btn){
  const overlay = btn.closest('.modal-overlay');
  const isNew = !taskId;
  
  const val = f => overlay.querySelector(`[data-field="${f}"]`)?.value ?? '';
  const description = val('description').trim();
  
  if (!description) { 
    showToast('A descrição é obrigatória para criar/salvar a tarefa.', 'error'); 
    overlay.querySelector('[data-field="description"]').focus();
    return; 
  }

  const newValues = {
    description,
    responsible_id: val('responsibleId') || null,
    status:        val('status'),
    start_date:    val('startDate') || null,
    end_date:      val('endDate') || null,
    cost:          parseFloat(val('cost')) || 0,
    result:        parseFloat(val('result')) || 0,
    notes:         val('notes')
  };

  btn.textContent = 'Salvando...'; btn.disabled = true;

  if (isNew) {
    const o = (state.objectives[compId] || []).find(x => String(x.id) === String(objId));
    const maxOrder = o.tasks.length > 0 ? Math.max(...o.tasks.map(t => t.sort_order || 0)) : 0;

    const { data, error } = await window.db.from('tasks').insert([{
      objective_id: objId,
      ...newValues,
      sort_order: maxOrder + 1
    }]).select().single();

    if (error) {
      showToast("Erro ao criar tarefa: " + error.message, "error");
      btn.textContent = 'Salvar'; btn.disabled = false;
      return;
    }

    o.tasks.push({
      ...data,
      responsibleId: data.responsible_id,
      startDate: data.start_date,
      endDate: data.end_date,
      attachments: []
    });
    showToast("Tarefa criada!", "success");

  } else {
    const found = findTask(taskId);
    if (!found) { overlay.remove(); return; }

    for (const [field, value] of Object.entries(newValues)) {
      const dbField = field === 'responsibleId' ? 'responsible_id' : 
                      field === 'startDate' ? 'start_date' : 
                      field === 'endDate' ? 'end_date' : field;
      
      const old = found.task[field];
      const isNum = field === 'cost' || field === 'result';
      const same = isNum
        ? (Number(old || 0) === Number(value || 0))
        : (String(old || '') === String(value || ''));
      if (same) continue;
      
      await updateTask(compId, taskId, field, value);
    }
    showToast("Tarefa atualizada!", "success");
  }

  overlay.remove();
  renderObjectives(); 
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
