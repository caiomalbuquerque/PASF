function can(action){
  return PERMS[state.currentUser.role][action];
}

function accessibleCompanies(){
  const u = state.currentUser;
  
  // Filtra apenas empresas ativas, a não ser que o usuário seja Admin e esteja na tela de Empresas
  let comps = state.companies.filter(c => c.is_active !== false);
  
  // Se for global/admin, vê todas as ativas
  if(u.role === 'admin' || u.role.startsWith('global_')){
    return comps;
  }
  
  // Se for unique, vê apenas a própria empresa (mesmo que ela esteja inativa por algum motivo, não deve dar erro, então não filtramos a própria)
  return state.companies.filter(c => c.id === u.companyId);
}
