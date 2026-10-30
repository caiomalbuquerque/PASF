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

    const { data: objectives, error: errObj } = await window.db.from('objectives').select('*');
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
    state.currentCompany = (user.companyId ? user.companyId : state.companies[0]?.id) || null;

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

function initRealtime(){
  // 1. Canal de Notificações
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

  // 2. Canal de Tarefas (Sincronização em Tempo Real)
  window.db.channel('tasks_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
      if (payload.eventType === 'DELETE') return;
      
      const updatedTask = payload.new;
      const found = findTask(updatedTask.id);
      
      // Log de debug no console de quem está RECEBENDO (o Gestor no Opera Air)
      console.log("🔔 Realtime no Gestor:", updatedTask.status, "| Tarefa encontrada?", !!found);
      
      if (found) {
        // Atualiza o state local com os dados novos que chegaram do banco
        found.task = {
          ...found.task,
          ...updatedTask,
          responsibleId: updatedTask.responsible_id,
          startDate: updatedTask.start_date,
          endDate: updatedTask.end_date
        };
        
        // Descobre qual tela o Gestor está vendo agora
        const activeView = document.querySelector('.nav-item.active')?.dataset.view;
        
        // Força a atualização da tela
        if (activeView === 'objetivos') {
          renderObjectivesListOnly();
        } else if (activeView === 'dashboard') {
          renderDashboard();
        } else if (activeView === 'minhas') {
          renderMyTasks();
        }
      }
    })
    .subscribe();
}
