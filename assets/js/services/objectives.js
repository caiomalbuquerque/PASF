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
