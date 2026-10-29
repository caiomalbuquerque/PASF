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

async function updateTask(compId, taskId, field, value){
  const found = findTask(taskId);
  if(!found) return;
  
  const oldValue = found.task[field];
  if(String(oldValue||'') === String(value||'')) return;
  
  const dbField = field === 'responsibleId' ? 'responsible_id' : 
                  field === 'startDate' ? 'start_date' : 
                  field === 'endDate' ? 'end_date' : field;

  const { error } = await window.db.from('tasks').update({ [dbField]: value || null }).eq('id', taskId);
  if (error) { alert("Erro ao salvar: " + error.message); return; }

  found.task[field] = value;
  
  if (field !== 'created_at' && field !== 'updated_at') {
    await window.db.from('audit_logs').insert([{
      task_id: taskId,
      user_id: state.currentUser.id,
      field_changed: FIELD_LABELS[field] || field,
      old_value: String(oldValue || ''),
      new_value: String(value || '')
    }]);
  }

  if(state.currentUser.gestorId && state.currentUser.gestorId !== state.currentUser.id){
    await window.db.from('notifications').insert([{
      user_id: state.currentUser.gestorId,
      message: `${state.currentUser.name} atualizou "${FIELD_LABELS[field]||field}" da tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId
    }]);
  }
  if(field === 'responsibleId' && value !== state.currentUser.id){
    await window.db.from('notifications').insert([{
      user_id: value,
      message: `Você foi atribuído(a) à tarefa "${found.task.description || '(sem descrição)'}"`,
      task_id: taskId
    }]);
  }

  renderObjectives();
}

async function addTask(compId, objId){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;
  
  const firstUser = state.users.find(u => u.companyId === Number(compId));
  
  const newTask = {
    objective_id: objId,
    description: '',
    responsible_id: firstUser?.id || null,
    status: 'A Iniciar'
  };

  const { data, error } = await window.db.from('tasks').insert([newTask]).select().single();
  if (error) { alert("Erro: " + error.message); return; }
  
  o.tasks.push({ ...data, responsibleId: data.responsible_id, startDate: data.start_date, endDate: data.end_date });
  renderObjectives();
  $(`obj-${objId}`)?.classList.add('open');
}

async function removeTask(compId, objId, taskId){
  if(!confirm('Remover esta tarefa?')) return;
  const { error } = await window.db.from('tasks').delete().eq('id', taskId);
  if (error) { alert("Erro ao remover: " + error.message); return; }
  
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(o) o.tasks = o.tasks.filter(t => t.id !== taskId);
  renderObjectives();
} // <--- ESTA CHAVE ESTAVA FALTANDO

async function addAttachments(compId, taskId, input){
  const found = findTask(taskId);
  if(!found) return;
  
  const files = Array.from(input.files || []);
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}/${uid()}.${fileExt}`;
    
    const { error: uploadError } = await window.db.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (uploadError) { alert("Erro no upload: " + uploadError.message); continue; }

    const { data, error } = await window.db.from('task_attachments').insert([{
      task_id: taskId,
      file_name: file.name,
      file_path: fileName,
      uploaded_by: state.currentUser.id
    }]).select().single();

    if (!error) {
      found.task.attachments = found.task.attachments || [];
      found.task.attachments.push({ id: data.id, name: data.file_name, path: data.file_path });
    }
  }
  input.value = '';
  renderObjectives();
}

async function removeAttachment(compId, taskId, attachId){
  const found = findTask(taskId);
  if(!found) return;
  
  const attach = found.task.attachments.find(a => a.id === attachId);
  
  if(attach?.path) {
    await window.db.storage.from('task-attachments').remove([attach.path]);
  }
  await window.db.from('task_attachments').delete().eq('id', attachId);
  
  found.task.attachments = found.task.attachments.filter(a => a.id !== attachId);
  renderObjectives();
}
