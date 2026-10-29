/* Constantes globais — papéis, permissões, status, labels */

const ROLE_LABELS = {
  admin:               'Administrador',
  global_collaborator: 'Colaborador Global',
  global_viewer:       'Viewer Global',
  unique_collaborator: 'Gestor (empresa)',
  unique_user:         'Usuário (empresa)',
  unique_viewer:       'Viewer (empresa)'
};
const ROLE_SHORT = {
  admin:'ADMIN', global_collaborator:'G.COLAB', global_viewer:'G.VIEW',
  unique_collaborator:'GESTOR', unique_user:'USER', unique_viewer:'VIEW'
};
const ROLE_COLORS = {
  admin:'#6d28d9', global_collaborator:'#1e40af', global_viewer:'#0891b2',
  unique_collaborator:'#059669', unique_user:'#d97706', unique_viewer:'#64748b'
};

/* Permissões por papel.
   seeUsers: apenas admin e global_collaborator (regra de 2026-10-29). */
const PERMS = {
  admin:               { scope:'all', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:true,  seeUsers:true,  seeCompanies:true  },
  global_collaborator: { scope:'all', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:true,  seeUsers:true,  seeCompanies:true  },
  global_viewer:       { scope:'all', createObj:false, editObj:false, delObj:false, addTask:false, editTask:false, delTask:false, manageUsers:false, seeUsers:false, seeCompanies:true  },
  unique_collaborator: { scope:'own', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:false, seeUsers:false, seeCompanies:false },
  unique_user:         { scope:'own', createObj:false, editObj:false, delObj:false, addTask:false, editTask:true,  delTask:false, manageUsers:false, seeUsers:false, seeCompanies:false },
  unique_viewer:       { scope:'own', createObj:false, editObj:false, delObj:false, addTask:false, editTask:false, delTask:false, manageUsers:false, seeUsers:false, seeCompanies:false }
};

const STATUS_OPTIONS = ['A Iniciar','Em Andamento','Concluída','Cancelada'];
const ALL_STATUS = ['A Iniciar','Em Andamento','Concluída','Atrasada','Cancelada'];

const FIELD_LABELS = {
  description:'descrição', responsibleId:'responsável', startDate:'data de início',
  endDate:'data de conclusão', status:'status', cost:'custo', result:'resultado', notes:'observações'
};

const SESSION_KEY = 'pasf_user_id';
const STATE_KEY   = 'pasf_state_v1';