/* @deprecated — lógica substituída por updateTask em services/tasks.js */
function logChange(){ /* noop */ }
  state.auditLog.push({
    id: uid(), taskId, field, oldValue, newValue,
    userId: state.currentUser.id, timestamp: nowIso()
  });
  saveState();
}

function historyFor(taskId){
  return state.auditLog.filter(e => e.taskId === taskId).reverse();
}
