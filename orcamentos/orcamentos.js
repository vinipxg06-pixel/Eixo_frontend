renderMenu('orcamentos');
renderHeader('Orçamentos');

const oficinaId = Session.getOficinaId();

const state = {
  orcamentos: [],
  clientes: [],
  veiculos: [],
  estoque: [],
  filtro: '',
  orcamentoEmEdicao: null,
  pecasOriginais: [],
  pecasEditor: [],
  veiculosDoCliente: [],
  salvando: false,
  acaoPendente: null,
  executandoAcao: false,
  orcamentoSelecionado: null
};

const elements = {
  btnNovo: document.getElementById('btnNovoOrcamento'),
  busca: document.getElementById('buscaOrcamento'),
  count: document.getElementById('orcamentosCount'),
  loading: document.getElementById('orcamentosLoading'),
  tableWrap: document.getElementById('orcamentosTableWrap'),
  tbody: document.getElementById('orcamentosTableBody'),
  empty: document.getElementById('orcamentosEmpty'),
  emptyText: document.getElementById('orcamentosEmptyText'),
  actionMenu: document.getElementById('orcamentoActionMenu'),

  modal: document.getElementById('orcamentoModal'),
  modalTitle: document.getElementById('orcamentoModalTitle'),
  btnFecharModal: document.getElementById('btnFecharOrcamentoModal'),
  btnCancelar: document.getElementById('btnCancelarOrcamento'),
  btnSalvar: document.getElementById('btnSalvarOrcamento'),
  form: document.getElementById('orcamentoForm'),
  clienteId: document.getElementById('clienteId'),
  veiculoId: document.getElementById('veiculoId'),
  maoDeObra: document.getElementById('maoDeObra'),
  descricao: document.getElementById('descricao'),
  statusField: document.getElementById('statusField'),
  modalStatusBadge: document.getElementById('modalStatusBadge'),
  btnAdicionarLinhaPeca: document.getElementById('btnAdicionarLinhaPeca'),
  pecasEditor: document.getElementById('pecasEditor'),
  pecasEmptyHint: document.getElementById('pecasEmptyHint'),
  resumoPecas: document.getElementById('resumoPecas'),
  resumoMaoDeObra: document.getElementById('resumoMaoDeObra'),
  resumoTotal: document.getElementById('resumoTotal'),

  acaoModal: document.getElementById('acaoOrcamentoModal'),
  acaoEyebrow: document.getElementById('acaoOrcamentoEyebrow'),
  acaoTitle: document.getElementById('acaoOrcamentoTitle'),
  acaoTexto: document.getElementById('acaoOrcamentoTexto'),
  btnFecharAcao: document.getElementById('btnFecharAcaoModal'),
  btnCancelarAcao: document.getElementById('btnCancelarAcao'),
  btnConfirmarAcao: document.getElementById('btnConfirmarAcao')
};

initOrcamentos();

function initOrcamentos() {
  if (!oficinaId) {
    elements.loading.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = 'Oficina não identificada na sessão.';
    elements.btnNovo.disabled = true;
    showToast('Não foi possível identificar a oficina. Faça login novamente.', 'error');
    return;
  }

  elements.btnNovo.addEventListener('click', abrirModalNovo);
  elements.busca.addEventListener('input', (event) => {
    state.filtro = event.target.value.trim();
    renderOrcamentos();
  });
  elements.tbody.addEventListener('click', handleTableClick);
  elements.actionMenu.addEventListener('click', handleActionMenuClick);

  document.addEventListener('click', (event) => {
    if (!elements.actionMenu.contains(event.target) && !event.target.closest('[data-action="menu"]')) {
      fecharActionMenu();
    }
  });
  window.addEventListener('resize', fecharActionMenu);
  window.addEventListener('scroll', fecharActionMenu, true);

  elements.btnFecharModal.addEventListener('click', fecharModalOrcamento);
  elements.btnCancelar.addEventListener('click', fecharModalOrcamento);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) fecharModalOrcamento();
  });
  elements.form.addEventListener('submit', salvarOrcamento);
  elements.clienteId.addEventListener('change', handleClienteChange);
  elements.maoDeObra.addEventListener('input', handleMoneyInput);
  elements.btnAdicionarLinhaPeca.addEventListener('click', adicionarLinhaPeca);
  elements.pecasEditor.addEventListener('change', handlePecasChange);
  elements.pecasEditor.addEventListener('input', handlePecasInput);
  elements.pecasEditor.addEventListener('click', handlePecasClick);

  elements.btnFecharAcao.addEventListener('click', fecharAcaoModal);
  elements.btnCancelarAcao.addEventListener('click', fecharAcaoModal);
  elements.btnConfirmarAcao.addEventListener('click', executarAcaoPendente);
  elements.acaoModal.addEventListener('click', (event) => {
    if (event.target === elements.acaoModal) fecharAcaoModal();
  });

  document.addEventListener('keydown', handleEscape);
  carregarDadosIniciais();
}

