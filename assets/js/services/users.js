/* assets/js/services/users.js */

const userById = id => state.users.find(u => u.id === id);
const companyById = id => state.companies.find(c => c.id === Number(id));

function usersOfCompany(companyId){
  return state.users.filter(u => u.companyId === companyId || !u.companyId);
}

function allTasksFlat(){
  return Object.values(state.objectives).flat().flatMap(o => o.tasks);
}
