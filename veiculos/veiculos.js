renderMenu('veiculos');
renderHeader('Veículos');

const oficinaId = Session.getOficinaId();

const state = {
  veiculos: [],
  clientes: [],
  marcas: [],
  modelos: [],
  filtro: '',
  veiculoEmEdicao: null,
  veiculoParaExcluir: null,
  salvando: false,
  excluindo: false
};

const elements = {
  btnNovo: document.getElementById('btnNovoVeiculo'),
  busca: document.getElementById('buscaVeiculo'),
  count: document.getElementById('veiculosCount'),
  loading: document.getElementById('veiculosLoading'),
  tableWrap: document.getElementById('veiculosTableWrap'),
  tbody: document.getElementById('veiculosTableBody'),
  empty: document.getElementById('veiculosEmpty'),
  emptyText: document.getElementById('veiculosEmptyText'),

  modal: document.getElementById('veiculoModal'),
  modalTitle: document.getElementById('veiculoModalTitle'),
  btnFecharModal: document.getElementById('btnFecharVeiculoModal'),
  btnCancelar: document.getElementById('btnCancelarVeiculo'),
  btnSalvar: document.getElementById('btnSalvarVeiculo'),
  form: document.getElementById('veiculoForm'),
  placa: document.getElementById('placa'),
  clienteId: document.getElementById('clienteId'),
  proprietarioEditHelp: document.getElementById('proprietarioEditHelp'),
  marcaId: document.getElementById('marcaId'),
  modeloId: document.getElementById('modeloId'),
  ano: document.getElementById('ano'),
  quilometragem: document.getElementById('quilometragem'),
  cor: document.getElementById('cor'),
  combustivel: document.getElementById('combustivel'),

  deleteModal: document.getElementById('deleteVeiculoModal'),
  deletePlaca: document.getElementById('deleteVeiculoPlaca'),
  btnFecharDelete: document.getElementById('btnFecharDeleteModal'),
  btnCancelarDelete: document.getElementById('btnCancelarDelete'),
  btnConfirmarDelete: document.getElementById('btnConfirmarDelete')
};

initVeiculos();

function initVeiculos() {
  if (!oficinaId) {
    elements.loading.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = 'Oficina não identificada na sessão.';
    elements.btnNovo.disabled = true;
    showToast('Não foi possível identificar a oficina. Faça login novamente.', 'error');
    return;
  }

  elements.btnNovo.addEventListener('click', abrirModalNovoVeiculo);
  elements.busca.addEventListener('input', handleBusca);
  elements.tbody.addEventListener('click', handleTableClick);
  elements.btnFecharModal.addEventListener('click', fecharModalVeiculo);
  elements.btnCancelar.addEventListener('click', fecharModalVeiculo);
  elements.form.addEventListener('submit', salvarVeiculo);
  elements.marcaId.addEventListener('change', handleMarcaChange);
  elements.placa.addEventListener('input', aplicarMascaraPlaca);
  elements.ano.addEventListener('input', aplicarMascaraAno);
  elements.quilometragem.addEventListener('input', aplicarMascaraQuilometragem);
  elements.modal.addEventListener('click', (event) => {
    if (event.target === elements.modal) fecharModalVeiculo();
  });

  elements.btnFecharDelete.addEventListener('click', fecharDeleteModal);
  elements.btnCancelarDelete.addEventListener('click', fecharDeleteModal);
  elements.btnConfirmarDelete.addEventListener('click', excluirVeiculo);
  elements.deleteModal.addEventListener('click', (event) => {
    if (event.target === elements.deleteModal) fecharDeleteModal();
  });

  document.addEventListener('keydown', handleEscape);

  carregarDadosIniciais();
}

async function carregarDadosIniciais() {
  setListLoading(true);

  try {
    const [veiculos, clientes, marcas] = await Promise.all([
      apiRequest(`/oficinas/${oficinaId}/veiculos`),
      apiRequest(`/oficinas/${oficinaId}/clientes`),
      apiRequest('/marcas')
    ]);

    state.veiculos = Array.isArray(veiculos) ? veiculos : [];
    state.clientes = Array.isArray(clientes) ? clientes : [];
    state.marcas = Array.isArray(marcas) ? marcas : [];

    preencherClientes();
    preencherMarcas();
    renderVeiculos();
  } catch (error) {
    console.error(error);
    state.veiculos = [];
    renderVeiculos();
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os veículos.'), 'error');
  } finally {
    setListLoading(false);
  }
}