async function carregarDadosIniciais() {
  setListLoading(true);
  try {
    const [orcamentos, clientes, veiculos, estoque] = await Promise.all([
      apiRequest(`/oficinas/${oficinaId}/orcamentos`),
      apiRequest(`/oficinas/${oficinaId}/clientes`),
      apiRequest(`/oficinas/${oficinaId}/veiculos`),
      apiRequest(`/oficinas/${oficinaId}/pecas`)
    ]);

    state.orcamentos = Array.isArray(orcamentos) ? orcamentos : [];
    state.clientes = Array.isArray(clientes) ? clientes : [];
    state.veiculos = Array.isArray(veiculos) ? veiculos : [];
    state.estoque = Array.isArray(estoque) ? estoque : [];

    preencherClientes();
    renderOrcamentos();
  } catch (error) {
    console.error(error);
    state.orcamentos = [];
    renderOrcamentos();
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os orçamentos.'), 'error');
  } finally {
    setListLoading(false);
  }
}

function renderOrcamentos() {
  const termo = normalizeSearch(state.filtro);
  const filtrados = state.orcamentos.filter((orcamento) => {
    if (!termo) return true;
    const cliente = getCliente(orcamento.clienteId);
    const veiculo = getVeiculo(orcamento.veiculoId);

    return [
      formatOrcamentoNumero(orcamento.orcamentoId),
      cliente?.nomeCliente,
      formatVeiculoLabel(veiculo),
      orcamento.descricao,
      orcamento.status,
      orcamento.valorTotal
    ].some((value) => normalizeSearch(value).includes(termo));
  });

  elements.count.textContent = `${state.orcamentos.length} ${state.orcamentos.length === 1 ? 'cadastrado' : 'cadastrados'}`;
  elements.tbody.innerHTML = '';

  if (filtrados.length === 0) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = state.filtro
      ? 'Nenhum orçamento corresponde à busca.'
      : 'Crie o primeiro orçamento da oficina.';
    return;
  }

  elements.empty.classList.add('hidden');
  elements.tableWrap.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  filtrados.forEach((orcamento) => {
    const cliente = getCliente(orcamento.clienteId);
    const veiculo = getVeiculo(orcamento.veiculoId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="orcamento-numero">${escapeHtml(formatOrcamentoNumero(orcamento.orcamentoId))}</td>
      <td class="orcamento-cliente" title="${escapeHtml(cliente?.nomeCliente || '')}">${escapeHtml(cliente?.nomeCliente || `Cliente #${orcamento.clienteId}`)}</td>
      <td class="orcamento-veiculo" title="${escapeHtml(formatVeiculoLabel(veiculo))}">${escapeHtml(formatVeiculoLabel(veiculo) || `Veículo #${orcamento.veiculoId}`)}</td>
      <td class="orcamento-data">${escapeHtml(formatDateTime(orcamento.createdAt))}</td>
      <td class="orcamento-total">${escapeHtml(Formatters.formatCurrencyBRL(orcamento.valorTotal ?? 0))}</td>
      <td>${renderStatusBadge(orcamento.status)}</td>
      <td class="orcamentos-actions-col">
        <div class="orcamento-row-actions">
          <button class="orcamento-icon-btn" type="button" data-action="menu" data-id="${orcamento.orcamentoId}" title="Ações do orçamento" aria-label="Ações do orçamento ${escapeHtml(formatOrcamentoNumero(orcamento.orcamentoId))}">
            ${iconEdit()}
          </button>
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });

  elements.tbody.appendChild(fragment);
}

function handleTableClick(event) {
  const button = event.target.closest('[data-action="menu"]');
  if (!button) return;

  const orcamento = state.orcamentos.find((item) => String(item.orcamentoId) === String(button.dataset.id));
  if (!orcamento) return;

  abrirActionMenu(button, orcamento);
}

function abrirActionMenu(anchor, orcamento) {
  state.orcamentoSelecionado = orcamento;
  const pendente = orcamento.status === 'Pendente';

  elements.actionMenu.querySelectorAll('[data-budget-action]').forEach((button) => {
    const action = button.dataset.budgetAction;
    const exigePendente = ['editar', 'aprovar', 'recusar'].includes(action);
    button.classList.toggle('hidden', exigePendente && !pendente);
  });

  const visibleCount = pendente ? 5 : 2;
  const menuWidth = 238;
  const menuHeight = visibleCount * 52 + 10;
  const rect = anchor.getBoundingClientRect();
  let left = rect.right - menuWidth;
  let top = rect.bottom + 6;
  if (left < 8) left = 8;
  if (top + menuHeight > window.innerHeight - 8) top = rect.top - menuHeight - 6;

  elements.actionMenu.style.left = `${left}px`;
  elements.actionMenu.style.top = `${Math.max(8, top)}px`;
  elements.actionMenu.classList.remove('hidden');
  elements.actionMenu.setAttribute('aria-hidden', 'false');
}

