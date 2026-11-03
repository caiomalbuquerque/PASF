/* assets/js/main.js */

(async function bootstrapApp(){
  const user = await requireAuth();
  if(!user) return;

  const loadingEl = document.getElementById('loading-screen');
  const appEl = document.getElementById('app');

  try {
    const { data: companies, error: errComp } = await window.db.from('companies').select('*');
    if (errComp) throw new Error(`Erro em Empresas: ${errComp.message}`);

    const { data: profiles, error: errProf } = await window.db.from('profiles').select('*');
    if (errProf) throw new Error(`Erro em Usuários: ${errProf.message}`);

    const { data: objectives, error: errObj } = await window.db.from('objectives').select('*').order('created_at', { ascending: true });
    if (errObj) throw new Error(`Erro em Objetivos: ${errObj.message}`);

    const { data: tasks, error: errTasks } = await window.db.from('tasks').select('*');
    if (errTasks) throw new Error(`Erro em Tarefas: ${errTasks.message}`);

    const { data: attachments, error: errAtt } = await window.db.from('task_attachments').select('*');
    if (errAtt) throw new Error(`Erro em Anexos: ${errAtt.message}`);

    const { data: notifications, error: errNotif } = await window.db.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', {ascending:false});
    if (errNotif) throw new Error(`Erro em Notificações: ${errNotif.message}`);

    let auditLogs = [];
    try {
      const { data, error: errAudit } = await window.db.from('audit_logs')
        .select('*')
        .order('created_at', { ascending: true });
      if (!errAudit) auditLogs = data || [];
    } catch (e) { console.warn('Audit logs indisponíveis:', e); }

    state.companies = companies || [];
    
    state.users = (profiles || []).map(p => ({
      ...p,
      companyId: p.company_id,
      gestorId: p.manager_id
    }));

    state.auditLog = (auditLogs || []).map(a => ({
      id: a.id, taskId: a.task_id, userId: a.user_id, field: a.field_changed,
      oldValue: a.old_value, newValue: a.new_value, timestamp: a.created_at
    }));
    
    state.notifications = (notifications || []).map(n => ({
      ...n, userId: n.user_id, taskId: n.task_id, read: n.is_read, createdAt: n.created_at, targetField: n.target_field
    }));
    
    state.objectives = {};
    state.companies.forEach(c => { state.objectives[c.id] = []; });
    
    (objectives || []).forEach(obj => {
      if (!state.objectives[obj.company_id]) state.objectives[obj.company_id] = [];
      
      const objTasks = (tasks || [])
        .filter(t => t.objective_id === obj.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at) - new Date(b.created_at))
        .map(t => {
          const taskAtts = (attachments || [])
            .filter(a => a.task_id === t.id)
            .map(a => ({ id: a.id, name: a.file_name, path: a.file_path }));

          return { ...t, responsibleId: t.responsible_id, startDate: t.start_date, endDate: t.end_date, attachments: taskAtts };
        });
      
      state.objectives[obj.company_id].push({ ...obj, monthlySavings: obj.monthly_savings, tasks: objTasks });
    });

    state.currentUser = user;
    const rawCompanyId = user.companyId ?? state.companies[0]?.id ?? null;
    state.currentCompany = rawCompanyId != null ? Number(rawCompanyId) : null;

    if (loadingEl) loadingEl.style.display = 'none';
    if (appEl) appEl.classList.remove('hidden');
    
    renderSidebar();
    renderTopbar();
    renderNotificationsBadge();
    initRealtime(); 
    
    showView('objetivos');

  } catch (error) {
    console.error("Erro detalhado:", error);
    if (loadingEl) loadingEl.style.display = 'none';
    showToast("Falha ao carregar dados: " + error.message, 'error');
  }
})();

let realtimeRenderTimeout;
let realtimeObjTimeout;

// ✔ NOVO: compara os campos relevantes de uma task local com o payload do banco
function taskValuesEqual(lt, dbTask){
  return String(lt.description || '')      === String(dbTask.description || '') &&
         String(lt.responsibleId || '')    === String(dbTask.responsible_id || '') &&
         String(lt.startDate || '')        === String(dbTask.start_date || '') &&
         String(lt.endDate || '')          === String(dbTask.end_date || '') &&
         String(lt.status || '')           === String(dbTask.status || '') &&
         String(lt.cost || '')             === String(dbTask.cost || '') &&
         String(lt.result || '')           === String(dbTask.result || '') &&
         String(lt.notes || '')            === String(dbTask.notes || '') &&
         String(lt.sort_order || 0)        === String(dbTask.sort_order || 0);
}

