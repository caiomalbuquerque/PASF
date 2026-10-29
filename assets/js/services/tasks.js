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

function updateTask(compId, taskId, field, value){
  const list = state.objectives[compId] || [];
  for(const o of list){
    const t = o.tasks.find(x => x.id === taskId);
    if(!t) continue;
    const oldValue = t[field];
    if(String(oldValue||'') === String(value||'')) return;
    t[field] = value;

    logChange(taskId, field, oldValue, value);

    const me = state.currentUser;
    // Notificar gestor quando um user altera algo
    if(me.gestorId && me.gestorId !== me.id){
      state.notifications.push({
        id: uid(), userId: me.gestorId, type:'task_edit',
        message: `${me.name} atualizou "${FIELD_LABELS[field]||field}" da tarefa "${t.description || '(sem descrição)'}"`,
        taskId, createdAt: nowIso(), read:false
      });
    }
    // Notificar novo responsável
    if(field === 'responsibleId' && value !== me.id){
      state.notifications.push({
        id: uid(), userId: value, type:'task_assigned',
        message: `Você foi atribuído(a) à tarefa "${t.description || '(sem descrição)'}"`,
        taskId, createdAt: nowIso(), read:false
      });
    }
    saveState();
    renderNotificationsBadge();
    renderObjectives();
    return;
  }
}

function addTask(compId, objId){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;
  const firstUser = state.users.find(u => u.companyId === compId);
  o.tasks.push({
    id: uid(), description:'', responsibleId: firstUser?.id || '',
    startDate:'', endDate:'', status:'A Iniciar', cost:'', result:'', notes:'', attachments:[]
  });
  saveState();
  renderObjectives();
  $(`obj-${objId}`)?.classList.add('open');
}

function removeTask(compId, objId, taskId){
  if(!confirm('Remover esta tarefa?')) return;
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;
  o.tasks = o.tasks.filter(t => t.id !== taskId);
  saveState();
  renderObjectives();
}

function addAttachments(compId, taskId, input){
  const found = findTask(taskId);
  if(!found) return;
  Array.from(input.files || []).forEach(f => {
    found.task.attachments = found.task.attachments || [];
    found.task.attachments.push({
      id: uid(), name: f.name, size: f.size,
      uploadedAt: nowIso(), uploadedBy: state.currentUser.id
    });
  });
  input.value = '';
  saveState();
  renderObjectives();
}

function removeAttachment(compId, taskId, attachId){
  const found = findTask(taskId);
  if(!found) return;
  found.task.attachments = (found.task.attachments||[]).filter(a => a.id !== attachId);
  saveState();
  renderObjectives();
}