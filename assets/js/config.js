/* Constantes globais — papéis, permissões, status, labels */

const ROLE_LABELS = {
  admin:               'Administrador',
  global_collaborator: 'Colaborador Global',
  global_viewer:       'Viewer Global',
  unique_collaborator: 'Gestor',
  unique_leader:       'Líder',
  unique_user:         'Usuário Padrão',
  unique_viewer:       'Viewer'
};

const ROLE_SHORT = {
  admin:'ADMIN', global_collaborator:'G.COLAB', global_viewer:'G.VIEW',
  unique_collaborator:'GESTOR', unique_leader:'LÍDER', unique_user:'USER', unique_viewer:'VIEW'
};

const ROLE_COLORS = {
  admin:'#6d28d9', global_collaborator:'#1e40af', global_viewer:'#0891b2',
  unique_collaborator:'#059669', unique_leader:'#d97706', unique_user:'#3b82f6', unique_viewer:'#64748b'
};

/* Permissões por papel */
const PERMS = {
  // Admin e Global: vê tudo, edita tudo
  admin:               { scope:'all', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:true,  seeUsers:true,  seeCompanies:true  },
  global_collaborator: { scope:'all', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:true,  seeUsers:true,  seeCompanies:true  },
  global_viewer:       { scope:'all', createObj:false, editObj:false, delObj:false, addTask:false, editTask:false, delTask:false, manageUsers:false, seeUsers:false, seeCompanies:true  },
  
  // Gestor: edita objetivos e tarefas da sua unidade
  unique_collaborator: { scope:'own', createObj:true,  editObj:true,  delObj:true,  addTask:true,  editTask:true,  delTask:true,  manageUsers:true,  seeUsers:true,  seeCompanies:false },
  
  // Líder: edita TODAS as tarefas (atribui responsáveis, etc), mas NÃO cria/edita objetivos
  unique_leader:       { scope:'own', createObj:false, editObj:false, delObj:false, addTask:true,  editTask:true,  delTask:true,  manageUsers:false, seeUsers:false, seeCompanies:false },
  
  // Usuário Padrão: Edita apenas as tarefas destinadas a ele (regra especial no código)
  unique_user:         { scope:'own', createObj:false, editObj:false, delObj:false, addTask:false, editTask:true,  delTask:false, manageUsers:false, seeUsers:false, seeCompanies:false },
  
  // Viewer: Apenas visualiza
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
