/* Bootstrap do app.html */

(function bootstrapApp(){
  const user = requireAuth();
  if(!user) return;

  state.currentUser = user;
  state.currentCompany = (user.companyId ? user.companyId : accessibleCompanies()[0]?.id) || null;

  $('app').classList.remove('hidden');

  renderSidebar();
  renderTopbar();
  renderCompanySelector();
  renderNotificationsBadge();

  // Primeira view: objetivos
  showView('objetivos');
})();