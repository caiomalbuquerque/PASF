/* assets/js/state.js */

// Estado inicial vazio (será preenchido pelo main.js via Supabase)
const state = {
  companies: [],
  users: [],
  objectives: {},
  auditLog: [],
  notifications: [],
  currentUser: null,
  currentCompany: null,
  currentObjective: null,

  // Flags internas de UI
  _openTasks: [],
  _editingTasks: [],
  _editingObjectives: [],
  _objSearch: '',
  _objStatus: ''
};
