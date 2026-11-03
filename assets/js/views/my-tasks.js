/* assets/js/views/my-tasks.js */

function renderMyTasks(){
  const el = $('view-minhas');
  const u = state.currentUser;
  const comps = accessibleCompanies();
  
  // Agrupa as tarefas por Empresa e Objetivo para ficar organizado
  let htmlContent = '';

  comps.forEach(comp => {
    const objs = state.objectives[comp.id] || [];
    let compHtml = '';

    objs.forEach(o => {
      const myTasks = o.tasks.filter(t => String(t.responsibleId) === String(u.id));
      
      if (myTasks.length > 0) {
        compHtml += `
          <div style="margin-top: 20px; margin-bottom: 10px;">
            <h3 style="font-size: 14px; font-weight: 700; color: var(--gray-600); text-transform: uppercase; letter-spacing: .05em; padding-bottom: 6px; border-bottom: 2px solid var(--gray-200);">
              ${escapeHtml(o.title)}
            </h3>
          </div>
          ${myTasks.map(t => taskHTML(t, comp.id, o.id)).join('')}
        `;
      }
    });

    if (compHtml) {
      htmlContent += `
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 18px; font-weight: 700; color: var(--gray-800); margin-bottom: 8px;">${escapeHtml(comp.name)}</h2>
          ${compHtml}
        </div>
      `;
    }
  });

  if (!htmlContent) {
    htmlContent = `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
      Nenhuma tarefa atribuída a você no momento.
    </div></div>`;
  }

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Minhas tarefas</h1>
        <p>Clique em uma tarefa para visualizar os detalhes ou editar.</p>
      </div>
    </div>
    <div>
      ${htmlContent}
    </div>
  `;
}
