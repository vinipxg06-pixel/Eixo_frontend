renderMenu('ordens-servico');
renderHeader('Ordens de Serviço');

const oficinaId = Session.getOficinaId();

/** Rótulos da lista padrão de motivos de cancelamento (valores = enum MotivoCancelamentoOrdemServico do backend). */
const MOTIVOS_CANCELAMENTO = {
  ClienteDesistiu: 'Cliente desistiu do serviço',
  ValorNaoAutorizado: 'Cliente não autorizou o valor',
  PecaIndisponivel: 'Peça indisponível no fornecedor',
  DefeitoNaoSolucionado: 'Defeito não identificado ou sem solução',
  AbertaPorEngano: 'OS aberta por engano',
  Outro: 'Outro'
};

const MENSAGEM_OS_BLOQUEADA = 'Somente ordens de serviço abertas podem ser alteradas, fechadas ou canceladas.';

const state = {
  ordens: [],
  clientes: [],
  estoque: [],
  filtro: '',
  osSelecionada: null,
  osEmEdicao: null,
  modoModal: 'novo', // novo | editar | visualizar
  veiculosDoCliente: [],
  pecasOriginais: [],
  pecasEditor: [],
  pecasCarregadas: true,
  salvando: false,
  fechando: false,
  carregandoFechamento: false,
  pecasFechamento: [], // [{ estoqueId, nomePeca, linhas: [{ valor, quantidade }], lancada, usada }]
  cancelando: false
};

const elements = {
  btnNova: document.getElementById('btnNovaOs'),
  busca: document.getElementById('buscaOs'),
  count: document.getElementById('osCount'),
  loading: document.getElementById('osLoading'),
  tableWrap: document.getElementById('osTableWrap'),
  tbody: document.getElementById('osTableBody'),
  empty: document.getElementById('osEmpty'),
  emptyText: document.getElementById('osEmptyText'),
  actionMenu: document.getElementById('osActionMenu'),

  modal: document.getElementById('osModal'),
  modalTitle: document.getElementById('osModalTitle'),
  btnFecharModal: document.getElementById('btnFecharOsModal'),
  btnCancelar: document.getElementById('btnCancelarOs'),
  btnSalvar: document.getElementById('btnSalvarOs'),
  form: document.getElementById('osForm'),
  clienteId: document.getElementById('osClienteId'),
  veiculoId: document.getElementById('osVeiculoId'),
  maoDeObra: document.getElementById('osMaoDeObra'),
  descricao: document.getElementById('osDescricao'),
  statusField: document.getElementById('osStatusField'),
  statusBadge: document.getElementById('osModalStatusBadge'),
  statusHint: document.getElementById('osStatusHint'),
  btnAdicionarPeca: document.getElementById('btnAdicionarPecaOs'),
  pecasAviso: document.getElementById('osPecasAviso'),
  pecasEditor: document.getElementById('osPecasEditor'),
  pecasEmptyHint: document.getElementById('osPecasEmptyHint'),
  resumoPecas: document.getElementById('osResumoPecas'),
  resumoMaoDeObra: document.getElementById('osResumoMaoDeObra'),
  resumoTotal: document.getElementById('osResumoTotal'),

  fecharModal: document.getElementById('fecharOsModal'),
  fecharTexto: document.getElementById('fecharOsTexto'),
  fecharSemCusto: document.getElementById('fecharOsSemCusto'),
  confirmarSemCusto: document.getElementById('confirmarSemCusto'),
  btnFecharConfirmModal: document.getElementById('btnFecharConfirmModal'),
  btnCancelarFechamento: document.getElementById('btnCancelarFechamento'),
  btnConfirmarFechamento: document.getElementById('btnConfirmarFechamento'),
  fecharPecas: document.getElementById('fecharOsPecas'),
  fecharPecasLista: document.getElementById('fecharOsPecasLista'),
  fecharTotal: document.getElementById('fecharOsTotal'),
  resumoAprovadoLinha: document.getElementById('osResumoAprovadoLinha'),
  resumoAprovado: document.getElementById('osResumoAprovado'),
  avisoDivergencia: document.getElementById('osAvisoDivergencia'),

  cancelarModal: document.getElementById('cancelarOsModal'),
  cancelarTexto: document.getElementById('cancelarOsTexto'),
  cancelarMotivo: document.getElementById('cancelarOsMotivo'),
  btnFecharCancelarModal: document.getElementById('btnFecharCancelarModal'),
  btnVoltarCancelamento: document.getElementById('btnVoltarCancelamento'),
  btnConfirmarCancelamento: document.getElementById('btnConfirmarCancelamento')
};

initOs();

