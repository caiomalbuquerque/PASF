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
      const t = o.tasks.find(x => String(x.id) === String(taskId));
      if(t) return { compId: Number(compId), objective:o, task:t };
    }
  }
  return null;
}

function refreshObjectiveDOM(objId, compId) {
  // Mantido por compatibilidade, mas a lógica atual usa renderObjectives() direto na view
}

async function updateTask(compId, taskId, field, value){
  const found = findTask(taskId);
  if(!found) return;

    // NOVA TRAVA DE SEGURANÇA
  if (state.currentUser.role === 'unique_user' && String(found.task.responsibleId) !== String(state.currentUser.id)) {
    showToast("Você não tem permissão para editar esta tarefa.", "error");
    return;
  }

  if (String(taskId).startsWith('temp_')) return;

  const oldValue = found.task[field];
  if(String(oldValue||'') === String(value||'')) return;

  found.task[field] = value;
  
  // Atualiza os cartões do objetivo (seja na lista ou no detalhe)
  if (state.currentObjective && String(state.currentObjective) === String(found.objective.id)) {
    renderObjectives(); 
  } else {
    updateObjectiveMetrics(found.objective.id, compId);
  }

  const dbField = field === 'responsibleId' ? 'responsible_id' :
                  field === 'startDate' ? 'start_date' :
                  field === 'endDate' ? 'end_date' : field;

  const { error } = await window.db.from('tasks').update({ [dbField]: value || null }).eq('id', taskId);

  if (error) {
    found.task[field] = oldValue;
    if (state.currentObjective && String(state.currentObjective) === String(found.objective.id)) renderObjectives();
    else updateObjectiveMetrics(found.objective.id, compId);
    showToast("Erro ao salvar tarefa: " + error.message, "error");
    return;
  }

  // Correção do Histórico: Adicionado .select().single() para devolver o registro criado
  if (field !== 'created_at' && field !== 'updated_at') {
    window.db.from('audit_logs').insert([{
      task_id: taskId,
      user_id: state.currentUser.id,
      field_changed: FIELD_LABELS[field] || field,
      old_value: String(oldValue || ''),
      new_value: String(value || '')
    }]).select().single().then(({data, error}) => {
      if (error) {
        console.error('❌ Erro ao salvar log:', error);
      } else if (data) {
        state.auditLog.push({
          id: data.id, 
          taskId, 
          userId: state.currentUser.id, 
          field: data.field_changed, 
          oldValue: data.old_value, 
          newValue: data.new_value, 
          timestamp: data.created_at
        });
      }
    });
  }

  if(state.currentUser.gestorId && state.currentUser.gestorId !== state.currentUser.id){
    window.db.from('notifications').insert([{
      user_id: state.currentUser.gestorId,
      message: `${state.currentUser.name} atualizou "${FIELD_LABELS[field]||field}" da tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId,
      target_field: field
    }]);
  }

  if(field === 'responsibleId' && value !== state.currentUser.id){
    window.db.from('notifications').insert([{
      user_id: value,
      message: `Você foi atribuído(a) à tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId,
      target_field: field
    }]);
  }
}

async function addTask(compId, objId){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;

  const firstUser = state.users.find(u => Number(u.companyId) === Number(compId));
  const maxOrder = o.tasks.length > 0 ? Math.max(...o.tasks.map(t => t.sort_order || 0)) : 0;

  const tempId = 'temp_' + uid();
  const tempTask = {
    id: tempId,
    objective_id: objId,
    description: '',
    responsibleId: firstUser?.id || null,
    status: 'A Iniciar',
    sort_order: maxOrder + 1,
    attachments: [],
    _pending: true
  };

  o.tasks.push(tempTask);
  renderObjectives();

  const { data, error } = await window.db.from('tasks').insert([{
    objective_id: objId,
    description: '',
    responsible_id: firstUser?.id || null,
    status: 'A Iniciar',
    sort_order: maxOrder + 1
  }]).select().single();

  if (error) {
    o.tasks = o.tasks.filter(t => t.id !== tempId);
    renderObjectives();
    showToast("Erro ao criar tarefa: " + error.message, "error");
    return;
  }

  const idx = o.tasks.findIndex(t => t.id === tempId);
  if (idx >= 0) {
    o.tasks[idx] = {
      ...data,
      responsibleId: data.responsible_id,
      startDate: data.start_date,
      endDate: data.end_date,
      attachments: []
    };
  }

  renderObjectives();
  openTaskModal(compId, objId, data.id);
}

async function removeTask(compId, objId, taskId){
  if(!confirm('Remover esta tarefa?')) return;
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;

  const backup = o.tasks.slice();
  o.tasks = o.tasks.filter(t => t.id !== taskId);

  renderObjectives();

  const { error } = await window.db.from('tasks').delete().eq('id', taskId);
  if (error) {
    o.tasks = backup;
    renderObjectives();
    showToast("Erro ao remover tarefa: " + error.message, "error");
    return;
  }
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
  refreshAttachmentsUI(taskId);
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
  refreshAttachmentsUI(taskId);
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
