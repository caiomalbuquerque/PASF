/* assets/js/views/dashboard.js */

// Função auxiliar para formatar valores grandes de forma compacta (ex: R$ 158,8 mil)
function formatCompactBRL(value) {
  if (value >= 1000000) {
    return 'R$ ' + (value / 1000000).toFixed(1).replace('.', ',') + ' mi';
  }
  if (value >= 1000) {
    return 'R$ ' + (value / 1000).toFixed(1).replace('.', ',') + ' mil';
  }
  return fmtBRL(value);
}

function renderDashboard(){
  const el = $('view-dashboard');
  const isGlobal = can('scope') === 'all';
  const comps = isGlobal ? accessibleCompanies() : [companyById(state.currentCompany)].filter(Boolean);

  // 1. Coleta de Dados
  const objsAll = comps.flatMap(c => state.objectives[c.id] || []);
  const tasks = objsAll.flatMap(o => o.tasks);

  // Contadores de Tarefas
  const totalObjectives = objsAll.length;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => effectiveStatus(t) === 'Concluída').length;
  const progressTasks = tasks.filter(t => effectiveStatus(t) === 'Em Andamento').length;
  const lateTasks = tasks.filter(t => effectiveStatus(t) === 'Atrasada').length;
  const todoTasks = tasks.filter(t => effectiveStatus(t) === 'A Iniciar').length;

  // Cálculos para o Gráfico de Realização
  const totalEstimate = objsAll.reduce((sum, o) => sum + (+o.monthlySavings || 0), 0);
  const totalDelivered = tasks.filter(t => effectiveStatus(t) === 'Concluída').reduce((sum, t) => sum + (+t.result || 0), 0);
  
  const percentDelivered = totalEstimate > 0 ? (totalDelivered / totalEstimate) * 100 : 0;
  const percentPending = Math.max(0, 100 - percentDelivered); 
  const balance = totalDelivered - totalEstimate;

  // 2. HTML dos Cartões (KPIs)
  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>${isGlobal ? 'Visão consolidada das empresas' : 'Panorama da empresa'}</p>
      </div>
    </div>

    <!-- LINHA 1: CARTÕES DE RESUMO -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
      <div class="kpi-card info">
        <div class="label">Objetivos</div>
        <div class="value">${totalObjectives}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Total Tarefas</div>
        <div class="value">${totalTasks}</div>
      </div>
      <div class="kpi-card accent">
        <div class="label">Concluídas</div>
        <div class="value">${doneTasks}</div>
      </div>
      <div class="kpi-card info">
        <div class="label">Em Andamento</div>
        <div class="value" style="color: var(--status-progress-text);">${progressTasks}</div>
      </div>
      <div class="kpi-card danger">
        <div class="label">Atrasadas</div>
        <div class="value">${lateTasks}</div>
      </div>
      <div class="kpi-card">
        <div class="label">A Iniciar</div>
        <div class="value" style="color: var(--gray-500);">${todoTasks}</div>
      </div>
    </div>

    <!-- LINHA 2: GRÁFICOS -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(400px, 1fr)); gap:24px; margin-bottom:24px;">
      
      <!-- PAINEL: REALIZAÇÃO DA ESTIMATIVA -->
      <div class="panel">
        <div class="panel-header">
          <h3>Realização da estimativa</h3>
          <span style="font-size:12px; color:var(--gray-500); font-weight:600;">${formatCompactBRL(totalDelivered)} / ${formatCompactBRL(totalEstimate)}</span>
        </div>
        <div class="panel-body">
          
          <div style="display:flex; height:36px; border-radius:99px; overflow:hidden; background:var(--gray-200); margin-bottom:16px; position:relative;">
            <!-- Barra Verde (Entregue) -->
            <div style="width:${percentDelivered}%; background:var(--accent); display:flex; align-items:center; justify-content:center; transition:width 0.8s ease;">
              ${percentDelivered > 10 ? `<span style="color:#fff; font-size:12px; font-weight:700;">${percentDelivered.toFixed(1)}%</span>` : ''}
            </div>
            <!-- Barra Cinza (Pendente) -->
            <div style="width:${percentPending}%; background:var(--gray-300); display:flex; align-items:center; justify-content:center; transition:width 0.8s ease;">
              ${percentPending > 10 ? `<span style="color:var(--gray-700); font-size:12px; font-weight:700;">${percentPending.toFixed(1)}% pendente</span>` : ''}
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--accent);"></span>
              <span style="color:var(--gray-600); font-weight:600;">Entregue / economia efetiva</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:var(--gray-300);"></span>
              <span style="color:var(--gray-600); font-weight:600;">Saldo frente à estimativa</span>
            </div>
            <div style="font-weight:700; color:${balance < 0 ? 'var(--danger)' : 'var(--gray-800)'};">
              Saldo: ${fmtBRL(balance)}
            </div>
          </div>

        </div>
      </div>

      <!-- PAINEL: MAIORES ESTIMATIVAS MENSAIS -->
      <div class="panel">
        <div class="panel-header">
          <h3>Maiores estimativas mensais</h3>
        </div>
        <div class="panel-body">
          ${renderTopEstimatesChart(objsAll)}
        </div>
      </div>

    </div>
  `;
}

// Função para gerar as barras das maiores estimativas
function renderTopEstimatesChart(objsAll) {
  if (objsAll.length === 0) {
    return '<p style="color:var(--gray-500)">Nenhum objetivo cadastrado.</p>';
  }

  // Ordena do maior para o menor e pega os top 5
  const topObjs = [...objsAll]
    .sort((a, b) => (+b.monthlySavings || 0) - (+a.monthlySavings || 0))
    .slice(0, 5);

  const maxSavings = Math.max(1, ...topObjs.map(o => +o.monthlySavings || 0));

  return topObjs.map(o => {
    const val = +o.monthlySavings || 0;
    const pct = (val / maxSavings) * 100;
    
    return `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--gray-700); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;" title="${escapeHtml(o.title)}">
            ${escapeHtml(o.title)}
          </span>
          <span style="font-size: 12px; font-weight: 700; color: var(--gray-800);">${formatCompactBRL(val)}</span>
        </div>
        <div style="width: 100%; height: 14px; background: var(--gray-100); border-radius: 99px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: var(--primary); border-radius: 99px; transition: width 0.8s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}