function fecharActionMenu() {
  elements.actionMenu.classList.add('hidden');
  elements.actionMenu.setAttribute('aria-hidden', 'true');
}

function handleActionMenuClick(event) {
  const button = event.target.closest('[data-budget-action]');
  if (!button || !state.orcamentoSelecionado) return;

  const orcamento = state.orcamentoSelecionado;
  const action = button.dataset.budgetAction;
  fecharActionMenu();

  if (['editar', 'aprovar', 'recusar'].includes(action) && orcamento.status !== 'Pendente') {
    showToast('Somente orçamentos pendentes podem ser editados ou ter o status alterado.', 'warning');
    return;
  }

  if (action === 'editar') abrirModalEditar(orcamento);
  else if (action === 'txt') baixarOrcamentoTxt(orcamento);
  else if (action === 'aprovar') abrirAcaoModal('aprovar', orcamento);
  else if (action === 'recusar') abrirAcaoModal('recusar', orcamento);
  else if (action === 'excluir') abrirAcaoModal('excluir', orcamento);
}

async function baixarOrcamentoTxt(orcamento) {
  if (!orcamento?.orcamentoId) return;

  const numero = formatOrcamentoNumero(orcamento.orcamentoId);

  try {
    const pecas = await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamento.orcamentoId}/pecas`);
    const listaPecas = Array.isArray(pecas) ? pecas : [];
    const cliente = getCliente(orcamento.clienteId);
    const veiculo = getVeiculo(orcamento.veiculoId);

    const totalPecas = listaPecas.reduce((total, item) => total + Number(item.subtotal ?? 0), 0);
    const maoDeObra = Number(orcamento.maoDeObra ?? 0);
    const totalCalculado = totalPecas + maoDeObra;
    const totalOrcamento = Number(orcamento.valorTotal ?? totalCalculado);

    const linhas = [
      'EIXO - SISTEMA DE GERENCIAMENTO DE OFICINA',
      '',
      `ORÇAMENTO ${numero}`,
      `Data: ${formatDateTime(orcamento.createdAt)}`,
      `Status: ${orcamento.status || 'Pendente'}`,
      '',
      'CLIENTE',
      `Nome: ${cliente?.nomeCliente || `Cliente #${orcamento.clienteId}`}`,
    ];

    if (cliente?.telefone) linhas.push(`Telefone: ${Formatters.formatPhone(cliente.telefone)}`);
    if (cliente?.cpfcnpj) linhas.push(`CPF/CNPJ: ${Formatters.formatCpfCnpj(cliente.cpfcnpj)}`);
    if (cliente?.email) linhas.push(`E-mail: ${cliente.email}`);

    linhas.push('', 'VEÍCULO');
    if (veiculo) {
      const marca = veiculo.modelo?.marca?.nomeMarca || '';
      const modelo = veiculo.modelo?.nomeModelo || '';
      const nomeVeiculo = [marca, modelo].filter(Boolean).join(' ') || `Veículo #${orcamento.veiculoId}`;
      linhas.push(`Veículo: ${nomeVeiculo}`);
      if (veiculo.placa) linhas.push(`Placa: ${formatPlate(veiculo.placa)}`);
      if (veiculo.ano) linhas.push(`Ano: ${veiculo.ano}`);
      if (veiculo.cor) linhas.push(`Cor: ${veiculo.cor}`);
      if (veiculo.combustivel) linhas.push(`Combustível: ${veiculo.combustivel}`);
      if (veiculo.quilometragem != null) linhas.push(`Quilometragem: ${Number(veiculo.quilometragem).toLocaleString('pt-BR')} km`);
    } else {
      linhas.push(`Veículo: #${orcamento.veiculoId}`);
    }

    linhas.push(
      '',
      'DESCRIÇÃO',
      orcamento.descricao || '—',
      '',
      'PEÇAS',
      '------------------------------------------------------------'
    );

    if (listaPecas.length === 0) {
      linhas.push('Nenhuma peça vinculada.');
    } else {
      listaPecas.forEach((item, index) => {
        linhas.push(`${index + 1}. ${item.nomePeca || `Peça #${item.estoqueId}`}`);
        linhas.push(`   Quantidade: ${formatQuantidadeTxt(item.quantidade)}`);
        linhas.push(`   Valor unitário: ${Formatters.formatCurrencyBRL(item.valor ?? 0)}`);
        linhas.push(`   Subtotal: ${Formatters.formatCurrencyBRL(item.subtotal ?? 0)}`);
      });
    }

    linhas.push(
      '------------------------------------------------------------',
      `Peças: ${Formatters.formatCurrencyBRL(totalPecas)}`,
      `Mão de obra: ${Formatters.formatCurrencyBRL(maoDeObra)}`,
      `TOTAL: ${Formatters.formatCurrencyBRL(totalOrcamento)}`,
      '',
      `Status: ${orcamento.status || 'Pendente'}`
    );

    const conteudo = `\uFEFF${linhas.join('\r\n')}\r\n`;
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento-${sanitizarNomeArquivo(numero)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast(`Arquivo ${numero}.txt gerado com sucesso.`, 'success');
  } catch (error) {
    showToast(getApiErrorMessage(error, 'Não foi possível gerar o arquivo TXT do orçamento.'), 'error');
  }
}