function initOs() {
  if (!Session.exigirLogin()) return;

  elements.btnNova.addEventListener('click', abrirModalNovaOs);
  elements.busca.addEventListener('input', (event) => {
    state.filtro = event.target.value.trim();
    renderOrdens();
  });
  elements.tbody.addEventListener('click', handleTableClick);
  elements.actionMenu.addEventListener('click', handleActionMenuClick);

  document.addEventListener('click', (event) => {
    if (!elements.actionMenu.contains(event.target) && !event.target.closest('[data-action="menu-os"]')) {
      fecharActionMenu();
    }
  });
  window.addEventListener('resize', fecharActionMenu);
  window.addEventListener('scroll', fecharActionMenu, true);

  elements.btnFecharModal.addEventListener('click', fecharModalOs);
  elements.btnCancelar.addEventListener('click', fecharModalOs);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) fecharModalOs();
  });
  elements.form.addEventListener('submit', salvarOs);
  elements.clienteId.addEventListener('change', handleClienteChange);
  elements.maoDeObra.addEventListener('input', handleMoneyInput);
  elements.btnAdicionarPeca.addEventListener('click', adicionarLinhaPeca);
  elements.pecasEditor.addEventListener('change', handlePecasChange);
  elements.pecasEditor.addEventListener('input', handlePecasInput);
  elements.pecasEditor.addEventListener('click', handlePecasClick);

  elements.btnFecharConfirmModal.addEventListener('click', fecharConfirmModal);
  elements.btnCancelarFechamento.addEventListener('click', fecharConfirmModal);
  elements.btnConfirmarFechamento.addEventListener('click', executarFechamento);
  elements.confirmarSemCusto.addEventListener('change', atualizarBotaoFechamento);
  elements.fecharModal.addEventListener('click', (event) => {
    if (event.target === elements.fecharModal) fecharConfirmModal();
  });
  elements.fecharPecasLista.addEventListener('input', handleQuantidadeUsadaInput);

  preencherMotivosCancelamento();
  elements.btnFecharCancelarModal.addEventListener('click', fecharCancelarModal);
  elements.btnVoltarCancelamento.addEventListener('click', fecharCancelarModal);
  elements.btnConfirmarCancelamento.addEventListener('click', executarCancelamento);
  elements.cancelarMotivo.addEventListener('change', atualizarBotaoCancelamento);
  elements.cancelarModal.addEventListener('click', (event) => {
    if (event.target === elements.cancelarModal) fecharCancelarModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    fecharActionMenu();
    if (!elements.cancelarModal.classList.contains('hidden')) fecharCancelarModal();
    else if (!elements.fecharModal.classList.contains('hidden')) fecharConfirmModal();
    else if (!elements.modal.classList.contains('hidden')) fecharModalOs();
  });

  carregarDadosIniciais();
}

async function carregarDadosIniciais() {
  setListLoading(true);
  try {
    const [ordens, clientes, estoque] = await Promise.all([
      apiRequest(`/oficinas/${oficinaId}/ordens-servico`),
      apiRequest(`/oficinas/${oficinaId}/clientes`),
      apiRequest(`/oficinas/${oficinaId}/pecas`)
    ]);

    state.ordens = Array.isArray(ordens) ? ordens : [];
    state.clientes = Array.isArray(clientes) ? clientes : [];
    state.estoque = Array.isArray(estoque) ? estoque : [];

    preencherClientes();
    await enriquecerVeiculosDaListagem();
    renderOrdens();
  } catch (error) {
    console.error(error);
    state.ordens = [];
    renderOrdens();
    showToast(ApiErros.mensagem(error, 'Não foi possível carregar as ordens de serviço.'), 'error');
  } finally {
    setListLoading(false);
  }
}

async function enriquecerVeiculosDaListagem() {
  const clientesIds = [...new Set(state.ordens.map((os) => os.clienteId).filter(Boolean))];
  const mapa = new Map();

  await Promise.all(clientesIds.map(async (clienteId) => {
    try {
      const veiculos = await apiRequest(`/oficinas/${oficinaId}/clientes/${clienteId}/veiculos`);
      (Array.isArray(veiculos) ? veiculos : []).forEach((veiculo) => mapa.set(String(veiculo.idVeiculo), veiculo));
    } catch (error) {
      console.warn('Não foi possível carregar veículos do cliente', clienteId, error);
    }
  }));

  state.veiculosMap = mapa;
}

