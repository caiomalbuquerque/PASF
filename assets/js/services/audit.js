/* assets/js/services/audit.js */

function historyFor(taskId){
  return state.auditLog.filter(e => e.taskId === taskId).reverse();
}