function formatQuantidadeTxt(value) {
  const numero = Number(value ?? 0);
  if (!Number.isFinite(numero)) return String(value ?? '0');
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function sanitizarNomeArquivo(value) {
  return String(value || 'orcamento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function preencherClientes() {
  elements.clienteId.innerHTML = '<option value="">Selecione</option>';
  state.clientes.forEach((cliente) => {
    const option = document.createElement('option');
    option.value = cliente.clienteId;
    option.textContent = cliente.nomeCliente;
    elements.clienteId.appendChild(option);
  });
}

async function handleClienteChange() {
  clearFieldError('clienteId');
  clearFieldError('veiculoId');
  const clienteId = elements.clienteId.value;

  if (!clienteId) {
    state.veiculosDoCliente = [];
    preencherVeiculosCliente();
    return;
  }

  await carregarVeiculosCliente(clienteId);
}

async function carregarVeiculosCliente(clienteId, veiculoSelecionado = null) {
  elements.veiculoId.disabled = true;
  elements.veiculoId.innerHTML = '<option value="">Carregando...</option>';

  try {
    const veiculos = await apiRequest(`/oficinas/${oficinaId}/veiculos/${clienteId}`);
    state.veiculosDoCliente = Array.isArray(veiculos) ? veiculos : [];
    preencherVeiculosCliente(veiculoSelecionado);
  } catch (error) {
    console.error(error);
    state.veiculosDoCliente = [];
    preencherVeiculosCliente();
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os veículos do cliente.'), 'error');
  }
}

function preencherVeiculosCliente(veiculoSelecionado = null) {
  elements.veiculoId.innerHTML = state.veiculosDoCliente.length
    ? '<option value="">Selecione</option>'
    : '<option value="">Nenhum veículo encontrado</option>';

  state.veiculosDoCliente.forEach((veiculo) => {
    const option = document.createElement('option');
    option.value = veiculo.idVeiculo;
    option.textContent = formatVeiculoLabel(veiculo);
    elements.veiculoId.appendChild(option);
  });

  elements.veiculoId.disabled = state.veiculosDoCliente.length === 0 || Boolean(state.orcamentoEmEdicao);
  if (veiculoSelecionado != null) elements.veiculoId.value = String(veiculoSelecionado);
}

function abrirModalNovo() {
  state.orcamentoEmEdicao = null;
  state.pecasOriginais = [];
  state.pecasEditor = [];
  state.veiculosDoCliente = [];

  elements.form.reset();
  clearFieldErrors();
  preencherClientes();
  preencherVeiculosCliente();
  elements.clienteId.disabled = false;
  elements.statusField.classList.add('hidden');
  elements.modalTitle.textContent = 'Novo orçamento';
  elements.btnSalvar.textContent = 'CRIAR';
  elements.maoDeObra.value = '';

  renderPecasEditor();
  atualizarResumo();
  abrirModalOrcamento();
}

async function abrirModalEditar(orcamento) {
  if (orcamento.status !== 'Pendente') {
    showToast('Orçamentos aprovados ou recusados não podem ser editados.', 'warning');
    return;
  }

  state.orcamentoEmEdicao = orcamento;
  state.pecasOriginais = [];
  state.pecasEditor = [];

  elements.form.reset();
  clearFieldErrors();
  preencherClientes();
  elements.modalTitle.textContent = `Editar ${formatOrcamentoNumero(orcamento.orcamentoId)}`;
  elements.btnSalvar.textContent = 'SALVAR';
  elements.clienteId.value = String(orcamento.clienteId);
  elements.clienteId.disabled = true;
  elements.maoDeObra.value = orcamento.maoDeObra != null ? Formatters.formatCurrencyBRL(orcamento.maoDeObra) : '';
  elements.descricao.value = orcamento.descricao || '';
  elements.statusField.classList.remove('hidden');
  elements.modalStatusBadge.innerHTML = renderStatusBadge(orcamento.status);

  const veiculo = getVeiculo(orcamento.veiculoId);
  state.veiculosDoCliente = veiculo ? [veiculo] : [];
  preencherVeiculosCliente(orcamento.veiculoId);
  elements.veiculoId.disabled = true;

  abrirModalOrcamento();

  try {
    const pecas = await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamento.orcamentoId}/pecas`);
    const lista = Array.isArray(pecas) ? pecas : [];
    state.pecasOriginais = lista.map((peca) => ({ ...peca }));
    state.pecasEditor = lista.map((peca) => ({
      key: `existing-${peca.idOcPecas}`,
      idOcPecas: peca.idOcPecas,
      estoqueId: peca.estoqueId,
      nomePeca: peca.nomePeca,
      valor: Number(peca.valor ?? 0),
      quantidade: Number(peca.quantidade ?? 0)
    }));
    renderPecasEditor();
    atualizarResumo();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível carregar as peças do orçamento.'), 'error');
  }
}

function abrirModalOrcamento() {
  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => (state.orcamentoEmEdicao ? elements.descricao : elements.clienteId).focus(), 0);
}

function fecharModalOrcamento() {
  if (state.salvando) return;
  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.orcamentoEmEdicao = null;
  state.pecasOriginais = [];
  state.pecasEditor = [];
  clearFieldErrors();
}

function handleMoneyInput(event) {
  event.target.value = Formatters.formatCurrencyInput(event.target.value);
  atualizarResumo();
}

function adicionarLinhaPeca() {
  state.pecasEditor.push({
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    idOcPecas: null,
    estoqueId: '',
    nomePeca: '',
    valor: 0,
    quantidade: 1
  });
  renderPecasEditor();
  atualizarResumo();
}

function handlePecasChange(event) {
  const row = event.target.closest('[data-piece-key]');
  if (!row) return;
  const item = state.pecasEditor.find((peca) => peca.key === row.dataset.pieceKey);
  if (!item) return;

  if (event.target.matches('[data-piece-field="estoqueId"]')) {
    const estoqueId = event.target.value;
    const duplicada = estoqueId && state.pecasEditor.some((peca) => peca.key !== item.key && String(peca.estoqueId) === String(estoqueId));
    if (duplicada) {
      event.target.value = '';
      item.estoqueId = '';
      item.nomePeca = '';
      item.valor = 0;
      showToast('Essa peça já foi adicionada ao orçamento.', 'warning');
    } else {
      const estoque = state.estoque.find((peca) => String(peca.estoqueId) === String(estoqueId));
      item.estoqueId = estoqueId;
      item.nomePeca = estoque?.nomePeca || '';
      item.valor = Number(estoque?.precoUnitario ?? 0);
    }
    renderPecasEditor();
    atualizarResumo();
  }
}

function handlePecasInput(event) {
  if (!event.target.matches('[data-piece-field="quantidade"]')) return;
  const row = event.target.closest('[data-piece-key]');
  if (!row) return;
  const item = state.pecasEditor.find((peca) => peca.key === row.dataset.pieceKey);
  if (!item) return;

  const raw = event.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
  item.quantidade = raw === '' ? 0 : Number(raw);
  atualizarResumo();
  atualizarSubtotalLinha(row, item);
}

function handlePecasClick(event) {
  const button = event.target.closest('[data-remove-piece]');
  if (!button) return;
  state.pecasEditor = state.pecasEditor.filter((peca) => peca.key !== button.dataset.removePiece);
  renderPecasEditor();
  atualizarResumo();
}

function renderPecasEditor() {
  elements.pecasEditor.innerHTML = '';
  elements.pecasEmptyHint.classList.toggle('hidden', state.pecasEditor.length > 0);

  state.pecasEditor.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'budget-part-row';
    row.dataset.pieceKey = item.key;

    const existing = Boolean(item.idOcPecas);
    const options = buildEstoqueOptions(item.estoqueId);
    const subtotal = getPecaSubtotal(item);

    row.innerHTML = `
      <select data-piece-field="estoqueId" ${existing ? 'disabled' : ''} aria-label="Peça do estoque">
        <option value="">Selecione uma peça</option>
        ${options}
      </select>
      <input data-piece-field="quantidade" inputmode="decimal" value="${escapeHtml(formatQuantityInput(item.quantidade))}" aria-label="Quantidade">
      <div class="budget-part-price" data-piece-subtotal>${escapeHtml(Formatters.formatCurrencyBRL(subtotal))}</div>
      <button class="budget-part-remove" type="button" data-remove-piece="${escapeHtml(item.key)}" title="Remover peça" aria-label="Remover peça">${iconTrash()}</button>
    `;
    elements.pecasEditor.appendChild(row);
  });
}

function buildEstoqueOptions(selectedId) {
  return state.estoque.map((peca) => {
    const selected = String(peca.estoqueId) === String(selectedId) ? 'selected' : '';
    const unidade = peca.unidadeMedida ? ` · ${peca.quantidade} ${peca.unidadeMedida}` : '';
    return `<option value="${escapeHtml(peca.estoqueId)}" ${selected}>${escapeHtml(peca.nomePeca)}${escapeHtml(unidade)} · ${escapeHtml(Formatters.formatCurrencyBRL(peca.precoUnitario))}</option>`;
  }).join('');
}

function atualizarSubtotalLinha(row, item) {
  const target = row.querySelector('[data-piece-subtotal]');
  if (target) target.textContent = Formatters.formatCurrencyBRL(getPecaSubtotal(item));
}

function getPecaSubtotal(item) {
  const qtd = Number(item.quantidade ?? 0);
  const valor = Number(item.valor ?? 0);
  return Number.isFinite(qtd) && Number.isFinite(valor) ? qtd * valor : 0;
}

function atualizarResumo() {
  const totalPecas = state.pecasEditor.reduce((sum, item) => sum + getPecaSubtotal(item), 0);
  const maoDeObra = Formatters.currencyToNumber(elements.maoDeObra.value);
  elements.resumoPecas.textContent = Formatters.formatCurrencyBRL(totalPecas);
  elements.resumoMaoDeObra.textContent = Formatters.formatCurrencyBRL(maoDeObra);
  elements.resumoTotal.textContent = Formatters.formatCurrencyBRL(totalPecas + maoDeObra);
}

async function salvarOrcamento(event) {
  event.preventDefault();
  if (state.salvando) return;

  const editando = Boolean(state.orcamentoEmEdicao);
  const payload = {
    maoDeObra: Formatters.currencyToNumber(elements.maoDeObra.value),
    descricao: elements.descricao.value.trim()
  };

  const clienteId = elements.clienteId.value;
  const veiculoId = elements.veiculoId.value;

  if (!validarOrcamento(payload, clienteId, veiculoId, editando)) return;
  if (!validarPecas()) return;

  setSaving(true);

  try {
    let orcamentoId;

    if (editando) {
      orcamentoId = state.orcamentoEmEdicao.orcamentoId;
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamentoId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      await sincronizarPecas(orcamentoId);
      showToast('Orçamento atualizado com sucesso.', 'success');
    } else {
      const criado = await apiRequest(`/oficinas/${oficinaId}/orcamentos/cliente/${clienteId}/veiculo/${veiculoId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      orcamentoId = criado?.orcamentoId;
      if (!orcamentoId) throw new Error('O backend não retornou o ID do orçamento criado.');
      await adicionarPecasNovas(orcamentoId, state.pecasEditor);
      showToast('Orçamento criado com sucesso.', 'success');
    }

    setSaving(false);
    fecharModalOrcamento();
    await recarregarDados();
  } catch (error) {
    console.error(error);
    handleSaveError(error);
  } finally {
    setSaving(false);
  }
}

function validarOrcamento(payload, clienteId, veiculoId, editando) {
  clearFieldErrors();
  let valid = true;

  if (!editando && !clienteId) { setFieldError('clienteId', 'Selecione o cliente.'); valid = false; }
  if (!editando && !veiculoId) { setFieldError('veiculoId', 'Selecione o veículo.'); valid = false; }
  if (!payload.descricao) { setFieldError('descricao', 'Informe a descrição.'); valid = false; }
  if (payload.descricao.length > 100) { setFieldError('descricao', 'A descrição deve ter até 100 caracteres.'); valid = false; }
  if (!Number.isFinite(payload.maoDeObra) || payload.maoDeObra < 0) { setFieldError('maoDeObra', 'Informe um valor válido.'); valid = false; }

  if (!valid) showToast('Revise os campos obrigatórios.', 'warning');
  return valid;
}

function validarPecas() {
  for (const item of state.pecasEditor) {
    if (!item.estoqueId) {
      showToast('Selecione a peça em todas as linhas adicionadas.', 'warning');
      return false;
    }
    if (!Number.isFinite(Number(item.quantidade)) || Number(item.quantidade) <= 0) {
      showToast('A quantidade das peças deve ser maior que zero.', 'warning');
      return false;
    }
  }
  return true;
}

async function sincronizarPecas(orcamentoId) {
  const atuaisPorId = new Map(
    state.pecasEditor.filter((item) => item.idOcPecas).map((item) => [String(item.idOcPecas), item])
  );

  for (const original of state.pecasOriginais) {
    const atual = atuaisPorId.get(String(original.idOcPecas));
    if (!atual) {
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamentoId}/pecas/${original.idOcPecas}`, { method: 'DELETE' });
      continue;
    }

    if (Number(atual.quantidade) !== Number(original.quantidade)) {
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamentoId}/pecas/${original.idOcPecas}/quantidade`, {
        method: 'PATCH',
        body: JSON.stringify({ quantidade: Number(atual.quantidade) })
      });
    }
  }

  const novas = state.pecasEditor.filter((item) => !item.idOcPecas);
  await adicionarPecasNovas(orcamentoId, novas);
}

