renderMenu('dashboard');
renderHeader('Dashboard');

const Dashboard = (() => {
  const oficinaId = Session.getOficinaId();
  const state = {
    period: '30',
    clientes: [],
    veiculos: [],
    estoque: [],
    fluxo: [],
    orcamentos: [],
    ordens: []
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  let chartTooltip = null;

  function getChartTooltip() {
    if (chartTooltip && document.body.contains(chartTooltip)) return chartTooltip;
    chartTooltip = document.createElement('div');
    chartTooltip.className = 'dashboard-chart-tooltip';
    chartTooltip.setAttribute('role', 'status');
    chartTooltip.setAttribute('aria-live', 'polite');
    document.body.appendChild(chartTooltip);
    return chartTooltip;
  }

  function showChartTooltip(event, html) {
    const tooltip = getChartTooltip();
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
    moveChartTooltip(event);
  }

  function moveChartTooltip(event) {
    const tooltip = getChartTooltip();
    const gap = 14;
    const rect = tooltip.getBoundingClientRect();
    let left = event.clientX + gap;
    let top = event.clientY + gap;
    if (left + rect.width > window.innerWidth - 8) left = event.clientX - rect.width - gap;
    if (top + rect.height > window.innerHeight - 8) top = event.clientY - rect.height - gap;
    tooltip.style.left = `${Math.max(8, left)}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  }

  function hideChartTooltip() {
    getChartTooltip().classList.remove('visible');
    $$('.dashboard-chart .is-hovered').forEach((el) => el.classList.remove('is-hovered'));
  }

  function bindSvgChartInteraction(containerSelector) {
    const container = $(containerSelector);
    if (!container) return;
    const hitAreas = [...container.querySelectorAll('[data-chart-tooltip]')];
    hitAreas.forEach((hitArea) => {
      hitArea.addEventListener('mouseenter', (event) => {
        container.querySelectorAll('.is-hovered').forEach((el) => el.classList.remove('is-hovered'));
        const index = hitArea.dataset.chartIndex;
        if (index !== undefined) container.querySelectorAll(`[data-chart-index="${index}"]`).forEach((el) => el.classList.add('is-hovered'));
        showChartTooltip(event, hitArea.dataset.chartTooltip);
      });
      hitArea.addEventListener('mousemove', moveChartTooltip);
      hitArea.addEventListener('mouseleave', hideChartTooltip);
    });
  }

  function currency(value) {
    const n = Number(value || 0);
    if (typeof Formatters !== 'undefined' && Formatters.formatCurrencyBRL) {
      return Formatters.formatCurrencyBRL(n);
    }
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function shortCurrency(value) {
    const n = Number(value || 0);
    if (Math.abs(n) >= 1000000) return `R$ ${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
    if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',')} mil`;
    return currency(n);
  }

  function parseDate(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getRange(period = state.period, offset = 0) {
    if (period === 'all') return { start: null, end: null };
    const days = Number(period);
    const end = startOfDay(new Date());
    end.setDate(end.getDate() - (offset * days));
    end.setHours(23, 59, 59, 999);
    const start = startOfDay(end);
    start.setDate(start.getDate() - days + 1);
    return { start, end };
  }

  function inRange(value, range = getRange()) {
    if (!range.start) return true;
    const d = parseDate(value);
    return !!d && d >= range.start && d <= range.end;
  }

  function periodLabel() {
    const labels = { '7': 'últimos 7 dias', '30': 'últimos 30 dias', '90': 'últimos 90 dias', '365': 'últimos 12 meses', all: 'todo o período' };
    return labels[state.period] || 'período selecionado';
  }

  async function loadData() {
    if (!oficinaId) {
      showToast?.('Oficina não encontrada na sessão.', 'error');
      return;
    }

    toggleLoading(true);
    const calls = {
      clientes: `/oficinas/${oficinaId}/clientes`,
      veiculos: `/oficinas/${oficinaId}/veiculos`,
      estoque: `/oficinas/${oficinaId}/pecas`,
      fluxo: `/oficinas/${oficinaId}/fluxo-caixa`,
      orcamentos: `/oficinas/${oficinaId}/orcamentos`,
      ordens: `/oficinas/${oficinaId}/ordens-servico`
    };

    const entries = Object.entries(calls);
    const results = await Promise.allSettled(entries.map(([, path]) => apiRequest(path)));
    let failures = 0;

    results.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === 'fulfilled') state[key] = Array.isArray(result.value) ? result.value : [];
      else { state[key] = []; failures++; }
    });

    if (failures) showToast?.(`${failures} indicador(es) não puderam ser carregados.`, 'warning');
    toggleLoading(false);
    render();
  }

  function toggleLoading(show) {
    $('#dashboardLoading')?.classList.toggle('hidden', !show);
  }

  function render() {
    $('#dashboardSubtitle').textContent = `Visão geral — ${periodLabel()}`;
    renderAlerts();
    renderKpis();
    renderFinancialChart();
    renderCategoryDonut();
    renderProductionChart();
    renderRecentOrders();
  }

  function renderAlerts() {
    const low = state.estoque.filter((p) => Number(p.quantidade) <= Number(p.estoqueMinimo)).length;
    const open = state.ordens.filter((o) => o.status === 'Aberta').length;
    const pending = state.orcamentos.filter((o) => o.status === 'Pendente').length;
    const alerts = [];

    if (low > 0) alerts.push({ type: 'warning', text: `${low} item(ns) com estoque no mínimo ou abaixo — verifique o estoque.` });
    if (open > 0) alerts.push({ type: 'info', text: `${open} ordem(ns) de serviço aberta(s) aguardando fechamento.` });
    if (pending > 0) alerts.push({ type: 'success', text: `${pending} orçamento(s) pendente(s) aguardando aprovação ou recusa.` });

    const target = $('#dashboardAlerts');
    if (!alerts.length) {
      target.innerHTML = '<div class="dashboard-alert success"><span class="dashboard-alert-dot"></span><span>Nenhum alerta operacional no momento.</span></div>';
      return;
    }
    target.innerHTML = alerts.map((a) => `<div class="dashboard-alert ${a.type}"><span class="dashboard-alert-dot"></span><span>${escapeHtml(a.text)}</span></div>`).join('');
  }

  function renderKpis() {
    const current = getRange();
    const previous = getRange(state.period, 1);
    const currentFlow = state.fluxo.filter((m) => inRange(m.dataMovimentacao, current));
    const prevFlow = state.period === 'all' ? [] : state.fluxo.filter((m) => inRange(m.dataMovimentacao, previous));
    const income = sum(currentFlow.filter((m) => m.tipo === 'Entrada'), 'valor');
    const prevIncome = sum(prevFlow.filter((m) => m.tipo === 'Entrada'), 'valor');
    const open = state.ordens.filter((o) => o.status === 'Aberta').length;
    const closedPeriod = state.ordens.filter((o) => o.status === 'Fechada' && inRange(o.dataFechamento, current)).length;
    const activeClients = state.clientes.filter((c) => c.status === 'Ativo').length;
    const low = state.estoque.filter((p) => Number(p.quantidade) <= Number(p.estoqueMinimo)).length;

    $('#kpiReceita').textContent = currency(income);
    $('#kpiOrdensAbertas').textContent = String(open);
    $('#kpiClientes').textContent = String(activeClients);
    $('#kpiEstoque').textContent = String(low);
    $('#kpiOrdensFoot').textContent = `${closedPeriod} fechada(s) em ${periodLabel()}`;

    const foot = $('#kpiReceitaFoot');
    if (state.period === 'all') {
      foot.textContent = 'total de entradas registradas';
    } else if (prevIncome === 0 && income === 0) {
      foot.textContent = 'sem movimentação no período';
    } else if (prevIncome === 0) {
      foot.innerHTML = '<span class="up">novo movimento</span> vs período anterior';
    } else {
      const pct = ((income - prevIncome) / prevIncome) * 100;
      foot.innerHTML = `<span class="${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%</span> vs período anterior`;
    }
  }

  function bucketConfig() {
    if (state.period === '365' || state.period === 'all') return { mode: 'month', count: state.period === '365' ? 12 : 12 };
    const days = Number(state.period);
    if (days <= 7) return { mode: 'day', count: days };
    if (days <= 30) return { mode: 'segment', count: 6 };
    return { mode: 'segment', count: 9 };
  }

  function makeBuckets(dateField, data, valueGetter = () => 1) {
    const range = getRange();
    const cfg = bucketConfig();
    const now = new Date();

    if (cfg.mode === 'month') {
      const months = [];
      for (let i = cfg.count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          key: `${d.getFullYear()}-${d.getMonth()}`,
          label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
          value: 0
        });
      }
      data.forEach((item) => {
        const d = parseDate(item[dateField]);
        if (!d) return;
        const b = months.find((x) => d >= x.start && d <= x.end);
        if (b) b.value += Number(valueGetter(item) || 0);
      });
      return months;
    }

    const days = state.period === 'all' ? 30 : Number(state.period);
    const start = range.start || (() => { const d = new Date(); d.setDate(d.getDate() - 29); return startOfDay(d); })();
    const segment = Math.max(1, Math.ceil(days / cfg.count));
    const buckets = [];
    for (let i = 0; i < cfg.count; i++) {
      const s = new Date(start); s.setDate(s.getDate() + i * segment);
      const e = new Date(s); e.setDate(e.getDate() + segment - 1); e.setHours(23,59,59,999);
      const label = cfg.mode === 'day'
        ? s.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
        : s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      buckets.push({ label, start: s, end: e, value: 0 });
    }
    data.forEach((item) => {
      const d = parseDate(item[dateField]);
      if (!d) return;
      const b = buckets.find((x) => d >= x.start && d <= x.end);
      if (b) b.value += Number(valueGetter(item) || 0);
    });
    return buckets;
  }

  function renderFinancialChart() {
    const filtered = state.fluxo.filter((m) => inRange(m.dataMovimentacao));
    const incomes = makeBuckets('dataMovimentacao', filtered.filter((m) => m.tipo === 'Entrada'), (m) => m.valor);
    const outcomes = makeBuckets('dataMovimentacao', filtered.filter((m) => m.tipo === 'Saida'), (m) => m.valor);
    const rows = incomes.map((b, i) => ({ label: b.label, income: b.value, outcome: outcomes[i]?.value || 0 }));
    $('#financialChartSubtitle').textContent = `Entradas e saídas — ${periodLabel()}`;
    $('#financialChart').innerHTML = lineChartSvg(rows);
    bindSvgChartInteraction('#financialChart');
  }

  function lineChartSvg(rows) {
    if (!rows.length) return '<div class="chart-empty">Sem dados para o período.</div>';
    const W = 720, H = 178, L = 48, R = 14, T = 10, B = 24;
    const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.outcome]));
    const x = (i) => L + (rows.length === 1 ? 0 : i * ((W - L - R) / (rows.length - 1)));
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const path = (key) => rows.map((r, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(r[key]).toFixed(1)}`).join(' ');
    const area = `${path('income')} L ${x(rows.length - 1)} ${H - B} L ${x(0)} ${H - B} Z`;
    const grid = [0, .25, .5, .75, 1].map((n) => {
      const yy = T + n * (H - T - B);
      const val = max * (1 - n);
      return `<line class="chart-grid-line" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis-label" x="0" y="${yy+3}">${compactNumber(val)}</text>`;
    }).join('');
    const labels = rows.map((r, i) => `<text class="chart-axis-label" text-anchor="middle" x="${x(i)}" y="${H-5}">${escapeHtml(r.label)}</text>`).join('');
    const hover = rows.map((r, i) => {
      const left = i === 0 ? L : (x(i - 1) + x(i)) / 2;
      const right = i === rows.length - 1 ? W - R : (x(i) + x(i + 1)) / 2;
      const tooltip = `<div class="dashboard-tooltip-title">${escapeHtml(r.label)}</div><div><span class="dashboard-tooltip-dot income"></span>Entradas <strong>${escapeHtml(currency(r.income))}</strong></div><div><span class="dashboard-tooltip-dot outcome"></span>Saídas <strong>${escapeHtml(currency(r.outcome))}</strong></div>`;
      return `<g class="chart-hover-group" data-chart-index="${i}"><line class="chart-hover-guide" x1="${x(i)}" y1="${T}" x2="${x(i)}" y2="${H-B}"/><circle class="chart-hover-point income" cx="${x(i)}" cy="${y(r.income)}" r="4"/><circle class="chart-hover-point outcome" cx="${x(i)}" cy="${y(r.outcome)}" r="4"/><rect class="chart-hit-area" data-chart-index="${i}" data-chart-tooltip="${escapeHtml(tooltip)}" x="${left}" y="${T}" width="${Math.max(1, right-left)}" height="${H-T-B}"/></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="dashboardIncomeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#cc0000" stop-opacity=".26"/><stop offset="100%" stop-color="#cc0000" stop-opacity="0"/></linearGradient></defs>
      ${grid}<path class="chart-area-income" d="${area}"/><path class="chart-line-outcome" d="${path('outcome')}"/><path class="chart-line-income" d="${path('income')}"/>${labels}${hover}
    </svg>`;
  }

  function renderCategoryDonut() {
    const filtered = state.fluxo.filter((m) => inRange(m.dataMovimentacao));
    const map = new Map();
    filtered.forEach((m) => map.set(m.categoria || 'Outros', (map.get(m.categoria || 'Outros') || 0) + Number(m.valor || 0)));
    let rows = [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (rows.length > 5) {
      const rest = rows.slice(4).reduce((a, x) => a + x.value, 0);
      rows = [...rows.slice(0, 4), { name: 'Outros', value: rest }];
    }
    const total = rows.reduce((a, x) => a + x.value, 0);
    $('#categoryTotal').textContent = shortCurrency(total);
    const colors = ['#cc0000', '#7a1616', '#484848', '#6b6b6b', '#2f2f2f'];
    if (!total) {
      $('#categoryDonut').style.background = '#222';
      $('#categoryLegend').innerHTML = '<div class="dashboard-category-item">Sem movimentações no período.</div>';
      setupDonutInteraction([], 0, colors);
      return;
    }
    let cursor = 0;
    const parts = rows.map((r, i) => {
      const start = cursor;
      const pct = (r.value / total) * 100;
      cursor += pct;
      return `${colors[i]} ${start}% ${cursor}%`;
    });
    $('#categoryDonut').style.background = `conic-gradient(${parts.join(',')})`;
    $('#categoryLegend').innerHTML = rows.map((r, i) => `<div class="dashboard-category-item" data-category-index="${i}"><div class="dashboard-category-name"><span class="dashboard-category-swatch" style="background:${colors[i]}"></span><span>${escapeHtml(displayCategory(r.name))}</span></div><span class="dashboard-category-value">${((r.value / total) * 100).toFixed(0)}%</span></div>`).join('');
    setupDonutInteraction(rows, total, colors);
  }

  function setupDonutInteraction(rows, total, colors) {
    const donut = $('#categoryDonut');
    if (!donut) return;
    donut.onmousemove = null;
    donut.onmouseleave = null;
    donut.classList.toggle('interactive', !!total);

    if (!total || !rows.length) return;

    const ranges = [];
    let cursor = 0;
    rows.forEach((row, index) => {
      const pct = (row.value / total) * 100;
      ranges.push({ index, start: cursor, end: cursor + pct, row });
      cursor += pct;
    });

    donut.onmousemove = (event) => {
      const rect = donut.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const radius = Math.sqrt(dx * dx + dy * dy);
      const outer = rect.width / 2;
      const inner = outer * (29 / 69);
      if (radius < inner || radius > outer) { hideChartTooltip(); return; }

      let degrees = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (degrees < 0) degrees += 360;
      const pct = degrees / 3.6;
      const hit = ranges.find((range) => pct >= range.start && pct < range.end) || ranges[ranges.length - 1];
      const percentage = ((hit.row.value / total) * 100).toFixed(0);
      const html = `<div class="dashboard-tooltip-title">${escapeHtml(displayCategory(hit.row.name))}</div><div><span class="dashboard-tooltip-dot" style="background:${colors[hit.index]}"></span>Participação <strong>${percentage}%</strong></div><div>Valor <strong>${escapeHtml(currency(hit.row.value))}</strong></div>`;
      $$('.dashboard-category-item').forEach((el) => el.classList.toggle('is-hovered', el.dataset.categoryIndex === String(hit.index)));
      showChartTooltip(event, html);
    };
    donut.onmouseleave = () => {
      $$('.dashboard-category-item').forEach((el) => el.classList.remove('is-hovered'));
      hideChartTooltip();
    };
  }

  function renderProductionChart() {
    const opens = makeBuckets('dataAbertura', state.ordens.filter((o) => inRange(o.dataAbertura)), () => 1);
    const closes = makeBuckets('dataFechamento', state.ordens.filter((o) => o.dataFechamento && inRange(o.dataFechamento)), () => 1);
    const rows = opens.map((b, i) => ({ label: b.label, open: b.value, closed: closes[i]?.value || 0 }));
    $('#productionChart').innerHTML = barChartSvg(rows);
    bindSvgChartInteraction('#productionChart');
  }

  function barChartSvg(rows) {
    if (!rows.length) return '<div class="chart-empty">Sem ordens no período.</div>';
    const W = 420, H = 170, L = 30, R = 10, T = 8, B = 24;
    const max = Math.max(1, ...rows.flatMap((r) => [r.open, r.closed]));
    const plotW = W - L - R;
    const groupW = plotW / rows.length;
    const barW = Math.min(15, groupW * .28);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const grid = [0, .5, 1].map((n) => {
      const yy = T + n * (H - T - B);
      return `<line class="chart-grid-line" x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}"/><text class="chart-axis-label" x="2" y="${yy+3}">${Math.round(max*(1-n))}</text>`;
    }).join('');
    const bars = rows.map((r, i) => {
      const cx = L + i * groupW + groupW / 2;
      const yo = y(r.open), yc = y(r.closed);
      const tooltip = `<div class="dashboard-tooltip-title">${escapeHtml(r.label)}</div><div><span class="dashboard-tooltip-dot open"></span>Abertas <strong>${r.open}</strong></div><div><span class="dashboard-tooltip-dot closed"></span>Fechadas <strong>${r.closed}</strong></div>`;
      return `<g class="chart-bar-group" data-chart-index="${i}"><rect class="bar-open" data-chart-index="${i}" x="${cx-barW-1}" y="${yo}" width="${barW}" height="${H-B-yo}"/><rect class="bar-closed" data-chart-index="${i}" x="${cx+1}" y="${yc}" width="${barW}" height="${H-B-yc}"/><rect class="chart-hit-area" data-chart-index="${i}" data-chart-tooltip="${escapeHtml(tooltip)}" x="${L + i*groupW}" y="${T}" width="${groupW}" height="${H-T-B}"/><text class="chart-axis-label" text-anchor="middle" x="${cx}" y="${H-5}">${escapeHtml(r.label)}</text></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${bars}</svg>`;
  }

  function renderRecentOrders() {
    const clientMap = new Map(state.clientes.map((c) => [String(c.clienteId), c]));
    const vehicleMap = new Map(state.veiculos.map((v) => [String(v.idVeiculo), v]));
    const rows = [...state.ordens]
      .sort((a, b) => (parseDate(b.createdAt || b.dataAbertura)?.getTime() || 0) - (parseDate(a.createdAt || a.dataAbertura)?.getTime() || 0))
      .slice(0, 5);

    const tbody = $('#recentOrdersBody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="height:70px;text-align:center;color:#444">Nenhuma ordem cadastrada.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((o) => {
      const c = clientMap.get(String(o.clienteId));
      const v = vehicleMap.get(String(o.veiculoId));
      const vehicleName = v ? [v.modelo?.marca?.nomeMarca, v.modelo?.nomeModelo].filter(Boolean).join(' ') : `Veículo #${o.veiculoId}`;
      return `<tr>
        <td class="dashboard-os-number">OS-${String(o.idOrdemServico).padStart(4, '0')}</td>
        <td class="dashboard-client">${escapeHtml(c?.nomeCliente || v?.nomeCliente || `Cliente #${o.clienteId}`)}</td>
        <td>${escapeHtml(vehicleName || '—')}</td>
        <td>${formatDate(o.dataAbertura)}</td>
        <td class="dashboard-money">${currency(o.valorTotal)}</td>
        <td><span class="dashboard-status ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
      </tr>`;
    }).join('');
  }

  function sum(arr, key) { return arr.reduce((acc, item) => acc + Number(item[key] || 0), 0); }
  function compactNumber(value) {
    const n = Number(value || 0);
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}m`;
    if (n >= 1000) return `${Math.round(n/1000)}k`;
    return String(Math.round(n));
  }
  function formatDate(value) {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('pt-BR') : '—';
  }
  function displayCategory(value) {
    const labels = {
      Servico: 'Serviço', VendaDePeca: 'Venda de Peça', CompraDePeca: 'Compra de Peça',
      Salario: 'Salário', Aluguel: 'Aluguel', ContaDeConsumo: 'Conta de Consumo',
      ManutencaoDeEquipamento: 'Manutenção de Equipamento', Imposto: 'Imposto',
      Fornecedor: 'Fornecedor', Marketing: 'Marketing', Outros: 'Outros'
    };
    return labels[value] || value || 'Outros';
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function bindEvents() {
    $$('.dashboard-period button').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.dashboard-period button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.period = btn.dataset.period;
        render();
      });
    });
    window.addEventListener('resize', debounce(() => { renderFinancialChart(); renderProductionChart(); }, 120));
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  }

  bindEvents();
  loadData();
  return { reload: loadData };
})();