function renderVeiculos() {
  const termo = normalizeSearch(state.filtro);
  const filtrados = state.veiculos.filter((veiculo) => {
    if (!termo) return true;

    return [
      veiculo.placa,
      veiculo.modelo?.marca?.nomeMarca,
      veiculo.modelo?.nomeModelo,
      veiculo.ano,
      veiculo.cor,
      veiculo.combustivel,
      veiculo.nomeCliente
    ].some((value) => normalizeSearch(value).includes(termo));
  });

  elements.count.textContent = `${state.veiculos.length} ${state.veiculos.length === 1 ? 'cadastrado' : 'cadastrados'}`;
  elements.tbody.innerHTML = '';

  if (filtrados.length === 0) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = state.filtro
      ? 'Tente buscar por placa, marca, modelo ou proprietário.'
      : 'Cadastre o primeiro veículo da oficina.';
    return;
  }

  elements.empty.classList.add('hidden');
  elements.tableWrap.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  filtrados.forEach((veiculo) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="veiculo-placa">${escapeHtml(formatPlate(veiculo.placa))}</td>
      <td class="veiculo-marca">${escapeHtml(veiculo.modelo?.marca?.nomeMarca || '—')}</td>
      <td class="veiculo-modelo">${escapeHtml(veiculo.modelo?.nomeModelo || '—')}</td>
      <td class="veiculo-mono veiculo-muted">${escapeHtml(veiculo.ano || '—')}</td>
      <td class="veiculo-muted">${escapeHtml(veiculo.cor || '—')}</td>
      <td>${renderCombustivel(veiculo.combustivel)}</td>
      <td class="veiculo-mono veiculo-muted">${escapeHtml(formatKm(veiculo.quilometragem))}</td>
      <td class="veiculo-muted">${escapeHtml(veiculo.nomeCliente || '—')}</td>
      <td>
        <div class="veiculo-row-actions">
          <button class="icon-btn" type="button" data-action="editar" data-id="${escapeHtml(veiculo.idVeiculo)}" title="Editar veículo" aria-label="Editar veículo ${escapeHtml(veiculo.placa || '')}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
          <button class="icon-btn icon-btn-danger" type="button" data-action="excluir" data-id="${escapeHtml(veiculo.idVeiculo)}" title="Excluir veículo" aria-label="Excluir veículo ${escapeHtml(veiculo.placa || '')}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>
          </button>
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });

  elements.tbody.appendChild(fragment);
}

function renderCombustivel(value) {
  if (!value) return '—';
  return `<span class="veiculo-combustivel">${escapeHtml(formatEnumLabel(value))}</span>`;
}

function handleBusca(event) {
  state.filtro = event.target.value.trim();
  renderVeiculos();
}

function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const veiculo = state.veiculos.find((item) => String(item.idVeiculo) === String(button.dataset.id));
  if (!veiculo) return;

  if (button.dataset.action === 'editar') {
    abrirModalEditarVeiculo(veiculo);
  } else if (button.dataset.action === 'excluir') {
    abrirDeleteModal(veiculo);
  }
}

function preencherClientes(apenasAtivos = false) {
  const atual = elements.clienteId.value;
  elements.clienteId.innerHTML = '<option value="">Selecione</option>';

  const clientesParaListar = apenasAtivos ? clientesAtivos() : state.clientes;

  clientesParaListar.forEach((cliente) => {
    const option = document.createElement('option');
    option.value = cliente.clienteId;
    option.textContent = cliente.nomeCliente;
    elements.clienteId.appendChild(option);
  });

  elements.clienteId.value = atual;
}

// Só filtra quando a API realmente informar o campo "ativo"; se o campo
// não vier (ainda não implementado no backend), mantém o comportamento atual
// em vez de esconder todos os clientes por engano.
function clientesAtivos() {
  const algumClienteTemCampoAtivo = state.clientes.some((cliente) => cliente.ativo !== undefined);
  if (!algumClienteTemCampoAtivo) return state.clientes;
  return state.clientes.filter((cliente) => cliente.ativo !== false);
}

