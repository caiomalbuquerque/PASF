function renderNotificationsBadge(){
  const badge = $('bellBadge');
  if(!badge) return;
  const count = state.notifications.filter(n => n.userId === state.currentUser.id && !n.read).length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function toggleNotifications(ev){
  ev?.stopPropagation();
  const existing = document.querySelector('.notif-panel');
  if(existing){ existing.remove(); $('bellBtn').classList.remove('active'); return; }
  const u = state.currentUser;
  const myNotifs = state.notifications
    .filter(n => n.userId === u.id)
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.onclick = e => e.stopPropagation();
  panel.innerHTML = `
    <div class="notif-header">
      <h4>Notificações</h4>
      ${myNotifs.some(n => !n.read) ? `<button onclick="markAllRead()">Marcar todas como lidas</button>` : ''}
    </div>
    <div class="notif-list">
      ${myNotifs.length ? myNotifs.map(n => `
        <div class="notif-item ${n.read?'read':'unread'}" onclick="openNotif('${n.id}')">
          <div class="dot"></div>
          <div>
            <div class="msg">${escapeHtml(n.message)}</div>
            <div class="time">${fmtDateTime(n.createdAt)}</div>
          </div>
        </div>`).join('') : '<div class="notif-empty">Nenhuma notificação.</div>'}
    </div>`;
  document.body.appendChild(panel);
  $('bellBtn').classList.add('active');

  setTimeout(() => {
    document.addEventListener('click', function close(e){
      if(!e.target.closest('.notif-panel') && !e.target.closest('#bellBtn')){
        document.querySelector('.notif-panel')?.remove();
        $('bellBtn').classList.remove('active');
        document.removeEventListener('click', close);
      }
    });
  }, 0);
}

async function markAllRead(){
  // 1. Atualiza no Supabase todas as notificações não lidas deste usuário
  const { error } = await window.db.from('notifications')
    .update({ is_read: true })
    .eq('user_id', state.currentUser.id)
    .eq('is_read', false);

  if (error) {
    console.error('Erro ao marcar todas como lidas no banco:', error);
  }

  // 2. Atualiza o estado local
  state.notifications.forEach(n => { 
    if(n.userId === state.currentUser.id) n.read = true; 
  });
  
  // 3. Atualiza a UI
  renderNotificationsBadge();
  document.querySelector('.notif-panel')?.remove();
  $('bellBtn').classList.remove('active');
}

function openNotif(notifId){
  const n = state.notifications.find(x => x.id === notifId);
  if(!n) return;
  n.read = true;
  saveState();
  renderNotificationsBadge();
  document.querySelector('.notif-panel')?.remove();
  $('bellBtn').classList.remove('active');
  if(n.taskId){
    const found = findTask(n.taskId);
    if(found){
      state.currentCompany = found.compId;
      $('companySelect').value = found.compId;
      showView('objetivos');
      setTimeout(() => {
        $(`obj-${found.objective.id}`)?.classList.add('open');
        document.querySelector(`[data-task-id="${n.taskId}"]`)?.scrollIntoView({behavior:'smooth', block:'center'});
      }, 60);
    }
  }
}
