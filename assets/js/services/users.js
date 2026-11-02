/* assets/js/services/users.js */

const userById = id => state.users.find(u => String(u.id) === String(id));
const companyById = id => state.companies.find(c => String(c.id) === String(id));

function usersOfCompany(companyId){
  return state.users.filter(u =>
    !u.companyId || String(u.companyId) === String(companyId)
  );
}

function allTasksFlat(){
  return Object.values(state.objectives).flat().flatMap(o => o.tasks);
}