function renderOrdens() {
  const termo = normalizeSearch(state.filtro);
  const filtradas = state.ordens.filter((os) => {
    if (!termo) return true;
    const cliente = getCliente(os.clienteId);
    const veiculo = getVeiculo(os.veiculoId);
    return [
      formatOsNumero(os.idOrdemServico),
      cliente?.nomeCliente,
      formatVeiculoLabel(veiculo),
      os.descricao,
      os.status,
      os.valorTotal,
      os.dataAbertura
    ].some((value) => normalizeSearch(value).includes(termo));
  });

  elements.count.textContent = `${state.ordens.length} ${state.ordens.length === 1 ? 'cadastrada' : 'cadastradas'}`;
  elements.tbody.innerHTML = '';

  if (filtradas.length === 0) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = state.filtro
      ? 'Nenhuma ordem de serviço corresponde à busca.'
      : 'Crie a primeira ordem de serviço da oficina.';
    return;
  }

  elements.empty.classList.add('hidden');
  elements.tableWrap.classList.remove('hidden');

  const fragment = document.createDocumentFragment();
  filtradas.forEach((os) => {
    const cliente = getCliente(os.clienteId);
    const veiculo = getVeiculo(os.veiculoId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="os-numero">${escapeHtml(formatOsNumero(os.idOrdemServico))}</td>
      <td class="os-cliente" title="${escapeHtml(cliente?.nomeCliente || '')}">${escapeHtml(cliente?.nomeCliente || `Cliente #${os.clienteId}`)}</td>
      <td class="os-veiculo" title="${escapeHtml(formatVeiculoLabel(veiculo))}">${escapeHtml(formatVeiculoLabel(veiculo) || `Veículo #${os.veiculoId}`)}</td>
      <td class="os-data">${escapeHtml(formatDate(os.dataAbertura || os.createdAt))}</td>
      <td class="os-total">${renderTotalDaLista(os)}</td>
      <td>${renderStatusBadge(os.status)}</td>
      <td class="os-actions-col">
        <div class="os-row-actions">
          <button class="os-icon-btn" type="button" data-action="menu-os" data-id="${os.idOrdemServico}" title="Ações da OS" aria-label="Ações da ${escapeHtml(formatOsNumero(os.idOrdemServico))}">
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
  const button = event.target.closest('[data-action="menu-os"]');
  if (!button) return;
  const os = state.ordens.find((item) => String(item.idOrdemServico) === String(button.dataset.id));
  if (!os) return;
  abrirActionMenu(button, os);
}

function abrirActionMenu(anchor, os) {
  state.osSelecionada = os;
  const aberta = os.status === 'Aberta';

  elements.actionMenu.querySelector('[data-os-action="editar"]').classList.toggle('hidden', !aberta);
  elements.actionMenu.querySelector('[data-os-action="fechar"]').classList.toggle('hidden', !aberta);
  elements.actionMenu.querySelector('[data-os-action="cancelar"]').classList.toggle('hidden', !aberta);

  const visibleCount = aberta ? 4 : 1;
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
  const button = event.target.closest('[data-os-action]');
  if (!button || !state.osSelecionada) return;

  const os = state.osSelecionada;
  const action = button.dataset.osAction;
  fecharActionMenu();

  if (['editar', 'fechar', 'cancelar'].includes(action) && os.status !== 'Aberta') {
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }

  if (action === 'visualizar') abrirModalVisualizar(os);
  else if (action === 'editar') abrirModalEditar(os);
  else if (action === 'fechar') abrirFecharModal(os);
  else if (action === 'cancelar') abrirCancelarModal(os);
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
  clearFieldError('osClienteId');
  clearFieldError('osVeiculoId');
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
    const veiculos = await apiRequest(`/oficinas/${oficinaId}/clientes/${clienteId}/veiculos`);
    state.veiculosDoCliente = Array.isArray(veiculos) ? veiculos : [];
    state.veiculosDoCliente.forEach((veiculo) => state.veiculosMap?.set(String(veiculo.idVeiculo), veiculo));
    preencherVeiculosCliente(veiculoSelecionado);
  } catch (error) {
    state.veiculosDoCliente = [];
    preencherVeiculosCliente();
    showToast(ApiErros.mensagem(error, 'Não foi possível carregar os veículos do cliente.'), 'error');
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

  if (veiculoSelecionado != null) elements.veiculoId.value = String(veiculoSelecionado);
  elements.veiculoId.disabled = state.modoModal !== 'novo' || state.veiculosDoCliente.length === 0;
}

function abrirModalNovaOs() {
  resetModal();
  state.modoModal = 'novo';
  state.osEmEdicao = null;
  state.pecasCarregadas = true;
  elements.modalTitle.textContent = 'Nova ordem de serviço';
  elements.btnSalvar.textContent = 'CRIAR';
  elements.statusField.classList.add('hidden');
  setFormReadonly(false);
  elements.clienteId.disabled = false;
  elements.veiculoId.disabled = true;
  elements.btnAdicionarPeca.disabled = false;
  renderPecasEditor();
  atualizarResumo();
  abrirModal();
}

async function abrirModalEditar(os) {
  if (os.status !== 'Aberta') {
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }

  resetModal();
  state.modoModal = 'editar';
  state.osEmEdicao = os;
  elements.modalTitle.textContent = `Editar ${formatOsNumero(os.idOrdemServico)}`;
  elements.btnSalvar.textContent = 'SALVAR';
  elements.statusField.classList.remove('hidden');
  elements.statusBadge.innerHTML = renderStatusBadge(os.status);
  elements.statusHint.textContent = 'A OS será bloqueada após o fechamento ou cancelamento.';

  elements.clienteId.value = String(os.clienteId ?? '');
  await carregarVeiculosCliente(os.clienteId, os.veiculoId);
  elements.clienteId.disabled = true;
  elements.veiculoId.disabled = true;
  elements.maoDeObra.value = Formatters.formatCurrencyBRL(os.maoDeObra ?? 0);
  elements.descricao.value = os.descricao || '';

  setFormReadonly(false);
  elements.clienteId.disabled = true;
  elements.veiculoId.disabled = true;
  await carregarPecasDaOs(os.idOrdemServico);
  renderPecasEditor();
  atualizarResumo();
  abrirModal();
}

async function abrirModalVisualizar(os) {
  resetModal();
  state.modoModal = 'visualizar';
  state.osEmEdicao = os;
  elements.modalTitle.textContent = `Visualizar ${formatOsNumero(os.idOrdemServico)}`;
  elements.statusField.classList.remove('hidden');
  elements.statusBadge.innerHTML = renderStatusBadge(os.status);
  elements.statusHint.textContent = descreverStatus(os);

  elements.clienteId.value = String(os.clienteId ?? '');
  await carregarVeiculosCliente(os.clienteId, os.veiculoId);
  elements.maoDeObra.value = Formatters.formatCurrencyBRL(os.maoDeObra ?? 0);
  elements.descricao.value = os.descricao || '';

  setFormReadonly(true);
  await carregarPecasDaOs(os.idOrdemServico);
  renderPecasEditor();
  atualizarResumo();
  abrirModal();
}

function abrirModal() {
  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharModalOs() {
  if (state.salvando) return;
  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function resetModal() {
  elements.form.reset();
  clearAllErrors();
  state.veiculosDoCliente = [];
  state.pecasOriginais = [];
  state.pecasEditor = [];
  state.pecasCarregadas = true;
  elements.veiculoId.innerHTML = '<option value="">Selecione um cliente</option>';
  elements.pecasAviso.classList.add('hidden');
  elements.pecasAviso.textContent = '';
  elements.statusField.classList.add('hidden');
  elements.btnSalvar.classList.remove('hidden');
  state.osEmEdicao = null;
}

function setFormReadonly(readonly) {
  elements.clienteId.disabled = readonly || state.modoModal !== 'novo';
  elements.veiculoId.disabled = readonly || state.modoModal !== 'novo' || state.veiculosDoCliente.length === 0;
  elements.maoDeObra.disabled = readonly;
  elements.descricao.disabled = readonly;
  elements.btnAdicionarPeca.disabled = readonly;
  elements.btnSalvar.classList.toggle('hidden', readonly);
}

async function carregarPecasDaOs(ordemServicoId) {
  state.pecasOriginais = [];
  state.pecasEditor = [];
  state.pecasCarregadas = true;
  elements.pecasAviso.classList.add('hidden');

  try {
    // Este GET é o contrato necessário para reconstruir as peças de uma OS já existente.
    // Se ainda não estiver implementado no backend, a tela continua funcional para os demais dados
    // e informa claramente a limitação apenas no gerenciamento das peças existentes.
    const pecas = await apiRequest(`/oficinas/${oficinaId}/ordens-servico/${ordemServicoId}/pecas`);
    const lista = Array.isArray(pecas) ? pecas : [];
    state.pecasOriginais = lista.map(normalizeOsPeca);
    state.pecasEditor = state.pecasOriginais.map((item) => ({ ...item }));
  } catch (error) {
    console.warn('Listagem de peças da OS indisponível:', error);
    state.pecasCarregadas = false;
    elements.pecasAviso.textContent = 'O backend atual não disponibilizou a listagem das peças desta OS. Os dados gerais podem ser consultados normalmente, mas as peças existentes só poderão ser gerenciadas quando o endpoint GET de peças da OS estiver disponível.';
    elements.pecasAviso.classList.remove('hidden');
    elements.btnAdicionarPeca.disabled = true;
  }
}

function normalizeOsPeca(item) {
  return {
    idOsPecas: item.idOsPecas ?? null,
    estoqueId: Number(item.estoqueId),
    nomePeca: item.nomePeca || getEstoqueItem(item.estoqueId)?.nomePeca || '',
    quantidade: Number(item.quantidade ?? 0),
    valor: Number(item.valor ?? getEstoqueItem(item.estoqueId)?.precoUnitario ?? 0),
    valorTotal: Number(item.valorTotal ?? (Number(item.quantidade ?? 0) * Number(item.valor ?? 0))),
    quantidadeOriginal: Number(item.quantidade ?? 0),
    isNew: false
  };
}

function adicionarLinhaPeca() {
  if (state.modoModal === 'visualizar' || !state.pecasCarregadas) return;
  state.pecasEditor.push({
    idOsPecas: null,
    estoqueId: null,
    nomePeca: '',
    quantidade: 1,
    valor: 0,
    valorTotal: 0,
    quantidadeOriginal: null,
    isNew: true
  });
  renderPecasEditor();
  atualizarResumo();
}

function renderPecasEditor() {
  elements.pecasEditor.innerHTML = '';
  elements.pecasEmptyHint.classList.toggle('hidden', state.pecasEditor.length > 0);

  state.pecasEditor.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'os-part-row';
    const readonly = state.modoModal === 'visualizar' || !state.pecasCarregadas;

    row.innerHTML = `
      <select data-piece-field="estoqueId" data-index="${index}" data-pesquisavel aria-label="Peça do estoque" ${readonly || !item.isNew ? 'disabled' : ''}>
        ${renderEstoqueOptions(item.estoqueId, index)}
      </select>
      <input data-piece-field="quantidade" data-index="${index}" type="number" min="0.01" step="0.01" value="${escapeHtml(formatNumberInput(item.quantidade))}" ${readonly ? 'disabled' : ''}>
      <span class="os-part-price">
        <span data-piece-subtotal>${escapeHtml(Formatters.formatCurrencyBRL(calcularSubtotal(item)))}</span>
        <small class="part-unit-price" data-piece-unit>${renderDescricaoPreco(item)}</small>
      </span>
      <button class="os-part-remove" type="button" data-piece-action="remove" data-index="${index}" aria-label="Remover peça" ${readonly ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M8 11v6"></path><path d="M12 11v6"></path><path d="M16 11v6"></path><path d="M6 7l1 13h10l1-13"></path></svg>
      </button>
    `;
    elements.pecasEditor.appendChild(row);
  });
}

function renderEstoqueOptions(selectedId, currentIndex) {
  const used = new Set(state.pecasEditor
    .filter((_, index) => index !== currentIndex)
    .map((item) => String(item.estoqueId))
    .filter((value) => value && value !== 'null'));

  let html = '<option value="">Selecione a peça</option>';
  state.estoque.forEach((peca) => {
    const selected = String(peca.estoqueId) === String(selectedId);
    if (peca.ativa === false && !selected) return; // peça inativa não é oferecida para novas linhas
    const disabled = used.has(String(peca.estoqueId)) && !selected;
    const qtd = formatQuantidadeEstoque(peca.quantidade, peca.unidadeMedida);
    html += `<option value="${peca.estoqueId}" ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${escapeHtml(peca.nomePeca)} — ${escapeHtml(qtd)}</option>`;
  });
  return html;
}

function handlePecasChange(event) {
  const field = event.target.dataset.pieceField;
  const index = Number(event.target.dataset.index);
  if (!field || !Number.isInteger(index) || !state.pecasEditor[index]) return;

  const item = state.pecasEditor[index];
  if (field === 'estoqueId') {
    item.estoqueId = event.target.value ? Number(event.target.value) : null;
    const estoque = getEstoqueItem(item.estoqueId);
    item.nomePeca = estoque?.nomePeca || '';
    item.valor = Number(estoque?.precoUnitario ?? 0);
  }
  renderPecasEditor();
  atualizarResumo();
}

function handlePecasInput(event) {
  const field = event.target.dataset.pieceField;
  const index = Number(event.target.dataset.index);
  if (field !== 'quantidade' || !Number.isInteger(index) || !state.pecasEditor[index]) return;
  state.pecasEditor[index].quantidade = Number(event.target.value || 0);
  const row = event.target.closest('.os-part-row');
  const subtotal = row?.querySelector('[data-piece-subtotal]');
  const unitario = row?.querySelector('[data-piece-unit]');
  if (subtotal) subtotal.textContent = Formatters.formatCurrencyBRL(calcularSubtotal(state.pecasEditor[index]));
  if (unitario) unitario.innerHTML = renderDescricaoPreco(state.pecasEditor[index]);
  atualizarResumo();
}

function handlePecasClick(event) {
  const button = event.target.closest('[data-piece-action="remove"]');
  if (!button || state.modoModal === 'visualizar') return;
  const index = Number(button.dataset.index);
  if (!Number.isInteger(index)) return;
  state.pecasEditor.splice(index, 1);
  renderPecasEditor();
  atualizarResumo();
}

function handleMoneyInput(event) {
  event.target.value = Formatters.formatCurrencyInput(event.target.value);
  clearFieldError('osMaoDeObra');
  atualizarResumo();
}

function atualizarResumo() {
  const totalPecas = state.pecasEditor.reduce((sum, item) => sum + calcularSubtotal(item), 0);
  const maoDeObra = Formatters.currencyToNumber(elements.maoDeObra.value);
  elements.resumoPecas.textContent = Formatters.formatCurrencyBRL(totalPecas || 0);
  elements.resumoMaoDeObra.textContent = Formatters.formatCurrencyBRL(maoDeObra || 0);
  elements.resumoTotal.textContent = Formatters.formatCurrencyBRL(totalPecas + maoDeObra);
  atualizarComparacaoComAprovado(totalPecas + maoDeObra);
}

/**
 * OS vinda de orçamento: mostra o valor que o cliente aprovou e avisa quando o total atual é diferente.
 * É só informativo: a oficina pode incluir ou retirar peças durante o conserto.
 */
function atualizarComparacaoComAprovado(totalAtual) {
  const aprovado = state.osEmEdicao?.valorAprovado;
  const cancelada = state.osEmEdicao?.status === 'Cancelada'; // nada foi cobrado, não há o que comparar
  const temAprovado = !cancelada && aprovado !== null && aprovado !== undefined;
  elements.resumoAprovadoLinha.classList.toggle('hidden', !temAprovado);
  elements.avisoDivergencia.classList.add('hidden');
  if (!temAprovado) return;

  elements.resumoAprovado.textContent = Formatters.formatCurrencyBRL(aprovado);
  const diferenca = arredondar(totalAtual - Number(aprovado));
  if (diferenca === 0) return;
  const sentido = diferenca > 0 ? 'acima' : 'abaixo';
  elements.avisoDivergencia.textContent = `O total está ${Formatters.formatCurrencyBRL(Math.abs(diferenca))} ${sentido} do valor aprovado pelo cliente.`;
  elements.avisoDivergencia.classList.remove('hidden');
}

function valorDivergeDoAprovado(os) {
  if (os.valorAprovado === null || os.valorAprovado === undefined) return false;
  return arredondar(Number(os.valorTotal ?? 0) - Number(os.valorAprovado)) !== 0;
}

/** OS cancelada não foi cobrada: o total fica riscado, só como histórico do que estava lançado. */
function renderTotalDaLista(os) {
  const total = escapeHtml(Formatters.formatCurrencyBRL(os.valorTotal ?? 0));
  if (os.status === 'Cancelada') {
    return `<s class="os-total-cancelado" title="OS cancelada: valor não faturado">${total}</s><small class="os-total-nao-faturado">não faturado</small>`;
  }
  return `${total}${renderAprovadoDivergente(os)}`;
}

function renderAprovadoDivergente(os) {
  if (!valorDivergeDoAprovado(os)) return '';
  return `<small class="os-total-aprovado" title="Valor aprovado no orçamento">aprovado ${escapeHtml(Formatters.formatCurrencyBRL(os.valorAprovado))}</small>`;
}

function arredondar(valor) {
  return Math.round(Number(valor) * 100) / 100;
}

function getPrecoAtual(estoqueId) {
  const estoque = getEstoqueItem(estoqueId);
  return estoque ? Number(estoque.precoUnitario) : NaN;
}

function calcularSubtotal(item) {
  const subtotal = PrecificacaoPecas.subtotal(item, getPrecoAtual(item.estoqueId));
  return Number.isFinite(subtotal) ? subtotal : 0;
}

function renderDescricaoPreco(item) {
  if (!item.estoqueId) return '';
  const { base, destaque } = PrecificacaoPecas.descricao(item, getPrecoAtual(item.estoqueId));
  return `${escapeHtml(base)}${destaque ? `<span class="preco-atual">${escapeHtml(destaque)}</span>` : ''}`;
}

/**
 * Estado final das peças, enviado junto com a OS numa única requisição.
 * O backend grava tudo (inclusive a movimentação de estoque) numa transação: se algo falhar, nada é salvo.
 */
function montarLinhasPecas() {
  return state.pecasEditor.map((item) => ({
    idLinha: item.idOsPecas || null,
    estoqueId: Number(item.estoqueId),
    quantidade: Number(item.quantidade)
  }));
}

async function salvarOs(event) {
  event.preventDefault();
  if (state.salvando || state.modoModal === 'visualizar') return;

  if (state.osEmEdicao && state.osEmEdicao.status !== 'Aberta') {
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }

  clearAllErrors();
  const clienteId = elements.clienteId.value;
  const veiculoId = elements.veiculoId.value;
  const descricao = elements.descricao.value.trim();
  const maoDeObra = Formatters.currencyToNumber(elements.maoDeObra.value);

  let valid = true;
  if (state.modoModal === 'novo' && !clienteId) { setFieldError('osClienteId', 'Selecione o cliente.'); valid = false; }
  if (state.modoModal === 'novo' && !veiculoId) { setFieldError('osVeiculoId', 'Selecione o veículo.'); valid = false; }
  if (!descricao) { setFieldError('osDescricao', 'Informe a descrição do serviço.'); valid = false; }
  if (descricao.length > 100) { setFieldError('osDescricao', 'A descrição deve ter no máximo 100 caracteres.'); valid = false; }
  if (maoDeObra < 0) { setFieldError('osMaoDeObra', 'A mão de obra não pode ser negativa.'); valid = false; }

  if (state.pecasCarregadas && !validarPecas()) valid = false;
  if (!valid) return;

  // Peças vão na mesma requisição; null = peças não carregadas, o backend não as altera
  const payload = { maoDeObra, descricao, pecas: state.pecasCarregadas ? montarLinhasPecas() : null };
  setSaving(true);

  try {
    let osSalva;
    if (state.modoModal === 'novo') {
      osSalva = await apiRequest(`/oficinas/${oficinaId}/ordens-servico`, {
        method: 'POST',
        body: JSON.stringify({ ...payload, clienteId: Number(clienteId), veiculoId: Number(veiculoId) })
      });
      state.ordens.unshift(osSalva);
      state.veiculosMap?.set(String(veiculoId), state.veiculosDoCliente.find((v) => String(v.idVeiculo) === String(veiculoId)));
      showToast('Ordem de serviço criada com sucesso.', 'success');
    } else {
      osSalva = await apiRequest(`/oficinas/${oficinaId}/ordens-servico/${state.osEmEdicao.idOrdemServico}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      replaceOs(osSalva);
      showToast('Ordem de serviço atualizada com sucesso.', 'success');
    }

    fecharModalOs();
    await atualizarListaAposMutacao();
  } catch (error) {
    console.error(error);
    showToast(ApiErros.mensagem(error, 'Não foi possível salvar a ordem de serviço.'), 'error');
  } finally {
    setSaving(false);
  }
}

function validarPecas() {
  for (let index = 0; index < state.pecasEditor.length; index += 1) {
    const item = state.pecasEditor[index];
    if (!item.estoqueId) {
      showToast(`Selecione a peça na linha ${index + 1}.`, 'warning');
      return false;
    }
    if (!(Number(item.quantidade) > 0)) {
      showToast(`Informe uma quantidade válida na linha ${index + 1}.`, 'warning');
      return false;
    }
    const estoque = getEstoqueItem(item.estoqueId);
    if (estoque && Number(item.quantidade) > Number(estoque.quantidade) && item.isNew) {
      showToast(`A quantidade de ${estoque.nomePeca} é maior que o estoque disponível.`, 'warning');
      return false;
    }
  }
  return true;
}

/**
 * Fechamento: o usuário confirma quanto de cada peça foi realmente usado (só é possível reduzir).
 * O que não foi usado volta ao estoque e deixa de ser cobrado. Quando uma peça tem linhas com preços
 * diferentes, as unidades devolvidas saem das adicionadas por último (mesma regra do backend).
 */
async function abrirFecharModal(os) {
  if (os.status !== 'Aberta') {
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }
  state.osSelecionada = os;
  state.pecasFechamento = [];
  state.carregandoFechamento = true;
  elements.fecharTexto.textContent = `Deseja fechar a ${formatOsNumero(os.idOrdemServico)}?`;
  elements.confirmarSemCusto.checked = false;
  renderPecasFechamento();
  atualizarFechamento();
  elements.fecharModal.classList.remove('hidden');
  elements.fecharModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  try {
    const linhas = await apiRequest(`/oficinas/${oficinaId}/ordens-servico/${os.idOrdemServico}/pecas`);
    state.pecasFechamento = agruparPecasParaFechamento(Array.isArray(linhas) ? linhas : []);
  } catch (error) {
    state.carregandoFechamento = false;
    fecharConfirmModal();
    showToast(ApiErros.mensagem(error, 'Não foi possível carregar as peças da ordem de serviço.'), 'error');
    return;
  }
  state.carregandoFechamento = false;
  renderPecasFechamento();
  atualizarFechamento();
}

/** Junta as linhas (uma por preço) de cada peça; as linhas ficam na ordem em que foram adicionadas. */
function agruparPecasParaFechamento(linhas) {
  const porPeca = new Map();
  [...linhas]
    .sort((a, b) => Number(a.idOsPecas) - Number(b.idOsPecas))
    .forEach((linha) => {
      const estoqueId = Number(linha.estoqueId);
      if (!porPeca.has(estoqueId)) {
        porPeca.set(estoqueId, {
          estoqueId,
          nomePeca: linha.nomePeca || getEstoqueItem(estoqueId)?.nomePeca || `Peça #${estoqueId}`,
          linhas: [],
          lancada: 0,
          usada: 0
        });
      }
      const peca = porPeca.get(estoqueId);
      const quantidade = Number(linha.quantidade ?? 0);
      peca.linhas.push({ valor: Number(linha.valor ?? 0), quantidade });
      peca.lancada = arredondar(peca.lancada + quantidade);
      peca.usada = peca.lancada;
    });
  return [...porPeca.values()];
}

