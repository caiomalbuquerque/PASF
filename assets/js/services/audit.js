/* assets/js/services/audit.js */

function historyFor(taskId){
  return state.auditLog
    .filter(e => String(e.taskId) === String(taskId))
    .reverse();
}