// ✔ NOVO: o usuário está com o cursor dentro de um card editável?
function userIsEditing(){
  const a = document.activeElement;
  if (!a) return false;
  if (a.closest && a.closest('.task-card.open, .objective-card')) return true;
  return false;
}

function initRealtime(){
  // 1. Notificações
  window.db.channel(`notifs:${state.currentUser.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${state.currentUser.id}` }, payload => {
      const n = payload.new;
      state.notifications.unshift({
        id: n.id, userId: n.user_id, taskId: n.task_id, message: n.message, read: n.is_read, createdAt: n.created_at, targetField: n.target_field
      });
      renderNotificationsBadge();
      showToast("Nova notificação recebida!", "info");
    })
    .subscribe();

  // 2. Tasks realtime — COM PROTEÇÃO CONTRA ECO PRÓPRIO
  window.db.channel('tasks_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
      if (payload.eventType === 'DELETE') return;
      
      const updatedTask = payload.new;

      // ✔ CORRIGIDO: se é eco da nossa própria edição, só atualiza métricas e sai.
      // Isso evita re-renderizar a tela inteira enquanto o usuário digita.
      const localFound = findTask(updatedTask.id);
      if (localFound && taskValuesEqual(localFound.task, updatedTask)) {
        updateObjectiveMetrics(localFound.objective.id, localFound.compId);
        return;
      }

      // ✔ CORRIGIDO: se o usuário está com foco em algum campo, NÃO re-renderiza.
      // Apenas atualiza o state em memória — o próximo render natural vai pegar.
      const isEditing = userIsEditing();

      let foundAny = false;
      Object.keys(state.objectives).forEach(compId => {
        state.objectives[compId].forEach(obj => {
          const taskIndex = obj.tasks.findIndex(t => String(t.id) === String(updatedTask.id));
          if (taskIndex !== -1) {
            foundAny = true;
            obj.tasks[taskIndex] = {
              ...obj.tasks[taskIndex],
              ...updatedTask,
              responsibleId: updatedTask.responsible_id,
              startDate: updatedTask.start_date,
              endDate: updatedTask.end_date
            };
            obj.tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          }
        });
      });

      if (!foundAny) return;

      clearTimeout(realtimeRenderTimeout);
      realtimeRenderTimeout = setTimeout(() => {
        if (isEditing) return; // ✔ respeita edição em curso

        const activeView = document.querySelector('.nav-item.active')?.dataset.view;
        const found = findTask(updatedTask.id);

        if (activeView === 'objetivos') {
          if (found) updateObjectiveMetrics(found.objective.id, found.compId);
          if (state.currentObjective && found && String(state.currentObjective) === String(found.objective.id)) {
            renderObjectives();
          }
        } else if (activeView === 'dashboard') {
          renderDashboard();
        } else if (activeView === 'minhas') {
          renderMyTasks();
        }
      }, 150);
    })
    .subscribe();

  // 3. Objectives realtime — COM PROTEÇÃO CONTRA ECO PRÓPRIO
  window.db.channel('objectives_realtime')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'objectives' }, payload => {
      const updatedObj = payload.new;
      
      Object.keys(state.objectives).forEach(compId => {
        const objIndex = state.objectives[compId].findIndex(o => String(o.id) === String(updatedObj.id));
        if (objIndex !== -1) {
          const localObj = state.objectives[compId][objIndex];

          // ✔ CORRIGIDO: eco da nossa própria edição → não re-renderiza
          const sameTitle   = String(localObj.title || '')          === String(updatedObj.title || '');
          const sameSavings = String(localObj.monthlySavings || 0)  === String(updatedObj.monthly_savings || 0);
          if (sameTitle && sameSavings) return;

          localObj.title = updatedObj.title;
          localObj.monthlySavings = updatedObj.monthly_savings;

          clearTimeout(realtimeObjTimeout);
          realtimeObjTimeout = setTimeout(() => {
            if (userIsEditing()) return;
            const activeView = document.querySelector('.nav-item.active')?.dataset.view;
            if (activeView === 'objetivos') renderObjectives();
          }, 150);
        }
      });
    })
    .subscribe();

  // 4. Canal de Status do Usuário (Para derrubar se for suspenso)
  window.db.channel(`user_status:${state.currentUser.id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${state.currentUser.id}` }, payload => {
      const updatedProfile = payload.new;
      
      // Se o status mudou para falso (suspenso), ou se o perfil mudou de ativo para inativo
      if (updatedProfile.is_active === false) {
        showToast("Sua conta foi suspensa pelo administrador.", "error");
        setTimeout(async () => {
          await window.db.auth.signOut();
          window.location.href = 'index.html';
        }, 2000);
      }
    })
    .subscribe();
  
}
