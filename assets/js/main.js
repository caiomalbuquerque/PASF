/* assets/js/main.js */

(async function bootstrapApp(){
  const user = await requireAuth();
  if(!user) return;

  // Mostra tela de loading no app
  document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:#6b7280">Carregando dados do PASF...</div>';

  try {
    // 1. Carrega Empresas
    const { data: companies } = await window.db.from('companies').select('*');
    
    // 2. Carrega Usuários (a RLS já filtra o que o usuário pode ver)
    const { data: profiles } = await window.db.from('profiles').select('*');
    
    // 3. Carrega Objetivos
    const { data: objectives } = await window.db.from('objectives').select('*');
    
    // 4. Carrega Tarefas
    const { data: tasks } = await window.db.from('tasks').select('*');
    
    // 5. Carrega Notificações
    const { data: notifications } = await window.db.from('notifications').select('*').eq('user_id', user.id).order('created_at', {ascending:false});

    // Reconstrói o estado em memória (substituindo o mock)
    state.companies = companies || [];
    state.users = profiles || [];
    state.auditLog = []; // Opcional carregar sob demanda
    state.notifications = (notifications || []).map(n => ({
      ...n, id: n.id, userId: n.user_id, taskId: n.task_id, read: n.is_read, createdAt: n.created_at
    }));
    
    // Agrupa objetivos e tarefas
    state.objectives = {};
    state.companies.forEach(c => { state.objectives[c.id] = []; });
    
    (objectives || []).forEach(obj => {
      if (!state.objectives[obj.company_id]) state.objectives[obj.company_id] = [];
      
      const objTasks = (tasks || []).filter(t => t.objective_id === obj.id).map(t => ({
        ...t, responsibleId: t.responsible_id, startDate: t.start_date, endDate: t.end_date
      }));
      
      state.objectives[obj.company_id].push({
        ...obj, monthlySavings: obj.monthly_savings, tasks: objTasks
      });
    });

    // Atualiza estado global
    state.currentUser = user;
    state.currentCompany = (user.company_id ? user.company_id : state.companies[0]?.id) || null;

    // Remove a tela de loading e redesenha o app
    document.body.innerHTML = document.getElementById('app-template').innerHTML;
    
    renderSidebar();
    renderTopbar();
    renderCompanySelector();
    renderNotificationsBadge();
    initRealtime(); // Inicia tempo real
    
    showView('objetivos');

  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar os dados do banco.");
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
