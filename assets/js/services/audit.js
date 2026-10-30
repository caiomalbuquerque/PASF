/* assets/js/services/audit.js */

// logChange foi removido — o registro é feito diretamente em updateTask (services/tasks.js)

function historyFor(taskId){
  return state.auditLog.filter(e => e.taskId === taskId).reverse();
}