/** Valor cobrado pelas unidades usadas: as primeiras unidades adicionadas são as que ficam na OS. */
function valorUsado(peca) {
  let restante = peca.usada;
  let total = 0;
  peca.linhas.forEach((linha) => {
    const unidades = Math.min(restante, linha.quantidade);
    total += unidades * linha.valor;
    restante -= unidades;
  });
  return total;
}

function quantidadeUsadaValida(peca) {
  return Number.isFinite(peca.usada) && peca.usada >= 0 && peca.usada <= peca.lancada;
}

function renderPecasFechamento() {
  const pecas = state.pecasFechamento;
  elements.fecharPecas.classList.toggle('hidden', pecas.length === 0);
  elements.fecharPecasLista.innerHTML = pecas.map((peca, index) => `
    <div class="os-fechar-peca">
      <span class="os-fechar-peca-nome" title="${escapeHtml(peca.nomePeca)}">${escapeHtml(peca.nomePeca)}</span>
      <span class="os-fechar-peca-lancada">${escapeHtml(formatNumberInput(peca.lancada))}</span>
      <input data-index="${index}" type="number" min="0" max="${peca.lancada}" step="0.01" value="${escapeHtml(formatNumberInput(peca.usada))}" aria-label="Quantidade usada de ${escapeHtml(peca.nomePeca)}">
    </div>
  `).join('');
}

