/* assets/js/services/objectives.js */

async function updateSavings(compId, objId, value){
  const { error } = await window.db.from('objectives').update({ monthly_savings: +value || 0 }).eq('id', objId);
  if (error) return alert(error.message);
  
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(o) o.monthlySavings = +value || 0;
  renderObjectives();
}

async function deleteObjective(compId, objId){
  if(!confirm('Remover este objetivo e todas as suas tarefas?')) return;
  const { error } = await window.db.from('objectives').delete().eq('id', objId);
  if (error) return alert(error.message);
  
  state.objectives[compId] = (state.objectives[compId]||[]).filter(o => o.id !== objId);
  renderObjectives();
}

async function createObjective(title, savings){
  const { data, error } = await window.db.from('objectives').insert([{
    company_id: Number(state.currentCompany),
    title: title,
    monthly_savings: savings || 0
  }]).select().single();
  
  if (error) return alert("Erro ao criar: " + error.message);
  
  if(!state.objectives[state.currentCompany]) state.objectives[state.currentCompany] = [];
  state.objectives[state.currentCompany].push({ ...data, monthlySavings: data.monthly_savings, tasks: [] });
  renderObjectives();
}

// Variável global para guardar qual tarefa está sendo arrastada
let draggedTaskId = null;

function handleDragStart(e, taskId) {
  draggedTaskId = taskId;
  e.dataTransfer.effectAllowed = 'move';
  // Adiciona uma classe visual para indicar que está arrastando
  setTimeout(() => e.target.classList.add('dragging'), 0);
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedTaskId = null;
}

function handleDragOver(e) {
  e.preventDefault(); // Necessário para permitir o "drop"
  e.dataTransfer.dropEffect = 'move';
}

async function handleDrop(e, targetTaskId, objId, compId) {
  e.preventDefault();
  if (draggedTaskId === targetTaskId) return;

  const o = state.objectives[compId].find(x => x.id === objId);
  if (!o) return;

  const tasks = o.tasks;
  const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
  const targetIdx = tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIdx === -1 || targetIdx === -1) return;

  // Reorganiza o array localmente
  const [movedTask] = tasks.splice(draggedIdx, 1);
  tasks.splice(targetIdx, 0, movedTask);

  // Atualiza a renderização visual imediatamente
  renderObjectives();

  // Salva a nova ordem no banco de dados (faz um update em loop)
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    t.sort_order = i;
    await window.db.from('tasks').update({ sort_order: i }).eq('id', t.id);
  }
}