function preencherMarcas() {
  const atual = elements.marcaId.value;
  elements.marcaId.innerHTML = '<option value="">Selecione</option>';

  state.marcas.forEach((marca) => {
    const option = document.createElement('option');
    option.value = marca.idMarca;
    option.textContent = marca.nomeMarca;
    elements.marcaId.appendChild(option);
  });

  elements.marcaId.value = atual;
}

async function handleMarcaChange() {
  const marcaId = elements.marcaId.value;
  clearFieldError('modeloId');

  if (!marcaId) {
    preencherModelos([]);
    return;
  }

  await carregarModelosPorMarca(marcaId);
}

async function carregarModelosPorMarca(marcaId, modeloSelecionado = null) {
  elements.modeloId.disabled = true;
  elements.modeloId.innerHTML = '<option value="">Carregando...</option>';

  try {
    const modelos = await apiRequest(`/modelos/marca/${marcaId}`);
    state.modelos = Array.isArray(modelos) ? modelos : [];
    preencherModelos(state.modelos, modeloSelecionado);
  } catch (error) {
    console.error(error);
    preencherModelos([]);
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os modelos.'), 'error');
  }
}

function preencherModelos(modelos, modeloSelecionado = null) {
  elements.modeloId.innerHTML = modelos.length
    ? '<option value="">Selecione</option>'
    : '<option value="">Selecione uma marca</option>';

  modelos.forEach((modelo) => {
    const option = document.createElement('option');
    option.value = modelo.idModelo;
    option.textContent = modelo.nomeModelo;
    elements.modeloId.appendChild(option);
  });

  elements.modeloId.disabled = modelos.length === 0;
  if (modeloSelecionado != null) elements.modeloId.value = String(modeloSelecionado);
}

function abrirModalNovoVeiculo() {
  state.veiculoEmEdicao = null;
  elements.form.reset();
  clearFieldErrors();
  preencherModelos([]);
  preencherClientes(true); // só clientes ativos podem receber um veículo novo

  elements.modalTitle.textContent = 'Novo veículo';
  elements.btnSalvar.textContent = 'Adicionar';
  elements.clienteId.disabled = false;
  elements.proprietarioEditHelp.classList.add('hidden');
  elements.combustivel.value = 'Flex';

  abrirModalVeiculo();
}

async function abrirModalEditarVeiculo(veiculo) {
  state.veiculoEmEdicao = veiculo;
  elements.form.reset();
  clearFieldErrors();

  elements.modalTitle.textContent = 'Editar veículo';
  elements.btnSalvar.textContent = 'Salvar';
  elements.placa.value = formatPlate(veiculo.placa || '');
  elements.ano.value = veiculo.ano || '';
  elements.quilometragem.value = formatInteger(veiculo.quilometragem);
  elements.cor.value = veiculo.cor || '';
  elements.combustivel.value = veiculo.combustivel || '';

  const cliente = state.clientes.find((item) => item.nomeCliente === veiculo.nomeCliente);
  elements.clienteId.value = cliente?.clienteId ? String(cliente.clienteId) : '';
  elements.clienteId.disabled = true;
  elements.proprietarioEditHelp.classList.remove('hidden');

  const marcaId = veiculo.modelo?.marca?.idMarca;
  const modeloId = veiculo.modelo?.idModelo;
  elements.marcaId.value = marcaId ? String(marcaId) : '';

  abrirModalVeiculo();

  if (marcaId) {
    await carregarModelosPorMarca(marcaId, modeloId);
  } else {
    preencherModelos([]);
  }
}

function abrirModalVeiculo() {
  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => elements.placa.focus(), 0);
}

function fecharModalVeiculo() {
  if (state.salvando) return;
  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.veiculoEmEdicao = null;
  clearFieldErrors();
}