function handleQuantidadeUsadaInput(event) {
  const input = event.target.closest('input[data-index]');
  if (!input) return;
  const peca = state.pecasFechamento[Number(input.dataset.index)];
  if (!peca) return;
  peca.usada = input.value === '' ? NaN : Number(String(input.value).replace(',', '.'));
  input.classList.toggle('field-invalid', !quantidadeUsadaValida(peca));
  input.title = quantidadeUsadaValida(peca) ? '' : `Informe de 0 a ${formatNumberInput(peca.lancada)}.`;
  atualizarFechamento();
}

function totalDoFechamento() {
  const maoDeObra = Number(state.osSelecionada?.maoDeObra ?? 0);
  const pecas = state.pecasFechamento.reduce((soma, peca) => soma + (quantidadeUsadaValida(peca) ? valorUsado(peca) : 0), 0);
  return arredondar(maoDeObra + pecas);
}

/** Regra: OS sem valor pode ser fechada (ex.: garantia), mas só com confirmação explícita. */
function fechamentoSemCusto() {
  return totalDoFechamento() === 0;
}

function atualizarFechamento() {
  const semCusto = !state.carregandoFechamento && fechamentoSemCusto();
  elements.fecharTotal.textContent = state.carregandoFechamento ? '...' : Formatters.formatCurrencyBRL(totalDoFechamento());
  elements.fecharSemCusto.classList.toggle('hidden', !semCusto);
  atualizarBotaoFechamento();
}

