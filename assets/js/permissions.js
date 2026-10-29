function can(action){
  return PERMS[state.currentUser.role][action];
}

function accessibleCompanies(){
  const u = state.currentUser;
  if(u.role === 'admin' || u.role.startsWith('global_')){
    return state.companies;
  }
  return state.companies.filter(c => c.id === u.companyId);
}