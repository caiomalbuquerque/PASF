/* assets/js/services/objectives.js */

async function updateSavings(compId, objId, value){
  const { error } = await window.db.from('objectives').update({ monthly_savings: +value || 0 }).eq('id', objId);
  if (error) { showToast("Erro ao salvar economia.", "error"); return; }
  
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(o) o.monthlySavings = +value || 0;
  renderObjectivesListOnly();
}

async function deleteObjective(compId, objId){
  if(!confirm('Remover este objetivo e todas as suas tarefas?')) return;
  const { error } = await window.db.from('objectives').delete().eq('id', objId);
  if (error) { showToast("Erro ao remover objetivo.", "error"); return; }
  
  state.objectives[compId] = (state.objectives[compId]||[]).filter(o => o.id !== objId);
  renderObjectivesListOnly();
}

async function createObjective(title, savings){
  const { data, error } = await window.db.from('objectives').insert([{
    company_id: Number(state.currentCompany),
    title: title,
    monthly_savings: savings || 0
  }]).select().single();
  
  if (error) { showToast("Erro ao criar objetivo.", "error"); return; }
  
  if(!state.objectives[state.currentCompany]) state.objectives[state.currentCompany] = [];
  state.objectives[state.currentCompany].push({ ...data, monthlySavings: data.monthly_savings, tasks: [] });
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
