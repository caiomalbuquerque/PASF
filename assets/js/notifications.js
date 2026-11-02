/* assets/js/notifications.js */

function renderNotificationsBadge(){
  const badge = $('bellBadge');
  if(!badge) return;
  const count = state.notifications
    .filter(n => String(n.userId) === String(state.currentUser.id) && !n.read)
    .length;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function toggleNotifications(ev){
  ev?.stopPropagation();
  const existing = document.querySelector('.notif-panel');
  if(existing){ existing.remove(); $('bellBtn').classList.remove('active'); return; }

  const u = state.currentUser;
  const myNotifs = state.notifications
    .filter(n => String(n.userId) === String(u.id))
    .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));

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
  const { error } = await window.db.from('notifications')
    .update({ is_read: true })
    .eq('user_id', state.currentUser.id)
    .eq('is_read', false);

  if (error) console.error('Erro ao marcar todas como lidas no banco:', error);

  state.notifications.forEach(n => {
    if(String(n.userId) === String(state.currentUser.id)) n.read = true;
  });

  renderNotificationsBadge();
  document.querySelector('.notif-panel')?.remove();
  $('bellBtn').classList.remove('active');
}

async function openNotif(notifId){
  const n = state.notifications.find(x => String(x.id) === String(notifId));
  if(!n) return;

  if (!n.read) {
    const { error } = await window.db.from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    if (error) console.error('Erro ao marcar notificação como lida:', error);
    n.read = true;
  }

  renderNotificationsBadge();
  document.querySelector('.notif-panel')?.remove();
  $('bellBtn').classList.remove('active');

  if(!n.taskId) return;

  const found = findTask(n.taskId);
  if(!found) return;

  // Troca a empresa ativa se necessário
  if(String(state.currentCompany) !== String(found.compId)){
    state.currentCompany = found.compId;
  }
  renderTopbar();

  // Navega para Objetivos → detalhe do objetivo da tarefa
  showView('objetivos');
  state.currentObjective = found.objective.id;
  renderObjectives();

  // Espera o DOM pintar antes de abrir / destacar a tarefa
  setTimeout(() => {
    const taskEl = $(`task-${n.taskId}`);
    if(taskEl && !taskEl.classList.contains('open')) toggleTask(n.taskId);

    taskEl?.scrollIntoView({behavior:'smooth', block:'center'});

    if (n.targetField) {
      setTimeout(() => {
        const targetInput = taskEl?.querySelector(`[data-field="${n.targetField}"]`);
        if (targetInput) {
          targetInput.focus();
          targetInput.classList.add('pulse-highlight');
          setTimeout(() => targetInput.classList.remove('pulse-highlight'), 3500);
        }
      }, 350);
    }
  }, 150);
}
