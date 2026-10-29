function renderMyTasks(){
  const el = $('view-minhas');
  const u = state.currentUser;
  const comps = accessibleCompanies();
  const mine = [];
  comps.forEach(c => (state.objectives[c.id]||[]).forEach(o => o.tasks.forEach(t => {
    if(t.responsibleId === u.id) mine.push({ ...t, _obj: o.title, _comp: c.name, _compId: c.id });
  })));

  const html = mine.length
    ? mine.map(t => `
      <div class="task-card" style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--gray-500);margin-bottom:6px">${escapeHtml(t._comp)} › ${escapeHtml(t._obj)}</div>
        <div style="font-weight:600;color:var(--gray-800);margin-bottom:10px">${escapeHtml(t.description||'(sem descrição)')}</div>
        <div class="task-grid">
          <div class="task-field"><label>Início</label><div>${fmtDate(t.startDate)}</div></div>
          <div class="task-field"><label>Conclusão</label><div>${fmtDate(t.endDate)}</div></div>
          <div class="task-field"><label>Status</label>
            <div>${effectiveStatus(t)} ${effectiveStatus(t)==='Atrasada' && t.status!=='Atrasada' ? '<span class="late-badge">⚠ auto</span>' : ''}</div>
          </div>
          <div class="task-field"><label>Custo</label><div>${fmtBRL(t.cost)}</div></div>
          <div class="task-field"><label>Resultado</label><div>${fmtBRL(t.result)}</div></div>
          <div class="task-field full"><label>Observações</label>
            <textarea placeholder="Suas anotações..." ${can('editTask')?'':'disabled'}
                      onchange="updateTask('${t._compId}','${t.id}','notes',this.value)">${escapeHtml(t.notes||'')}</textarea>
          </div>
        </div>
        <div style="margin-top:10px">
          <button class="btn btn-sm btn-ghost" onclick="openHistory('${t.id}')">◔ Ver histórico</button>
        </div>
      </div>`).join('')
    : `<div class="panel"><div class="panel-body" style="text-align:center;padding:40px;color:var(--gray-500)">
        Nenhuma tarefa atribuída a você.</div></div>`;

  el.innerHTML = `<div class="page-header"><div><h1>Minhas tarefas</h1><p>Tarefas atribuídas a você.</p></div></div>${html}`;
}