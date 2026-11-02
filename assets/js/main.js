/* assets/js/main.js */

(async function bootstrapApp(){
  const user = await requireAuth();
  if(!user) return;

  (async function bootstrapApp(){
  const user = await requireAuth();
  if(!user) return;

  // ⭐ Listener global de sessão: expira → volta ao login automaticamente
  window.db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = 'index.html';
    }
  });

  const loadingEl = document.getElementById('loading-screen');
  const appEl = document.getElementById('app');

  try {

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

    // --- Tolerantes (não derrubam o app se a tabela/RLS falhar) ---
    let attachments = [];
    try {
      const { data, error } = await window.db.from('task_attachments').select('*');
      if (error) console.warn('Anexos indisponíveis:', error.message);
      else attachments = data || [];
    } catch (e) { console.warn('Anexos indisponíveis:', e); }

    let notifications = [];
    try {
      const { data, error } = await window.db.from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending:false });
      if (error) console.warn('Notificações indisponíveis:', error.message);
      else notifications = data || [];
    } catch (e) { console.warn('Notificações indisponíveis:', e); }

    let auditLogs = [];
    try {
      const { data, error } = await window.db.from('audit_logs')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error) auditLogs = data || [];
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
        .filter(t => String(t.objective_id) === String(obj.id))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || new Date(a.created_at) - new Date(b.created_at))
        .map(t => {
          const taskAtts = (attachments || [])
            .filter(a => String(a.task_id) === String(t.id))
            .map(a => ({ id: a.id, name: a.file_name, path: a.file_path }));

          return { ...t, responsibleId: t.responsible_id, startDate: t.start_date, endDate: t.end_date, attachments: taskAtts };
        });

      state.objectives[obj.company_id].push({
        ...obj,
        monthlySavings: obj.monthly_savings,
        tasks: objTasks
      });
    });

    state.currentUser = user;

    // Empresa padrão: prioriza a do usuário, senão a primeira ACESSÍVEL (não inativa)
    const isGlobalUser = user.role === 'admin' || user.role.startsWith('global_');
    const accessible = isGlobalUser
      ? state.companies.filter(c => c.is_active !== false)
      : state.companies.filter(c => String(c.id) === String(user.companyId));
    state.currentCompany = user.companyId || accessible[0]?.id || null;

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

// ---------------- Realtime ----------------
let realtimeRenderTimeout;
let realtimeObjTimeout;

function scheduleTaskRender(){
  clearTimeout(realtimeRenderTimeout);
  realtimeRenderTimeout = setTimeout(() => {
    const activeView = document.querySelector('.nav-item.active')?.dataset.view;
    if (activeView === 'objetivos')     renderObjectives();
    else if (activeView === 'dashboard') renderDashboard();
    else if (activeView === 'minhas')    renderMyTasks();
  }, 150);
}

function scheduleObjRender(){
  clearTimeout(realtimeObjTimeout);
  realtimeObjTimeout = setTimeout(() => {
    const activeView = document.querySelector('.nav-item.active')?.dataset.view;
    if (activeView === 'objetivos')     renderObjectives();
    else if (activeView === 'dashboard') renderDashboard();
    else if (activeView === 'minhas')    renderMyTasks();
  }, 150);
}

function findCompanyOfObjective(objId){
  for (const compId in state.objectives) {
    if (state.objectives[compId].some(o => String(o.id) === String(objId))) return compId;
  }
  return null;
}

function initRealtime(){
  // 1. Notificações
  window.db.channel(`notifs:${state.currentUser.id}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${state.currentUser.id}` }, payload => {
      const n = payload.new;
      state.notifications.unshift({
        id: n.id, userId: n.user_id, taskId: n.task_id,
        message: n.message, read: n.is_read, createdAt: n.created_at, targetField: n.target_field
      });
      renderNotificationsBadge();
      showToast("Nova notificação recebida!", "info");
    })
    .subscribe();

  // 2. Tarefas (INSERT / UPDATE / DELETE)
  window.db.channel('tasks_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
      const evType = payload.eventType;

      if (evType === 'INSERT' || evType === 'UPDATE') {
        const updatedTask = payload.new;
        const objId  = updatedTask.objective_id;
        const compId = findCompanyOfObjective(objId);
        if (!compId) return;

        if (!state.objectives[compId]) state.objectives[compId] = [];
        const o = state.objectives[compId].find(x => String(x.id) === String(objId));
        if (!o) return;

        const idx = o.tasks.findIndex(t => String(t.id) === String(updatedTask.id));
        const mapped = {
          ...updatedTask,
          responsibleId: updatedTask.responsible_id,
          startDate: updatedTask.start_date,
          endDate: updatedTask.end_date
        };

        if (idx !== -1) {
          o.tasks[idx] = { ...o.tasks[idx], ...mapped };
        } else {
          o.tasks.push({ ...mapped, attachments: [] });
        }

        o.tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        scheduleTaskRender();

      } else if (evType === 'DELETE') {
        const removedId = payload.old?.id;
        if (!removedId) return;
        Object.keys(state.objectives).forEach(compId => {
          state.objectives[compId].forEach(o => {
            o.tasks = o.tasks.filter(t => String(t.id) !== String(removedId));
          });
        });
        scheduleTaskRender();
      }
    })
    .subscribe();

  // 3. Objetivos (INSERT / UPDATE / DELETE)
  window.db.channel('objectives_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'objectives' }, payload => {
      const evType = payload.eventType;

      if (evType === 'INSERT' || evType === 'UPDATE') {
        const obj = payload.new;
        const compId = obj.company_id;
        if (!state.objectives[compId]) state.objectives[compId] = [];

        const idx = state.objectives[compId].findIndex(o => String(o.id) === String(obj.id));
        if (idx !== -1) {
          state.objectives[compId][idx] = {
            ...state.objectives[compId][idx],
            title: obj.title,
            monthlySavings: obj.monthly_savings
          };
        } else {
          state.objectives[compId].push({
            ...obj,
            monthlySavings: obj.monthly_savings,
            tasks: []
          });
        }
        scheduleObjRender();

      } else if (evType === 'DELETE') {
        const removedId = payload.old?.id;
        if (!removedId) return;

        Object.keys(state.objectives).forEach(compId => {
          state.objectives[compId] = state.objectives[compId]
            .filter(o => String(o.id) !== String(removedId));
        });
        if (state.currentObjective && String(state.currentObjective) === String(removedId)) {
          state.currentObjective = null;
        }
        scheduleObjRender();
      }
    })
    .subscribe();
}
