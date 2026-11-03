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

async function updateTask(compId, taskId, field, value){
  const found = findTask(taskId);
  if(!found) return;

  if (state.currentUser.role === 'unique_user' && String(found.task.responsibleId) !== String(state.currentUser.id)) {
    showToast("Você não tem permissão para editar esta tarefa.", "error");
    return;
  }

  if (String(taskId).startsWith('temp_')) return;

  const oldValue = found.task[field];
  if(String(oldValue||'') === String(value||'')) return;

  found.task[field] = value;
  
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

  // --- LÓGICA DE NOTIFICAÇÕES COM DEBUG ---
  console.log("🔔 [DEBUG NOTIFICAÇÃO] Iniciando processo. Usuário atual:", state.currentUser.name, "| Role:", state.currentUser.role);
  
  const usersToNotify = new Set();

  // 1. Descobrir o ID do Gestor
  let managerId = state.currentUser.gestorId;
  console.log("🔔 [DEBUG] ID do Gestor vindo do state (memória):", managerId);
  
  if (!managerId && state.currentUser.role !== 'unique_collaborator' && state.currentUser.role !== 'admin' && state.currentUser.role !== 'global_collaborator') {
     console.log("🔔 [DEBUG] Não achou gestor no state. Buscando no banco de dados...");
     const { data: profile, error: profErr } = await window.db.from('profiles').select('manager_id').eq('id', state.currentUser.id).single();
     
     if (profErr) console.error("🔔 [DEBUG] Erro ao buscar perfil no banco:", profErr);
     
     if (profile && profile.manager_id) {
         managerId = profile.manager_id;
         console.log("🔔 [DEBUG] Gestor encontrado no banco:", managerId);
     } else if (state.currentUser.companyId) {
         console.log("🔔 [DEBUG] Sem gestor direto. Buscando gestor geral da empresa...");
         const { data: compManager, error: compErr } = await window.db.from('profiles').select('id').eq('company_id', state.currentUser.companyId).eq('role', 'unique_collaborator').limit(1).single();
         if (compErr) console.error("🔔 [DEBUG] Erro ao buscar gestor da empresa:", compErr);
         if (compManager) {
             managerId = compManager.id;
             console.log("🔔 [DEBUG] Gestor da empresa encontrado:", managerId);
         }
     }
  }
  
  if (managerId) {
      usersToNotify.add(managerId);
      console.log("🔔 [DEBUG] Gestor adicionado na lista de notificação.");
  } else {
      console.warn("🔔 [AVISO] Nenhum gestor foi encontrado para notificar.");
  }

  // 2. Notifica o novo responsável e o gestor dele (se houver troca)
  if (field === 'responsibleId' && value) {
    usersToNotify.add(value);
    const newResp = state.users.find(u => String(u.id) === String(value));
    if (newResp && newResp.gestorId) {
      usersToNotify.add(newResp.gestorId);
    }
  }

  usersToNotify.delete(state.currentUser.id); // Nunca notificar a si mesmo

  console.log("🔔 [DEBUG] Lista final de IDs que devem receber notificação:", Array.from(usersToNotify));

  // Dispara as notificações
  usersToNotify.forEach(targetId => {
    let msg = `${state.currentUser.name} atualizou "${FIELD_LABELS[field]||field}" da tarefa "${found.task.description || '(sem descrição)'}"`;
    if (field === 'responsibleId' && String(targetId) === String(value)) {
        msg = `Você foi atribuído(a) à tarefa "${found.task.description || '(sem descrição)'}"`;
    }

    console.log(`🔔 [DEBUG] Tentando enviar notificação para o ID ${targetId}: "${msg}"`);
    
    window.db.from('notifications').insert([{
      user_id: targetId,
      message: msg,
      task_id: taskId,
      target_field: field
    }]).then(({error}) => {
       if (error) {
         console.error("❌ [ERRO NOTIFICAÇÃO] O Supabase recusou a inserção:", error);
       } else {
         console.log(`✅ [SUCESSO] Notificação enviada para ${targetId}`);
       }
    });
  });
}
// ... (O restante do arquivo addTask, removeTask, etc. continua igual)
