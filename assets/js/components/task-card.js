/* assets/js/components/task-card.js */

/* ---------- Atualização pontual do cartão ---------- */
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

/* ---------- Cartão (resumo) ---------- */
function taskHTML(t, compId, objId){
  // Tarefa ainda sendo criada no banco: versão bloqueada
  if (t._pending) {
    return `
      <div class="task-card task-card-pending" id="task-${t.id}">
        <div class="task-card-top">
          <div class="task-card-title">
            <span class="desc">${escapeHtml(t.description || '(nova tarefa)')}</span>
            <span class="tag" style="background:var(--gray-100);color:var(--gray-600)">Salvando…</span>
          </div>
        </div>
      </div>`;
  }

  const del   = can('delTask');
  const eff   = effectiveStatus(t);
  const late  = eff === 'Atrasada';
  const resp  = userById(t.responsibleId);
  const cost  = +t.cost || 0;
  const result= +t.result || 0;
  const nAtt  = (t.attachments || []).length;
  const descText = t.description || '(Nova tarefa sem descrição)';

  return `
  <div class="task-card" id="task-${t.id}" data-task-id="${t.id}"
       draggable="true" ondragstart="handleDragStart(event, '${t.id}')" ondragend="handleDragEnd(event)"
       ondragover="handleDragOver(event)" ondrop="handleDrop(event, '${t.id}', '${objId}', '${compId}')"
       onclick="openTaskModal('${compId}','${objId}','${t.id}')">

    <div class="task-card-top">
      <div class="task-card-title">
        <span class="drag-handle" onclick="event.stopPropagation()" title="Arrastar para reordenar">⋮⋮</span>
        <span class="desc">${escapeHtml(descText)}</span>
        <span class="tag" style="background:${late?'#fee2e2':'var(--gray-100)'};color:${late?'#991b1b':'var(--gray-600)'}">${eff}</span>
      </div>
      <div class="task-actions" onclick="event.stopPropagation()">
        <button title="Histórico" onclick="openHistory('${t.id}')">◔</button>
        ${del ? `<button class="danger" title="Remover" onclick="removeTask('${compId}','${objId}','${t.id}')">✕</button>` : ''}
      </div>
    </div>

    <div class="task-stats">
      <div class="task-stat">
        <span class="l">Responsável</span>
        <span class="v">${resp ? escapeHtml(resp.name) : '—'}</span>
      </div>
      <div class="task-stat">
        <span class="l">Início</span>
        <span class="v">${fmtDate(t.startDate)}</span>
      </div>
      <div class="task-stat">
        <span class="l">Conclusão</span>
        <span class="v" style="${late?'color:var(--danger)':''}">${fmtDate(t.endDate)}</span>
      </div>
      <div class="task-stat">
        <span class="l">Custo</span>
        <span class="v">${fmtBRL(cost)}</span>
      </div>
      <div class="task-stat">
        <span class="l">Resultado</span>
        <span class="v" style="color:var(--accent-dark)">${fmtBRL(result)}</span>
      </div>
      <div class="task-stat">
        <span class="l">Anexos</span>
        <span class="v">${nAtt ? '📎 ' + nAtt : '—'}</span>
      </div>
    </div>
  </div>`;
}

/* ---------- Anexos (usado no modal) ---------- */
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

// Chamado por tasks.js após adicionar/remover anexo
function refreshAttachmentsUI(taskId){
  const found = findTask(taskId);
  if (!found) return;
  const box = document.getElementById(`task-modal-attachments-${taskId}`);
  if (box) box.innerHTML = attachmentsInnerHTML(found.task, found.compId, can('editTask'));
  refreshTaskDOM(found.compId, found.objective.id, taskId);
}

/* ---------- Modal de edição ---------- */
function openTaskModal(compId, objId, taskId, focusField){
  const found = findTask(taskId);
  if (!found || found.task._pending) return;

  const t     = found.task;
  const edit  = can('editTask');
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
      <div class="task-field full" style="margin-bottom:14px">
        <label>Descrição</label>
        <input type="text" data-field="description" value="${escapeHtml(t.description || '')}"
               placeholder="Descreva a tarefa..." ${dis}
               onkeydown="if(event.key==='Enter') document.getElementById('btnSaveTask').click()">
      </div>

      <div class="task-grid">
        <div class="task-field">
          <label>Responsável</label>
          <select data-field="responsibleId" ${dis}>
            ${users.map(u => `<option value="${u.id}" ${u.id===t.responsibleId?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="task-field">
          <label>Status ${autoLate ? `<span class="late-badge">⚠ Atrasada</span>` : ''}</label>
          <select class="status-select" data-field="status" data-status="${t.status}" ${dis}
                  onchange="this.dataset.status=this.value">
            ${STATUS_OPTIONS.map(s => `<option ${s===t.status?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="task-field">
          <label>Início</label>
          <input type="date" data-field="startDate" value="${t.startDate||''}" ${dis}>
        </div>
        <div class="task-field">
          <label>Conclusão</label>
          <input type="date" data-field="endDate" value="${t.endDate||''}" ${dis}>
        </div>
        <div class="task-field">
          <label>Custo (R$)</label>
          <input type="number" data-field="cost" step="0.01" min="0" value="${t.cost||''}" placeholder="0,00" ${dis}>
        </div>
        <div class="task-field">
          <label>Resultado (R$)</label>
          <input type="number" data-field="result" step="0.01" min="0" value="${t.result||''}" placeholder="0,00" ${dis}>
        </div>
        <div class="task-field full">
          <label>Observações</label>
          <textarea data-field="notes" placeholder="Anotações..." ${dis}>${escapeHtml(t.notes||'')}</textarea>
        </div>
      </div>

      <div class="attachments" id="task-modal-attachments-${t.id}">
        ${attachmentsInnerHTML(t, found.compId, edit)}
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-ghost" style="margin-right:auto" onclick="openHistory('${t.id}')">◔ Histórico</button>
      <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">${edit ? 'Cancelar' : 'Fechar'}</button>
      ${edit ? `<button class="btn btn-primary" id="btnSaveTask"
                 onclick="saveTaskModal('${found.compId}','${found.objective.id}','${t.id}', this)">Salvar</button>` : ''}
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
  } else if (edit && !t.description) {
    setTimeout(() => overlay.querySelector('[data-field="description"]')?.focus(), 100);
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
}
