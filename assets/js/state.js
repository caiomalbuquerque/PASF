/* Estado em memória + persistência localStorage.
   Ao migrar para Supabase, este arquivo será substituído por chamadas à API. */

function seedState(){
  return {
    companies: [
      { id:'emp1', name:'Instituto Vida',    cnpj:'12.345.678/0001-90' },
      { id:'emp2', name:'Fundação Esperança',cnpj:'98.765.432/0001-10' }
    ],
    users: [
      { id:'u1', name:'Admin PASF',        email:'admin@pasf.com',    password:'admin123', role:'admin',               companyId:null,   gestorId:null },
      { id:'u2', name:'Carlos Global',     email:'carlos@pasf.com',   password:'123456',   role:'global_collaborator', companyId:null,   gestorId:null },
      { id:'u3', name:'Ana Global',        email:'ana@pasf.com',      password:'123456',   role:'global_viewer',       companyId:null,   gestorId:null },
      { id:'u4', name:'Maria Empresa1',    email:'maria@emp1.com',    password:'123456',   role:'unique_collaborator', companyId:'emp1', gestorId:null },
      { id:'u5', name:'Pedro Empresa1',    email:'pedro@emp1.com',    password:'123456',   role:'unique_user',         companyId:'emp1', gestorId:'u4' },
      { id:'u6', name:'Lucas Empresa1',    email:'lucas@emp1.com',    password:'123456',   role:'unique_viewer',       companyId:'emp1', gestorId:null },
      { id:'u7', name:'João Empresa2',     email:'joao@emp2.com',     password:'123456',   role:'unique_collaborator', companyId:'emp2', gestorId:null },
      { id:'u8', name:'Beatriz Empresa2',  email:'beatriz@emp2.com',  password:'123456',   role:'unique_user',         companyId:'emp2', gestorId:'u7' }
    ],
    objectives: {
      emp1: [
        { id:'o1', title:'Reduzir custos com impressão', monthlySavings:2500, tasks:[
          { id:'t1', description:'Implantar política de impressão frente e verso', responsibleId:'u1',
            startDate:'2026-03-01', endDate:'2026-03-15', status:'Em Andamento', cost:0, result:800,
            notes:'Impressoras configuradas.', attachments:[] },
          { id:'t2', description:'Digitalizar documentos do RH', responsibleId:'u2',
            startDate:'2026-03-05', endDate:'2026-04-05', status:'A Iniciar', cost:1200, result:0, notes:'', attachments:[] },
          { id:'t3', description:'Renegociar contrato de outsourcing', responsibleId:'u3',
            startDate:'2026-02-01', endDate:'2026-02-28', status:'Concluída', cost:0, result:1500,
            notes:'Contrato renegociado.', attachments:[] }
        ]},
        { id:'o2', title:'Otimizar consumo de energia elétrica', monthlySavings:1800, tasks:[
          { id:'t4', description:'Trocar lâmpadas por LED', responsibleId:'u4',
            startDate:'2026-03-10', endDate:'2026-04-10', status:'Em Andamento', cost:3500, result:600, notes:'', attachments:[] },
          { id:'t5', description:'Instalar sensores de presença', responsibleId:'u1',
            startDate:'2026-04-01', endDate:'2026-05-01', status:'A Iniciar', cost:2000, result:0, notes:'', attachments:[] }
        ]},
        { id:'o3', title:'Renegociar contratos de fornecedores', monthlySavings:3200, tasks:[
          { id:'t6', description:'Mapear contratos vigentes', responsibleId:'u2',
            startDate:'2026-02-15', endDate:'2026-02-28', status:'Concluída', cost:0, result:400, notes:'', attachments:[] },
          { id:'t7', description:'Reunião com fornecedor de TI', responsibleId:'u5',
            startDate:'2026-03-01', endDate:'2026-03-10', status:'Em Andamento', cost:0, result:0,
            notes:'Aguardando retorno.', attachments:[] }
        ]}
      ],
      emp2: [
        { id:'o4', title:'Reduzir custos administrativos', monthlySavings:1500, tasks:[
          { id:'t8', description:'Revisar assinaturas de software', responsibleId:'u8',
            startDate:'2026-03-01', endDate:'2026-03-20', status:'Em Andamento', cost:0, result:300, notes:'', attachments:[] }
        ]}
      ]
    },
    auditLog: [],
    notifications: []
  };
}

function loadState(){
  const saved = localStorage.getItem(STATE_KEY);
  if(saved){
    try { return JSON.parse(saved); } catch(e){ /* ignorar */ }
  }
  return seedState();
}

const state = Object.assign(loadState(), { currentUser:null, currentCompany:null });

function saveState(){
  const toSave = { ...state, currentUser:null };
  try { localStorage.setItem(STATE_KEY, JSON.stringify(toSave)); } catch(e){}
}

function resetDemo(){
  localStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}