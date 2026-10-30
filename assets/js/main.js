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
      if (errAudit) {
        console.warn('Audit logs indisponíveis (não bloqueante):', errAudit.message);
      } else {
        auditLogs = data || [];
      }
    } catch (e) {
      console.warn('Falha ao carregar audit_logs:', e);
    }

    // Reconstrói o estado em memória mapeando snake_case -> camelCase
    state.companies = companies || [];
    
    state.users = (profiles || []).map(p => ({
      ...p,
      companyId: p.company_id,
      gestorId: p.manager_id
    }));

    state.auditLog = (auditLogs || []).map(a => ({
      id: a.id,
      taskId: a.task_id,
      userId: a.user_id,
      field: a.field_changed,
      oldValue: a.old_value,
      newValue: a.new_value,
      timestamp: a.created_at
    }));
    state.notifications = (notifications || []).map(n => ({
      ...n, userId: n.user_id, taskId: n.task_id, read: n.is_read, createdAt: n.created_at, targetField: n.target_field
    }));
    
    // Agrupa objetivos e tarefas
    state.objectives = {};
    state.companies.forEach(c => { state.objectives[c.id] = []; });
    
    (objectives || []).forEach(obj => {
      if (!state.objectives[obj.company_id]) state.objectives[obj.company_id] = [];
      
      // ORDENAÇÃO AQUI: Pega as tarefas, ordena pelo sort_order e depois por data
      // ORDENAÇÃO AQUI: Pega as tarefas, ordena pelo sort_order e depois por data
      const objTasks = (tasks || [])
        .filter(t => t.objective_id === obj.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at) - new Date(b.created_at))
        .map(t => {
          // Busca os anexos desta tarefa específica
          const taskAtts = (attachments || [])
            .filter(a => a.task_id === t.id)
            .map(a => ({ id: a.id, name: a.file_name, path: a.file_path }));

          return {
            ...t, 
            responsibleId: t.responsible_id, 
            startDate: t.start_date, 
            endDate: t.end_date,
            attachments: taskAtts // Agora ele puxa os anexos reais
          };
        });
      
      state.objectives[obj.company_id].push({
        ...obj, monthlySavings: obj.monthly_savings, tasks: objTasks
      });
    });

    state.currentUser = user;
    // Usa o companyId mapeado no login
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
    alert("Falha ao carregar dados:\n\n" + error.message);
  }
})();

/* Realtime - Notificações */
function initRealtime(){
  window.db.channel('custom-all-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${state.currentUser.id}` }, payload => {
      const n = payload.new;
      state.notifications.unshift({
        id: n.id, userId: n.user_id, taskId: n.task_id, message: n.message, read: n.is_read, createdAt: n.created_at, targetField: n.target_field
      });
      renderNotificationsBadge();
    })
    .subscribe();

}