function atualizarBotaoFechamento() {
  const quantidadesInvalidas = state.pecasFechamento.some((peca) => !quantidadeUsadaValida(peca));
  const precisaConfirmar = !state.carregandoFechamento && fechamentoSemCusto() && !elements.confirmarSemCusto.checked;
  elements.btnConfirmarFechamento.disabled = state.fechando || state.carregandoFechamento || quantidadesInvalidas || precisaConfirmar;
}

function fecharConfirmModal() {
  if (state.fechando) return;
  elements.fecharModal.classList.add('hidden');
  elements.fecharModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function executarFechamento() {
  const os = state.osSelecionada;
  if (!os || state.fechando || state.carregandoFechamento) return;
  if (os.status !== 'Aberta') {
    fecharConfirmModal();
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }

  const payload = {
    pecas: state.pecasFechamento.map((peca) => ({ estoqueId: peca.estoqueId, quantidadeUtilizada: peca.usada })),
    confirmarSemCusto: fechamentoSemCusto()
  };

  state.fechando = true;
  elements.btnConfirmarFechamento.disabled = true;
  elements.btnConfirmarFechamento.textContent = 'FECHANDO...';

  try {
    const atualizada = await apiRequest(`/oficinas/${oficinaId}/ordens-servico/${os.idOrdemServico}/fechar`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    replaceOs(atualizada);
    state.fechando = false;
    fecharConfirmModal();
    showToast('Ordem de serviço fechada com sucesso.', 'success');
    await atualizarListaAposMutacao();
  } catch (error) {
    showToast(ApiErros.mensagem(error, 'Não foi possível fechar a ordem de serviço.'), 'error');
  } finally {
    state.fechando = false;
    elements.btnConfirmarFechamento.textContent = 'FECHAR OS';
    atualizarBotaoFechamento();
  }
}

// ---------- Cancelamento ----------

function preencherMotivosCancelamento() {
  Object.entries(MOTIVOS_CANCELAMENTO).forEach(([valor, rotulo]) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = rotulo;
    elements.cancelarMotivo.appendChild(option);
  });
}

function abrirCancelarModal(os) {
  if (os.status !== 'Aberta') {
    showToast(MENSAGEM_OS_BLOQUEADA, 'warning');
    return;
  }
  state.osSelecionada = os;
  elements.cancelarTexto.textContent = `Deseja cancelar a ${formatOsNumero(os.idOrdemServico)}?`;
  elements.cancelarMotivo.value = '';
  atualizarBotaoCancelamento();
  elements.cancelarModal.classList.remove('hidden');
  elements.cancelarModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  elements.cancelarMotivo.focus();
}

function atualizarBotaoCancelamento() {
  elements.btnConfirmarCancelamento.disabled = state.cancelando || !elements.cancelarMotivo.value;
}

function fecharCancelarModal() {
  if (state.cancelando) return;
  elements.cancelarModal.classList.add('hidden');
  elements.cancelarModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function executarCancelamento() {
  const os = state.osSelecionada;
  const motivo = elements.cancelarMotivo.value;
  if (!os || !motivo || state.cancelando) return;

  state.cancelando = true;
  atualizarBotaoCancelamento();
  elements.btnConfirmarCancelamento.textContent = 'CANCELANDO...';

  try {
    const atualizada = await apiRequest(`/oficinas/${oficinaId}/ordens-servico/${os.idOrdemServico}/cancelar`, {
      method: 'POST',
      body: JSON.stringify({ motivo })
    });
    replaceOs(atualizada);
    state.cancelando = false;
    fecharCancelarModal();
    showToast('Ordem de serviço cancelada. As peças voltaram ao estoque.', 'success');
    await atualizarListaAposMutacao();
  } catch (error) {
    showToast(ApiErros.mensagem(error, 'Não foi possível cancelar a ordem de serviço.'), 'error');
  } finally {
    state.cancelando = false;
    elements.btnConfirmarCancelamento.textContent = 'CANCELAR OS';
    atualizarBotaoCancelamento();
  }
}

function descreverStatus(os) {
  if (os.status === 'Fechada') return `Fechada em ${formatDate(os.dataFechamento)}`;
  if (os.status === 'Cancelada') {
    const motivo = MOTIVOS_CANCELAMENTO[os.motivoCancelamento] || 'motivo não informado';
    return `Cancelada em ${formatDate(os.dataCancelamento)} · ${motivo} · valor não faturado`;
  }
  return 'Ordem de serviço em andamento.';
}

async function atualizarListaAposMutacao() {
  try {
    // salvar, fechar e cancelar movimentam o estoque: as quantidades usadas nos selects são recarregadas
    const [ordens, estoque] = await Promise.all([
      apiRequest(`/oficinas/${oficinaId}/ordens-servico`),
      apiRequest(`/oficinas/${oficinaId}/pecas`)
    ]);
    state.ordens = Array.isArray(ordens) ? ordens : [];
    state.estoque = Array.isArray(estoque) ? estoque : state.estoque;
    await enriquecerVeiculosDaListagem();
  } catch (error) {
    console.warn('Não foi possível recarregar as ordens:', error);
  }
  renderOrdens();
}

function replaceOs(osAtualizada) {
  const index = state.ordens.findIndex((item) => String(item.idOrdemServico) === String(osAtualizada.idOrdemServico));
  if (index >= 0) state.ordens[index] = osAtualizada;
  else state.ordens.unshift(osAtualizada);
}

function setSaving(saving) {
  state.salvando = saving;
  elements.btnSalvar.disabled = saving;
  elements.btnSalvar.textContent = saving
    ? 'SALVANDO...'
    : state.modoModal === 'novo' ? 'CRIAR' : 'SALVAR';
}

function setListLoading(loading) {
  elements.loading.classList.toggle('hidden', !loading);
  if (loading) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.add('hidden');
  }
}

function getCliente(id) {
  return state.clientes.find((item) => String(item.clienteId) === String(id));
}

function getVeiculo(id) {
  return state.veiculosMap?.get(String(id)) || null;
}

function getEstoqueItem(id) {
  return state.estoque.find((item) => String(item.estoqueId) === String(id));
}

function formatVeiculoLabel(veiculo) {
  if (!veiculo) return '';
  const marca = veiculo.modelo?.marca?.nomeMarca || '';
  const modelo = veiculo.modelo?.nomeModelo || '';
  const placa = veiculo.placa ? formatPlate(veiculo.placa) : '';
  return [marca, modelo, placa].filter(Boolean).join(' · ');
}

function formatPlate(value) {
  const raw = String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (raw.length === 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  return raw;
}

function formatOsNumero(id) {
  return `OS-${String(id ?? 0).padStart(4, '0')}`;
}

function formatDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const date = raw.includes('T') ? new Date(raw) : new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatNumberInput(value) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : String(number.toFixed(2));
}

function formatQuantidadeEstoque(value, unidade) {
  const number = Number(value ?? 0);
  const formatted = Number.isInteger(number)
    ? number.toLocaleString('pt-BR')
    : number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${formatted} ${unidade || ''}`.trim();
}

function renderStatusBadge(status) {
  const safe = ['Aberta', 'Fechada', 'Cancelada'].includes(status) ? status : 'Aberta';
  return `<span class="os-status ${safe}">${safe}</span>`;
}

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setFieldError(id, message) {
  const field = document.getElementById(id);
  const error = document.querySelector(`[data-error-for="${id}"]`);
  field?.classList.add('field-invalid');
  if (error) error.textContent = message;
}

function clearFieldError(id) {
  document.getElementById(id)?.classList.remove('field-invalid');
  const error = document.querySelector(`[data-error-for="${id}"]`);
  if (error) error.textContent = '';
}

function clearAllErrors() {
  document.querySelectorAll('.field-invalid').forEach((field) => field.classList.remove('field-invalid'));
  document.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
}

function iconEdit() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"></path><path d="m13.5 6.5 4 4"></path></svg>';
}
