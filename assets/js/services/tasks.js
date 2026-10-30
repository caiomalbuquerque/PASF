/* assets/js/services/tasks.js */

function effectiveStatus(task){
  if(task.status === 'Concluída' || task.status === 'Cancelada') return task.status;
  if(task.endDate){
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(task.endDate + 'T00:00:00');
    if(end < today) return 'Atrasada';
  }
  return task.status;
}

function findTask(taskId){
  for(const compId in state.objectives){
    for(const o of state.objectives[compId]){
      const t = o.tasks.find(x => x.id === taskId);
      if(t) return { compId, objective:o, task:t };
    }
  }
  return null;
}

function refreshObjectiveDOM(objId, compId) {
  const o = (state.objectives[compId] || []).find(x => x.id === objId);
  if (!o) return;

  const allTasks = o.tasks;
  const done = allTasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const late = allTasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const totalCost = allTasks.reduce((s,t) => s + (+t.cost||0), 0);
  const totalResult = allTasks.reduce((s,t) => s + (+t.result||0), 0);
  const net = totalResult - totalCost;

  const metaEl = $(`meta-${objId}`);
  if (metaEl) {
    metaEl.innerHTML = `
      <span>${allTasks.length} tarefa${allTasks.length!==1?'s':''}</span>
      <span>${done} concluída${done!==1?'s':''}</span>
      ${late ? `<span style="color:#991b1b;font-weight:600">${late} em atraso</span>` : ''}
    `;
  }

  const totalsEl = $(`totals-${objId}`);
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div class="t"><span class="label">Custo total</span><span class="value">${fmtBRL(totalCost)}</span></div>
      <div class="t"><span class="label">Resultado atingido</span><span class="value pos">${fmtBRL(totalResult)}</span></div>
      <div class="t"><span class="label">Saldo</span><span class="value ${net>=0?'pos':'neg'}">${fmtBRL(net)}</span></div>
    `;
  }
}

async function updateTask(compId, taskId, field, value){
  const found = findTask(taskId);
  if(!found) return;
  
  const oldValue = found.task[field];
  if(String(oldValue||'') === String(value||'')) return;
  
  const dbField = field === 'responsibleId' ? 'responsible_id' : 
                  field === 'startDate' ? 'start_date' : 
                  field === 'endDate' ? 'end_date' : field;

  const { error } = await window.db.from('tasks').update({ [dbField]: value || null }).eq('id', taskId);
  if (error) { showToast("Erro ao salvar tarefa: " + error.message, "error"); return; }

  found.task[field] = value;
  
  if (field !== 'created_at' && field !== 'updated_at') {
    const { data: logData, error: logErr } = await window.db.from('audit_logs').insert([{
      task_id: taskId,
      user_id: state.currentUser.id,
      field_changed: FIELD_LABELS[field] || field,
      old_value: String(oldValue || ''),
      new_value: String(value || '')
    }]).select().single();
  
    if (logErr) {
      console.error('❌ Erro do Supabase ao salvar log:', logErr);
    } else if (logData) {
      state.auditLog.push({
        id: logData.id,
        taskId: logData.task_id,
        userId: logData.user_id,
        field: logData.field_changed,
        oldValue: logData.old_value,
        newValue: logData.new_value,
        timestamp: logData.created_at || new Date().toISOString()
      });
    }
  }

  if(state.currentUser.gestorId && state.currentUser.gestorId !== state.currentUser.id){
    await window.db.from('notifications').insert([{
      user_id: state.currentUser.gestorId,
      message: `${state.currentUser.name} atualizou "${FIELD_LABELS[field]||field}" da tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId,
      target_field: field
    }]);
  }

  if(field === 'responsibleId' && value !== state.currentUser.id){
    await window.db.from('notifications').insert([{
      user_id: value,
      message: `Você foi atribuído(a) à tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId,
      target_field: field
    }]);
  }

  if (field === 'description') {
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskCard) {
      const headerDesc = taskCard.querySelector('.task-header .desc');
      if (headerDesc) headerDesc.textContent = value || '(Nova tarefa sem descrição)';
    }
  }

  refreshObjectiveDOM(found.objective.id, compId);
  
  if (field === 'status' || field === 'endDate') {
      const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
      if (taskCard) {
          const statusLabel = taskCard.querySelector('.task-field:nth-child(4) label');
          if (statusLabel) {
              const eff = effectiveStatus(found.task);
              const autoLate = eff === 'Atrasada' && found.task.status !== 'Atrasada';
              statusLabel.innerHTML = `Status ${autoLate ? '<span class="late-badge">⚠ Atrasada</span>' : ''}`;
          }
      }
  }
}

async function addTask(compId, objId){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;
  
  const firstUser = state.users.find(u => u.companyId === Number(compId));
  const maxOrder = o.tasks.length > 0 ? Math.max(...o.tasks.map(t => t.sort_order || 0)) : 0;
  
  const newTask = {
    objective_id: objId,
    description: '',
    responsible_id: firstUser?.id || null,
    status: 'A Iniciar',
    sort_order: maxOrder + 1
  };

  const { data, error } = await window.db.from('tasks').insert([newTask]).select().single();
  if (error) { showToast("Erro ao criar tarefa.", "error"); return; }
  
  o.tasks.push({ ...data, responsibleId: data.responsible_id, startDate: data.start_date, endDate: data.end_date, attachments: [] });
  
  if(!state._openObjectives) state._openObjectives = [];
  if(!state._openObjectives.includes(String(objId))) state._openObjectives.push(String(objId));
  
  renderObjectivesListOnly(); 
}

async function removeTask(compId, objId, taskId){
  if(!confirm('Remover esta tarefa?')) return;
  const { error } = await window.db.from('tasks').delete().eq('id', taskId);
  if (error) { showToast("Erro ao remover tarefa.", "error"); return; }
  
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(o) o.tasks = o.tasks.filter(t => t.id !== taskId);
  
  renderObjectivesListOnly();
  showToast("Tarefa removida.", "success");
}

async function addAttachments(compId, taskId, input){
  const found = findTask(taskId);
  if(!found) return;
  
  const files = Array.from(input.files || []);
  if (files.length === 0) return;
  
  showToast("Fazendo upload...", "info");

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}/${uid()}.${fileExt}`;
    
    const { error: uploadError } = await window.db.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (uploadError) { 
      showToast("Erro no upload: " + uploadError.message, "error"); 
      continue; 
    }

    const { data, error } = await window.db.from('task_attachments').insert([{
      task_id: taskId,
      file_name: file.name,
      file_path: fileName,
      uploaded_by: state.currentUser.id
    }]).select().single();

    if (!error) {
      found.task.attachments = found.task.attachments || [];
      found.task.attachments.push({ id: data.id, name: data.file_name, path: data.file_path });
    } else {
      showToast("Erro ao salvar registro do anexo.", "error");
    }
  }
  input.value = '';
  renderObjectivesListOnly();
  showToast("Anexo(s) enviado(s)!", "success");
}

async function removeAttachment(compId, taskId, attachId){
  const found = findTask(taskId);
  if(!found) return;
  
  const attach = found.task.attachments.find(a => a.id === attachId);
  
  if(attach?.path) {
    await window.db.storage.from('task-attachments').remove([attach.path]);
  }
  const { error } = await window.db.from('task_attachments').delete().eq('id', attachId);
  if (error) { showToast("Erro ao deletar anexo.", "error"); return; }
  
  found.task.attachments = found.task.attachments.filter(a => a.id !== attachId);
  renderObjectivesListOnly();
  showToast("Anexo removido.", "success");
}

async function openAttachment(filePath) {
  if (!filePath) return;
  
  const { data, error } = await window.db.storage
    .from('task-attachments')
    .createSignedUrl(filePath, 60);

  if (error) {
    console.error("Erro ao gerar link do arquivo:", error);
    showToast("Não foi possível abrir o arquivo.", "error");
    return;
  }

  window.open(data.signedUrl, '_blank');
}