async function adicionarPecasNovas(orcamentoId, pecas) {
  for (const item of pecas) {
    await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamentoId}/pecas/${item.estoqueId}`, {
      method: 'POST',
      body: JSON.stringify({ quantidade: Number(item.quantidade) })
    });
  }
}

async function recarregarDados() {
  try {
    const [orcamentos, veiculos, estoque] = await Promise.all([
      apiRequest(`/oficinas/${oficinaId}/orcamentos`),
      apiRequest(`/oficinas/${oficinaId}/veiculos`),
      apiRequest(`/oficinas/${oficinaId}/pecas`)
    ]);
    state.orcamentos = Array.isArray(orcamentos) ? orcamentos : [];
    state.veiculos = Array.isArray(veiculos) ? veiculos : [];
    state.estoque = Array.isArray(estoque) ? estoque : [];
    renderOrcamentos();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível atualizar os dados.'), 'error');
  }
}

function abrirAcaoModal(tipo, orcamento) {
  if (['aprovar', 'recusar'].includes(tipo) && orcamento.status !== 'Pendente') {
    showToast('Somente orçamentos pendentes podem ter o status alterado.', 'warning');
    return;
  }

  state.acaoPendente = { tipo, orcamento };
  const numero = formatOrcamentoNumero(orcamento.orcamentoId);

  const configs = {
    aprovar: {
      eyebrow: 'APROVAÇÃO',
      title: 'Aprovar orçamento',
      text: `Deseja aprovar o orçamento ${numero}?`,
      button: 'APROVAR'
    },
    recusar: {
      eyebrow: 'RECUSA',
      title: 'Recusar orçamento',
      text: `Deseja marcar o orçamento ${numero} como recusado?`,
      button: 'RECUSAR'
    },
    excluir: {
      eyebrow: 'EXCLUSÃO',
      title: 'Excluir orçamento',
      text: `Deseja excluir permanentemente o orçamento ${numero}?`,
      button: 'EXCLUIR'
    }
  };

  const config = configs[tipo];
  elements.acaoEyebrow.textContent = config.eyebrow;
  elements.acaoTitle.textContent = config.title;
  elements.acaoTexto.textContent = config.text;
  elements.btnConfirmarAcao.textContent = config.button;
  elements.btnConfirmarAcao.classList.toggle('danger', tipo === 'recusar' || tipo === 'excluir');
  elements.acaoModal.classList.remove('hidden');
  elements.acaoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharAcaoModal() {
  if (state.executandoAcao) return;
  state.acaoPendente = null;
  elements.acaoModal.classList.add('hidden');
  elements.acaoModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function executarAcaoPendente() {
  if (!state.acaoPendente || state.executandoAcao) return;
  const { tipo, orcamento } = state.acaoPendente;
  state.executandoAcao = true;
  elements.btnConfirmarAcao.disabled = true;
  elements.btnCancelarAcao.disabled = true;
  elements.btnFecharAcao.disabled = true;
  const originalText = elements.btnConfirmarAcao.textContent;
  elements.btnConfirmarAcao.textContent = 'AGUARDE...';

  try {
    if (['aprovar', 'recusar'].includes(tipo) && orcamento.status !== 'Pendente') {
      throw new Error('Somente orçamentos pendentes podem ter o status alterado.');
    }

    if (tipo === 'aprovar') {
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamento.orcamentoId}/aprovar`, { method: 'POST' });
      showToast('Orçamento aprovado com sucesso.', 'success');
    } else if (tipo === 'recusar') {
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamento.orcamentoId}/recusar`, { method: 'POST' });
      showToast('Orçamento recusado.', 'success');
    } else {
      await apiRequest(`/oficinas/${oficinaId}/orcamentos/${orcamento.orcamentoId}`, { method: 'DELETE' });
      showToast('Orçamento excluído com sucesso.', 'success');
    }

    state.executandoAcao = false;
    restaurarAcaoButtons(originalText);
    fecharAcaoModal();
    await recarregarDados();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível concluir a operação.'), 'error');
  } finally {
    state.executandoAcao = false;
    restaurarAcaoButtons(originalText);
  }
}

function restaurarAcaoButtons(text) {
  elements.btnConfirmarAcao.disabled = false;
  elements.btnCancelarAcao.disabled = false;
  elements.btnFecharAcao.disabled = false;
  elements.btnConfirmarAcao.textContent = text;
}

function handleSaveError(error) {
  const fieldErrors = extractValidationErrors(error?.body);
  if (fieldErrors.length) {
    fieldErrors.forEach(({ field, message }) => setFieldError(field, message));
    showToast('Revise os dados informados.', 'warning');
    return;
  }
  showToast(getApiErrorMessage(error, 'Não foi possível salvar o orçamento.'), 'error');
}

function extractValidationErrors(body) {
  if (!body) return [];
  if (Array.isArray(body.errors)) {
    return body.errors.map((item) => ({
      field: mapBackendField(item.field || item.campo),
      message: item.defaultMessage || item.message || item.mensagem || 'Valor inválido.'
    })).filter((item) => item.field);
  }
  if (body.errors && typeof body.errors === 'object') {
    return Object.entries(body.errors).map(([field, message]) => ({
      field: mapBackendField(field),
      message: String(message)
    })).filter((item) => item.field);
  }
  return [];
}

function mapBackendField(field) {
  return ({ descricao: 'descricao', maoDeObra: 'maoDeObra' })[field] || null;
}

function setFieldError(fieldName, message) {
  const input = elements.form.elements[fieldName];
  const error = elements.form.querySelector(`[data-error-for="${fieldName}"]`);
  if (input) input.classList.add('field-invalid');
  if (error) error.textContent = message;
}

function clearFieldError(fieldName) {
  const input = elements.form.elements[fieldName];
  const error = elements.form.querySelector(`[data-error-for="${fieldName}"]`);
  if (input) input.classList.remove('field-invalid');
  if (error) error.textContent = '';
}

function clearFieldErrors() {
  elements.form.querySelectorAll('.field-invalid').forEach((input) => input.classList.remove('field-invalid'));
  elements.form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
}

function setSaving(saving) {
  state.salvando = saving;
  elements.btnSalvar.disabled = saving;
  elements.btnCancelar.disabled = saving;
  elements.btnFecharModal.disabled = saving;
  elements.btnAdicionarLinhaPeca.disabled = saving;

  if (saving) {
    if (!elements.btnSalvar.dataset.originalText) elements.btnSalvar.dataset.originalText = elements.btnSalvar.textContent;
    elements.btnSalvar.textContent = 'SALVANDO...';
  } else if (elements.btnSalvar.dataset.originalText) {
    elements.btnSalvar.textContent = elements.btnSalvar.dataset.originalText;
    delete elements.btnSalvar.dataset.originalText;
  }
}

function setListLoading(loading) {
  if (loading) {
    elements.loading.classList.remove('hidden');
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.add('hidden');
    elements.count.textContent = 'Carregando...';
  } else {
    elements.loading.classList.add('hidden');
    renderOrcamentos();
  }
}

function handleEscape(event) {
  if (event.key !== 'Escape') return;
  if (!elements.actionMenu.classList.contains('hidden')) fecharActionMenu();
  else if (!elements.acaoModal.classList.contains('hidden')) fecharAcaoModal();
  else if (!elements.modal.classList.contains('hidden')) fecharModalOrcamento();
}

function getCliente(id) {
  return state.clientes.find((cliente) => String(cliente.clienteId) === String(id));
}

function getVeiculo(id) {
  return state.veiculos.find((veiculo) => String(veiculo.idVeiculo) === String(id));
}

function formatVeiculoLabel(veiculo) {
  if (!veiculo) return '';
  const marca = veiculo.modelo?.marca?.nomeMarca || '';
  const modelo = veiculo.modelo?.nomeModelo || '';
  const placa = formatPlate(veiculo.placa || '');
  return [marca, modelo].filter(Boolean).join(' ') + (placa ? ` · ${placa}` : '');
}

function formatOrcamentoNumero(id) {
  const value = String(id ?? '');
  return /^\d+$/.test(value) ? `ORC-${value.padStart(3, '0')}` : value;
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function renderStatusBadge(status) {
  const safe = ['Pendente', 'Aprovado', 'Recusado'].includes(status) ? status : 'Pendente';
  return `<span class="orcamento-status ${safe}">${escapeHtml(safe)}</span>`;
}

function formatQuantityInput(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : String(number).replace('.', ',');
}

function rawPlate(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

function formatPlate(value) {
  const raw = rawPlate(value);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function getApiErrorMessage(error, fallback) {
  return error?.body?.message || error?.body?.mensagem || error?.message || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function iconEdit() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
}
function iconCheck() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';
}
function iconX() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
}
function iconTrash() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>';
}
