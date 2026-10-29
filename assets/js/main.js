/* assets/js/main.js */

(async function bootstrapApp(){
  // 1. Verifica se o usuário está logado
  const user = await requireAuth();
  if(!user) return;

  const loadingEl = document.getElementById('loading-screen');
  const appEl = document.getElementById('app');

  try {
    // 2. Carrega Empresas
    const { data: companies, error: errComp } = await window.db.from('companies').select('*');
    if (errComp) throw new Error(`Erro em Empresas: ${errComp.message}`);

    // 3. Carrega Usuários
    const { data: profiles, error: errProf } = await window.db.from('profiles').select('*');
    if (errProf) throw new Error(`Erro em Usuários: ${errProf.message}`);

    // 4. Carrega Objetivos
    const { data: objectives, error: errObj } = await window.db.from('objectives').select('*');
    if (errObj) throw new Error(`Erro em Objetivos: ${errObj.message}`);

    // 5. Carrega Tarefas
    const { data: tasks, error: errTasks } = await window.db.from('tasks').select('*');
    if (errTasks) throw new Error(`Erro em Tarefas: ${errTasks.message}`);

    // 6. Carrega Notificações
    const { data: notifications, error: errNotif } = await window.db.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', {ascending:false});
    if (errNotif) throw new Error(`Erro em Notificações: ${errNotif.message}`);

    // Reconstrói o estado em memória
    state.companies = companies || [];
    state.users = profiles || [];
    state.auditLog = []; 
    state.notifications = (notifications || []).map(n => ({
      ...n, userId: n.user_id, taskId: n.task_id, read: n.is_read, createdAt: n.created_at
    }));
    
    // Agrupa objetivos e tarefas
    state.objectives = {};
    state.companies.forEach(c => { state.objectives[c.id] = []; });
    
    (objectives || []).forEach(obj => {
      if (!state.objectives[obj.company_id]) state.objectives[obj.company_id] = [];
      
      const objTasks = (tasks || []).filter(t => t.objective_id === obj.id).map(t => ({
        ...t, 
        responsibleId: t.responsible_id, 
        startDate: t.start_date, 
        endDate: t.end_date,
        attachments: [] // Anexos podem ser carregados sob demanda no futuro
      }));
      
      state.objectives[obj.company_id].push({
        ...obj, monthlySavings: obj.monthly_savings, tasks: objTasks
      });
    });

    // Atualiza estado global
    state.currentUser = user;
    state.currentCompany = (user.company_id ? user.company_id : state.companies[0]?.id) || null;

    // Esconde a tela de loading e mostra o app
    if (loadingEl) loadingEl.style.display = 'none';
    if (appEl) appEl.classList.remove('hidden');
    
    renderSidebar();
    renderTopbar();
    renderCompanySelector();
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
        id: n.id, userId: n.user_id, taskId: n.task_id, message: n.message, read: n.is_read, createdAt: n.created_at
      });
      renderNotificationsBadge();
    })
    .subscribe();
}
