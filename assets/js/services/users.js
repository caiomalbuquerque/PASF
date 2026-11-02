/* assets/js/services/users.js */

const userById = id => state.users.find(u => u.id === id);
const companyById = id => state.companies.find(c => c.id === Number(id));

/**
 * Retorna todos os usuários que podem receber tarefas em uma empresa.
 * Inclui usuários globais (sem empresa vinculada).
 *
 * ✔ CORRIGIDO: normaliza companyId para Number nos dois lados.
 * O companyId que chega aqui vem de chaves de objeto em state.objectives
 * (sempre string), enquanto u.companyId vem do Supabase como número.
 * Antes, "5" === 5 era false e o dropdown ficava vazio.
 */
function usersOfCompany(companyId){
  const cid = Number(companyId);
  return state.users.filter(u => Number(u.companyId) === cid || u.companyId == null);
}

function allTasksFlat(){
  return Object.values(state.objectives).flat().flatMap(o => o.tasks);
}