async function salvarVeiculo(event) {
  event.preventDefault();

  const payload = {
    placa: rawPlate(elements.placa.value),
    combustivel: elements.combustivel.value,
    cor: elements.cor.value,
    ano: Formatters.onlyDigits(elements.ano.value),
    quilometragem: Number(Formatters.onlyDigits(elements.quilometragem.value) || 0)
  };

  const clienteId = elements.clienteId.value;
  const modeloId = elements.modeloId.value;
  const editando = Boolean(state.veiculoEmEdicao);

  if (!validateForm(payload, clienteId, modeloId, editando)) return;

  setSaving(true);

  try {
    if (editando) {
      await apiRequest(`/oficinas/${oficinaId}/veiculos/${state.veiculoEmEdicao.idVeiculo}/${modeloId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Veículo atualizado com sucesso.', 'success');
    } else {
      await apiRequest(`/oficinas/${oficinaId}/veiculos/${clienteId}/${modeloId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Veículo cadastrado com sucesso.', 'success');
    }

    setSaving(false);
    fecharModalVeiculo();
    await recarregarVeiculos();
  } catch (error) {
    console.error(error);
    handleSaveError(error);
  } finally {
    setSaving(false);
  }
}

async function recarregarVeiculos() {
  try {
    const veiculos = await apiRequest(`/oficinas/${oficinaId}/veiculos`);
    state.veiculos = Array.isArray(veiculos) ? veiculos : [];
    renderVeiculos();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível atualizar a lista de veículos.'), 'error');
  }
}

const QUILOMETRAGEM_MAXIMA = 9999999; // 9.999.999 km
const ANOS_LIMITE_FUTURO = 3; // não permite cadastrar veículo com ano > ano atual + 3

function validateForm(payload, clienteId, modeloId, editando) {
  clearFieldErrors();
  let valid = true;

  if (!payload.placa) { setFieldError('placa', 'Informe a placa.'); valid = false; }
  if (!editando && !clienteId) { setFieldError('clienteId', 'Selecione o proprietário.'); valid = false; }
  if (!elements.marcaId.value) { setFieldError('marcaId', 'Selecione a marca.'); valid = false; }
  if (!modeloId) { setFieldError('modeloId', 'Selecione o modelo.'); valid = false; }

  const anoAtual = new Date().getFullYear();
  const anoMaximoPermitido = anoAtual + ANOS_LIMITE_FUTURO;
  if (!/^\d{4}$/.test(payload.ano)) {
    setFieldError('ano', 'Informe o ano com 4 dígitos.');
    valid = false;
  } else if (Number(payload.ano) < 1900) {
    setFieldError('ano', 'Informe um ano válido.');
    valid = false;
  } else if (Number(payload.ano) > anoMaximoPermitido) {
    setFieldError('ano', `O ano não pode ser maior que ${anoMaximoPermitido}.`);
    valid = false;
  }

  if (!payload.cor) { setFieldError('cor', 'Selecione a cor.'); valid = false; }
  if (!payload.combustivel) { setFieldError('combustivel', 'Selecione o combustível.'); valid = false; }

  if (!Number.isFinite(payload.quilometragem) || payload.quilometragem < 0) {
    setFieldError('quilometragem', 'Informe uma quilometragem válida.');
    valid = false;
  } else if (payload.quilometragem > QUILOMETRAGEM_MAXIMA) {
    setFieldError('quilometragem', `A quilometragem máxima permitida é ${QUILOMETRAGEM_MAXIMA.toLocaleString('pt-BR')} km.`);
    valid = false;
  }

  if (!valid) showToast('Revise os campos obrigatórios.', 'warning');
  return valid;
}

function handleSaveError(error) {
  const fieldErrors = extractValidationErrors(error?.body);
  if (fieldErrors.length) {
    fieldErrors.forEach(({ field, message }) => setFieldError(field, message));
    showToast('Revise os dados informados.', 'warning');
    return;
  }
  showToast(getApiErrorMessage(error, 'Não foi possível salvar o veículo.'), 'error');
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
  return ({ placa: 'placa', combustivel: 'combustivel', cor: 'cor', ano: 'ano', quilometragem: 'quilometragem' })[field] || null;
}

function setFieldError(fieldName, message) {
  const input = elements.form.elements[fieldName];
  const error = elements.form.querySelector(`[data-error-for="${fieldName}"]`);
  if (input) input.classList.add('invalid');
  if (error) error.textContent = message;
}

function clearFieldError(fieldName) {
  const input = elements.form.elements[fieldName];
  const error = elements.form.querySelector(`[data-error-for="${fieldName}"]`);
  if (input) input.classList.remove('invalid');
  if (error) error.textContent = '';
}

function clearFieldErrors() {
  elements.form.querySelectorAll('.invalid').forEach((input) => input.classList.remove('invalid'));
  elements.form.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
}

function setListLoading(loading) {
  if (loading) {
    elements.loading.classList.remove('hidden');
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.add('hidden');
    elements.count.textContent = 'Carregando...';
  } else {
    elements.loading.classList.add('hidden');
    renderVeiculos();
  }
}

function setSaving(saving) {
  state.salvando = saving;
  elements.btnSalvar.disabled = saving;
  elements.btnCancelar.disabled = saving;
  elements.btnFecharModal.disabled = saving;

  if (saving) {
    elements.btnSalvar.dataset.originalText = elements.btnSalvar.textContent;
    elements.btnSalvar.textContent = 'Salvando...';
  } else if (elements.btnSalvar.dataset.originalText) {
    elements.btnSalvar.textContent = elements.btnSalvar.dataset.originalText;
    delete elements.btnSalvar.dataset.originalText;
  }
}

function abrirDeleteModal(veiculo) {
  state.veiculoParaExcluir = veiculo;
  elements.deletePlaca.textContent = formatPlate(veiculo.placa);
  elements.deleteModal.classList.remove('hidden');
  elements.deleteModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharDeleteModal() {
  if (state.excluindo) return;
  state.veiculoParaExcluir = null;
  elements.deleteModal.classList.add('hidden');
  elements.deleteModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function excluirVeiculo() {
  if (!state.veiculoParaExcluir || state.excluindo) return;

  state.excluindo = true;
  elements.btnConfirmarDelete.disabled = true;
  elements.btnCancelarDelete.disabled = true;
  elements.btnFecharDelete.disabled = true;
  elements.btnConfirmarDelete.textContent = 'Excluindo...';

  try {
    await apiRequest(`/oficinas/${oficinaId}/veiculos/${state.veiculoParaExcluir.idVeiculo}`, { method: 'DELETE' });
    showToast('Veículo excluído com sucesso.', 'success');
    state.excluindo = false;
    restaurarDeleteButtons();
    fecharDeleteModal();
    await recarregarVeiculos();
  } catch (error) {
    console.error(error);
    showToast(getDeleteErrorMessage(error), 'error');
  } finally {
    state.excluindo = false;
    restaurarDeleteButtons();
  }
}

// Traduz erros técnicos (ex.: violação de FK do banco) em uma mensagem
// única e compreensível para o usuário, em vez do dump de SQL do backend.
function getDeleteErrorMessage(error) {
  const raw = String(
    error?.body?.message || error?.body?.mensagem || error?.message || ''
  ).toLowerCase();

  const pareceViolacaoDeIntegridade =
    error?.status === 409 ||
    raw.includes('foreign key') ||
    raw.includes('constraint') ||
    raw.includes('integrity') ||
    raw.includes('fk_');

  if (pareceViolacaoDeIntegridade) {
    return 'Não é possível excluir este veículo pois existem orçamentos vinculados a ele. Cancele ou finalize os orçamentos antes de excluir.';
  }

  return getApiErrorMessage(error, 'Não foi possível excluir o veículo.');
}

function restaurarDeleteButtons() {
  elements.btnConfirmarDelete.disabled = false;
  elements.btnCancelarDelete.disabled = false;
  elements.btnFecharDelete.disabled = false;
  elements.btnConfirmarDelete.textContent = 'Excluir';
}

function handleEscape(event) {
  if (event.key !== 'Escape') return;
  if (!elements.deleteModal.classList.contains('hidden')) fecharDeleteModal();
  else if (!elements.modal.classList.contains('hidden')) fecharModalVeiculo();
}

function aplicarMascaraPlaca(event) { event.target.value = formatPlate(event.target.value); }
function aplicarMascaraAno(event) { event.target.value = Formatters.onlyDigits(event.target.value).slice(0, 4); }
function aplicarMascaraQuilometragem(event) {
  // Limita a 7 dígitos (máximo 9.999.999 km) para não estourar o tipo Long no backend
  // nem exibir aquele erro genérico de "JSON parse error".
  const digits = Formatters.onlyDigits(event.target.value).slice(0, 7);
  event.target.value = formatInteger(digits);
}

function rawPlate(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
}

function formatPlate(value) {
  const raw = rawPlate(value);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function formatInteger(value) {
  const digits = Formatters.onlyDigits(value);
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
}

function formatKm(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number.toLocaleString('pt-BR')} km`;
}

function formatEnumLabel(value) {
  const labels = { Hibrido: 'Híbrido', Eletrico: 'Elétrico' };
  return labels[value] || value;
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
