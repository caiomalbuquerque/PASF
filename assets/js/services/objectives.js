/* assets/js/services/objectives.js */

async function updateSavings(compId, objId, value){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if (!o) return;

  // ✔ CORRIGIDO (optimistic)
  const oldSavings = o.monthlySavings;
  o.monthlySavings = +value || 0;
  updateObjectiveMetrics(objId, compId);

  const { error } = await window.db.from('objectives').update({ monthly_savings: +value || 0 }).eq('id', objId);
  if (error) {
    o.monthlySavings = oldSavings;
    updateObjectiveMetrics(objId, compId);
    showToast("Erro ao salvar economia.", "error");
    return;
  }
}

async function updateObjectiveTitle(compId, objId, value){
  const title = value.trim();
  if(!title) {
    showToast("O título não pode ser vazio.", "error");
    renderObjectives();
    return;
  }

  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if (!o) return;

  // ✔ CORRIGIDO (optimistic)
  const oldTitle = o.title;
  o.title = title;

  const { error } = await window.db.from('objectives').update({ title }).eq('id', objId);
  if (error) {
    o.title = oldTitle;
    showToast("Erro ao salvar nome do objetivo: " + error.message, "error");
    return;
  }
  showToast("Nome do objetivo atualizado!", "success");
}

async function deleteObjective(compId, objId){
  if(!confirm('Remover este objetivo e todas as suas tarefas?')) return;

  const backup = (state.objectives[compId]||[]).slice();
  state.objectives[compId] = (state.objectives[compId]||[]).filter(o => o.id !== objId);
  renderObjectivesListOnly();

  const { error } = await window.db.from('objectives').delete().eq('id', objId);
  if (error) {
    state.objectives[compId] = backup;
    renderObjectivesListOnly();
    showToast("Erro ao remover objetivo.", "error");
    return;
  }
  showToast("Objetivo removido.", "success");
}

async function createObjective(title, savings){
  const compId = Number(state.currentCompany);
  const tempId = 'temp_' + uid();

  // ✔ CORRIGIDO (optimistic): aparece IMEDIATAMENTE
  const optimistic = {
    id: tempId,
    company_id: compId,
    title: title,
    monthly_savings: savings || 0,
    monthlySavings: savings || 0,
    tasks: [],
    created_at: new Date().toISOString(),
    _pending: true
  };

  if(!state.objectives[compId]) state.objectives[compId] = [];
  state.objectives[compId].push(optimistic);
  renderObjectivesListOnly();

  const { data, error } = await window.db.from('objectives').insert([{
    company_id: compId,
    title: title,
    monthly_savings: savings || 0
  }]).select().single();

  if (error) {
    state.objectives[compId] = state.objectives[compId].filter(o => o.id !== tempId);
    renderObjectivesListOnly();
    showToast("Erro ao criar objetivo: " + error.message, "error");
    return;
  }

  const idx = state.objectives[compId].findIndex(o => o.id === tempId);
  if (idx >= 0) {
    state.objectives[compId][idx] = {
      ...data,
      monthlySavings: data.monthly_savings,
      tasks: [],
      created_at: data.created_at || new Date().toISOString()
    };
  }
  renderObjectivesListOnly();
  showToast("Objetivo criado com sucesso!", "success");
}

let draggedTaskId = null;

function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.target.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedTaskId = null;
}

function handleDragOver(e) {
  e.preventDefault(); 
  e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e, targetTaskId, objId, compId) {
  e.preventDefault();
  if (draggedTaskId === targetTaskId) return;

  const o = (state.objectives[compId] || []).find(x => x.id === objId);
  if (!o) return;

  const tasks = o.tasks;
  const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
  const targetIdx = tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIdx === -1 || targetIdx === -1) return;

  const [movedTask] = tasks.splice(draggedIdx, 1);
  tasks.splice(targetIdx, 0, movedTask);

  renderObjectivesListOnly();

  try {
    const updates = tasks.map((t, i) => {
      t.sort_order = i;
      return window.db.from('tasks').update({ sort_order: i }).eq('id', t.id);
    });
    await Promise.all(updates);
  } catch (err) {
    console.error("Erro ao reordenar:", err);
    showToast("Erro ao salvar a nova ordem das tarefas.", "error");
  }
}
