function updateSavings(compId, objId, value){
  const o = (state.objectives[compId]||[]).find(x => x.id === objId);
  if(!o) return;
  o.monthlySavings = +value || 0;
  saveState();
  renderObjectives();
}

function deleteObjective(compId, objId){
  if(!confirm('Remover este objetivo e todas as suas tarefas?')) return;
  state.objectives[compId] = (state.objectives[compId]||[]).filter(o => o.id !== objId);
  saveState();
  renderObjectives();
}

function createObjective(title, savings){
  if(!state.objectives[state.currentCompany]) state.objectives[state.currentCompany] = [];
  state.objectives[state.currentCompany].push({
    id: uid(), title, monthlySavings: savings || 0, tasks: []
  });
  saveState();
  renderObjectives();
}