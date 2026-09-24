renderMenu('estoque');
renderHeader('Estoque');

const oficinaId = Session.getOficinaId();

const CATEGORIA_LABELS = {
  Motor: 'Motor', Freios: 'Freios', Suspensao: 'Suspensão', Transmissao: 'Transmissão',
  Embreagem: 'Embreagem', Eletrica: 'Elétrica', Arrefecimento: 'Arrefecimento',
  Filtros: 'Filtros', Lubrificante: 'Lubrificante', Pneu: 'Pneu', Roda: 'Roda',
  Correia: 'Correia', Bateria: 'Bateria', Carroceria: 'Carroceria',
  Acessorios: 'Acessórios', Outros: 'Outros'
};

const UNIDADE_LABELS = { UN: 'UN', L: 'L', KG: 'KG', M: 'M', CX: 'CX' };

const state = {
  pecas: [],
  filtro: '',
  pecaSelecionada: null,
  pecaEmEdicao: null,
  excluindo: false,
  salvando: false,
  movimentando: false
};

const elements = {
  count: document.getElementById('estoqueCount'),
  busca: document.getElementById('buscaEstoque'),
  btnNova: document.getElementById('btnNovaPeca'),
  loading: document.getElementById('estoqueLoading'),
  tableWrap: document.getElementById('estoqueTableWrap'),
  tbody: document.getElementById('estoqueTableBody'),
  empty: document.getElementById('estoqueEmpty'),
  emptyText: document.getElementById('estoqueEmptyText'),
  actionMenu: document.getElementById('estoqueActionMenu'),

  pecaModal: document.getElementById('pecaModal'),
  pecaModalTitle: document.getElementById('pecaModalTitle'),
  pecaModalSubtitle: document.getElementById('pecaModalSubtitle'),
  pecaForm: document.getElementById('pecaForm'),
  nomePeca: document.getElementById('nomePeca'),
  categoria: document.getElementById('categoria'),
  unidadeMedida: document.getElementById('unidadeMedida'),
  codigoBarras: document.getElementById('codigoBarras'),
  quantidade: document.getElementById('quantidade'),
  quantidadeEditHelp: document.getElementById('quantidadeEditHelp'),
  estoqueMinimo: document.getElementById('estoqueMinimo'),
  precoUnitario: document.getElementById('precoUnitario'),
  btnSalvarPeca: document.getElementById('btnSalvarPeca'),

  entradaModal: document.getElementById('entradaModal'),
  entradaForm: document.getElementById('entradaForm'),
  entradaPecaNome: document.getElementById('entradaPecaNome'),
  entradaEstoqueAtual: document.getElementById('entradaEstoqueAtual'),
  quantidadeEntrada: document.getElementById('quantidadeEntrada'),
  precoUnitarioEntrada: document.getElementById('precoUnitarioEntrada'),
  btnConfirmarEntrada: document.getElementById('btnConfirmarEntrada'),

  saidaModal: document.getElementById('saidaModal'),
  saidaForm: document.getElementById('saidaForm'),
  saidaPecaNome: document.getElementById('saidaPecaNome'),
  saidaEstoqueAtual: document.getElementById('saidaEstoqueAtual'),
  quantidadeSaida: document.getElementById('quantidadeSaida'),
  btnConfirmarSaida: document.getElementById('btnConfirmarSaida'),

  deleteModal: document.getElementById('deletePecaModal'),
  deletePecaNome: document.getElementById('deletePecaNome'),
  btnConfirmarDelete: document.getElementById('btnConfirmarDelete')
};

init();

async function init() {
  if (!oficinaId) {
    showToast('Oficina não identificada. Faça login novamente.', 'error');
    return;
  }

  bindEvents();
  await carregarEstoque();
}

function bindEvents() {
  elements.busca.addEventListener('input', () => {
    state.filtro = normalizeText(elements.busca.value);
    renderEstoque();
  });

  elements.btnNova.addEventListener('click', abrirModalNovaPeca);
  elements.tbody.addEventListener('click', handleTableClick);
  elements.actionMenu.addEventListener('click', handleActionMenuClick);

  document.addEventListener('click', (event) => {
    if (!elements.actionMenu.contains(event.target) && !event.target.closest('[data-action="menu"]')) {
      fecharActionMenu();
    }
  });
  window.addEventListener('resize', fecharActionMenu);
  window.addEventListener('scroll', fecharActionMenu, true);

  elements.pecaForm.addEventListener('submit', salvarPeca);
  elements.entradaForm.addEventListener('submit', confirmarEntrada);
  elements.saidaForm.addEventListener('submit', confirmarSaida);
  elements.btnConfirmarDelete.addEventListener('click', confirmarExclusao);

  document.getElementById('btnFecharPecaModal').addEventListener('click', fecharPecaModal);
  document.getElementById('btnCancelarPeca').addEventListener('click', fecharPecaModal);
  document.getElementById('btnFecharEntradaModal').addEventListener('click', fecharEntradaModal);
  document.getElementById('btnCancelarEntrada').addEventListener('click', fecharEntradaModal);
  document.getElementById('btnFecharSaidaModal').addEventListener('click', fecharSaidaModal);
  document.getElementById('btnCancelarSaida').addEventListener('click', fecharSaidaModal);
  document.getElementById('btnFecharDeleteModal').addEventListener('click', fecharDeleteModal);
  document.getElementById('btnCancelarDelete').addEventListener('click', fecharDeleteModal);

  [elements.pecaModal, elements.entradaModal, elements.saidaModal, elements.deleteModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target !== modal) return;
      if (modal === elements.pecaModal) fecharPecaModal();
      if (modal === elements.entradaModal) fecharEntradaModal();
      if (modal === elements.saidaModal) fecharSaidaModal();
      if (modal === elements.deleteModal) fecharDeleteModal();
    });
  });

  bindDecimalInput(elements.quantidade);
  bindDecimalInput(elements.estoqueMinimo);
  bindDecimalInput(elements.quantidadeEntrada);
  bindDecimalInput(elements.quantidadeSaida);
  bindCurrencyInput(elements.precoUnitario);
  bindCurrencyInput(elements.precoUnitarioEntrada);
}

async function carregarEstoque() {
  setLoading(true);
  try {
    const data = await apiRequest(`/oficinas/${oficinaId}/pecas`);
    state.pecas = Array.isArray(data) ? data : [];
    renderEstoque();
  } catch (error) {
    console.error(error);
    state.pecas = [];
    renderEstoque();
    showToast(getApiErrorMessage(error, 'Não foi possível carregar o estoque.'), 'error');
  } finally {
    setLoading(false);
  }
}

function renderEstoque() {
  const pecas = getFilteredPecas();
  elements.count.textContent = `${state.pecas.length} ${state.pecas.length === 1 ? 'item' : 'itens'}`;

  if (!pecas.length) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = state.filtro
      ? 'Nenhum item corresponde à busca.'
      : 'Cadastre o primeiro item do estoque.';
    return;
  }

  elements.empty.classList.add('hidden');
  elements.tableWrap.classList.remove('hidden');
  elements.tbody.innerHTML = pecas.map(buildRow).join('');
}

function buildRow(peca) {
  const quantidade = toNumber(peca.quantidade);
  const minimo = toNumber(peca.estoqueMinimo);
  const preco = toNumber(peca.precoUnitario);
  const total = quantidade * preco;
  const baixo = quantidade <= minimo;
  const critical = minimo > 0 && quantidade <= minimo * 0.35;
  const meterPercent = getMeterPercent(quantidade, minimo);
  const codigo = escapeHtml(peca.codigoBarras || '—');

  return `
    <tr>
      <td class="estoque-codigo" title="${codigo}">${codigo}</td>
      <td class="estoque-item">${escapeHtml(peca.nomePeca || '—')}</td>
      <td><span class="estoque-category-badge">${escapeHtml(CATEGORIA_LABELS[peca.categoria] || peca.categoria || '—')}</span></td>
      <td>${escapeHtml(UNIDADE_LABELS[peca.unidadeMedida] || peca.unidadeMedida || '—')}</td>
      <td class="estoque-qtd-cell">
        <span class="estoque-qtd-value ${baixo ? 'low' : ''}">${formatQuantity(quantidade)}</span>
        <div class="stock-meter ${baixo ? 'low' : ''} ${critical ? 'critical' : ''}"><span style="width:${meterPercent}%"></span></div>
      </td>
      <td>${formatQuantity(minimo)}</td>
      <td class="estoque-money">${Formatters.formatCurrencyBRL(preco)}</td>
      <td class="estoque-total">${Formatters.formatCurrencyBRL(total)}</td>
      <td><span class="stock-status ${baixo ? 'low' : 'ok'}">${baixo ? 'Baixo' : 'OK'}</span></td>
      <td>
        <div class="estoque-row-actions">
          <button class="stock-icon-btn" type="button" data-action="menu" data-id="${peca.estoqueId}" aria-label="Ações de ${escapeHtml(peca.nomePeca)}" title="Movimentar ou editar">
            ${pencilIcon()}
          </button>
          <button class="stock-icon-btn delete" type="button" data-action="excluir" data-id="${peca.estoqueId}" aria-label="Excluir ${escapeHtml(peca.nomePeca)}" title="Excluir">
            ${trashIcon()}
          </button>
        </div>
      </td>
    </tr>`;
}

function getFilteredPecas() {
  if (!state.filtro) return state.pecas;
  return state.pecas.filter((peca) => {
    const searchable = normalizeText([
      peca.nomePeca,
      peca.codigoBarras,
      peca.categoria,
      CATEGORIA_LABELS[peca.categoria],
      peca.unidadeMedida
    ].filter(Boolean).join(' '));
    return searchable.includes(state.filtro);
  });
}

function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const peca = state.pecas.find((item) => String(item.estoqueId) === String(button.dataset.id));
  if (!peca) return;

  if (button.dataset.action === 'menu') {
    abrirActionMenu(button, peca);
  } else if (button.dataset.action === 'excluir') {
    fecharActionMenu();
    abrirDeleteModal(peca);
  }
}

function abrirActionMenu(anchor, peca) {
  state.pecaSelecionada = peca;
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 205;
  const menuHeight = 145;
  let left = rect.right - menuWidth;
  let top = rect.bottom + 6;
  if (left < 8) left = 8;
  if (top + menuHeight > window.innerHeight - 8) top = rect.top - menuHeight - 6;

  elements.actionMenu.style.left = `${left}px`;
  elements.actionMenu.style.top = `${top}px`;
  elements.actionMenu.classList.remove('hidden');
  elements.actionMenu.setAttribute('aria-hidden', 'false');
}

function fecharActionMenu() {
  elements.actionMenu.classList.add('hidden');
  elements.actionMenu.setAttribute('aria-hidden', 'true');
}

function handleActionMenuClick(event) {
  const button = event.target.closest('[data-stock-action]');
  if (!button || !state.pecaSelecionada) return;
  const peca = state.pecaSelecionada;
  fecharActionMenu();

  if (button.dataset.stockAction === 'entrada') abrirEntradaModal(peca);
  if (button.dataset.stockAction === 'saida') abrirSaidaModal(peca);
  if (button.dataset.stockAction === 'editar') abrirModalEditarPeca(peca);
}

function abrirModalNovaPeca() {
  state.pecaEmEdicao = null;
  elements.pecaForm.reset();
  clearFieldErrors();
  elements.pecaModalTitle.textContent = 'Novo item';
  elements.pecaModalSubtitle.textContent = 'Cadastre uma nova peça no estoque.';
  elements.btnSalvarPeca.textContent = 'Cadastrar';
  elements.quantidade.readOnly = false;
  elements.quantidadeEditHelp.classList.add('hidden');
  elements.quantidade.value = '0';
  elements.estoqueMinimo.value = '0';
  elements.precoUnitario.value = Formatters.formatCurrencyBRL(0);
  abrirModal(elements.pecaModal);
  setTimeout(() => elements.nomePeca.focus(), 0);
}

function abrirModalEditarPeca(peca) {
  state.pecaEmEdicao = peca;
  elements.pecaForm.reset();
  clearFieldErrors();
  elements.pecaModalTitle.textContent = 'Editar item';
  elements.pecaModalSubtitle.textContent = 'Altere os dados da peça. Movimente a quantidade por Entrada ou Saída.';
  elements.btnSalvarPeca.textContent = 'Salvar';

  elements.nomePeca.value = peca.nomePeca || '';
  elements.categoria.value = peca.categoria || '';
  elements.unidadeMedida.value = peca.unidadeMedida || '';
  elements.codigoBarras.value = peca.codigoBarras || '';
  elements.quantidade.value = formatDecimalInput(peca.quantidade);
  elements.quantidade.readOnly = true;
  elements.quantidadeEditHelp.classList.remove('hidden');
  elements.estoqueMinimo.value = formatDecimalInput(peca.estoqueMinimo);
  elements.precoUnitario.value = Formatters.formatCurrencyBRL(toNumber(peca.precoUnitario));

  abrirModal(elements.pecaModal);
  setTimeout(() => elements.nomePeca.focus(), 0);
}

function fecharPecaModal() {
  if (state.salvando) return;
  fecharModal(elements.pecaModal);
  state.pecaEmEdicao = null;
  elements.quantidade.readOnly = false;
  clearFieldErrors();
}

async function salvarPeca(event) {
  event.preventDefault();
  clearFieldErrors();

  const editando = Boolean(state.pecaEmEdicao);
  const quantidade = editando
    ? toNumber(state.pecaEmEdicao.quantidade)
    : parseDecimalBR(elements.quantidade.value);

  const payload = {
    nomePeca: elements.nomePeca.value.trim(),
    quantidade,
    categoria: elements.categoria.value,
    codigoBarras: elements.codigoBarras.value.trim() || null,
    estoqueMinimo: parseDecimalBR(elements.estoqueMinimo.value),
    precoUnitario: Formatters.currencyToNumber(elements.precoUnitario.value),
    unidadeMedida: elements.unidadeMedida.value
  };

  if (!validatePeca(payload, editando)) return;
  setPecaSaving(true);

  try {
    if (editando) {
      await apiRequest(`/oficinas/${oficinaId}/pecas/${state.pecaEmEdicao.estoqueId}`, {
        method: 'PUT', body: JSON.stringify(payload)
      });
      showToast('Item atualizado com sucesso.', 'success');
    } else {
      await apiRequest(`/oficinas/${oficinaId}/pecas`, {
        method: 'POST', body: JSON.stringify(payload)
      });
      showToast('Item cadastrado com sucesso.', 'success');
    }
    setPecaSaving(false);
    fecharPecaModal();
    await recarregarEstoque();
  } catch (error) {
    console.error(error);
    handleValidationError(error, 'Não foi possível salvar o item.');
  } finally {
    setPecaSaving(false);
  }
}

function validatePeca(payload, editando) {
  let valid = true;
  if (!payload.nomePeca) { setFieldError('nomePeca', 'Informe o nome da peça.'); valid = false; }
  if (!payload.categoria) { setFieldError('categoria', 'Selecione a categoria.'); valid = false; }
  if (!payload.unidadeMedida) { setFieldError('unidadeMedida', 'Selecione a unidade.'); valid = false; }
  if (!editando && (!Number.isFinite(payload.quantidade) || payload.quantidade < 0)) { setFieldError('quantidade', 'Informe uma quantidade válida.'); valid = false; }
  if (!Number.isFinite(payload.estoqueMinimo) || payload.estoqueMinimo < 0) { setFieldError('estoqueMinimo', 'Informe um estoque mínimo válido.'); valid = false; }
  if (!Number.isFinite(payload.precoUnitario) || payload.precoUnitario < 0) { setFieldError('precoUnitario', 'Informe um preço válido.'); valid = false; }
  if (!valid) showToast('Revise os campos obrigatórios.', 'warning');
  return valid;
}

function abrirEntradaModal(peca) {
  state.pecaSelecionada = peca;
  elements.entradaForm.reset();
  clearFieldErrors();
  elements.entradaPecaNome.textContent = peca.nomePeca || '—';
  elements.entradaEstoqueAtual.textContent = `${formatQuantity(peca.quantidade)} ${peca.unidadeMedida || ''}`.trim();
  elements.precoUnitarioEntrada.value = Formatters.formatCurrencyBRL(toNumber(peca.precoUnitario));
  abrirModal(elements.entradaModal);
  setTimeout(() => elements.quantidadeEntrada.focus(), 0);
}

function fecharEntradaModal() {
  if (state.movimentando) return;
  fecharModal(elements.entradaModal);
  clearFieldErrors();
}

async function confirmarEntrada(event) {
  event.preventDefault();
  clearFieldErrors();
  const peca = state.pecaSelecionada;
  if (!peca) return;

  const payload = {
    quantidadeEntrada: parseDecimalBR(elements.quantidadeEntrada.value),
    precoUnitarioEntrada: Formatters.currencyToNumber(elements.precoUnitarioEntrada.value)
  };

  let valid = true;
  if (!Number.isFinite(payload.quantidadeEntrada) || payload.quantidadeEntrada <= 0) {
    setFieldError('quantidadeEntrada', 'Informe uma quantidade maior que zero.'); valid = false;
  }
  if (!Number.isFinite(payload.precoUnitarioEntrada) || payload.precoUnitarioEntrada < 0) {
    setFieldError('precoUnitarioEntrada', 'Informe um preço válido.'); valid = false;
  }
  if (!valid) { showToast('Revise os dados da entrada.', 'warning'); return; }

  setMovementSaving('entrada', true);
  try {
    await apiRequest(`/oficinas/${oficinaId}/pecas/${peca.estoqueId}/adicionar`, {
      method: 'PATCH', body: JSON.stringify(payload)
    });
    showToast('Entrada registrada com sucesso.', 'success');
    setMovementSaving('entrada', false);
    fecharEntradaModal();
    await recarregarEstoque();
  } catch (error) {
    console.error(error);
    handleValidationError(error, 'Não foi possível registrar a entrada.');
  } finally {
    setMovementSaving('entrada', false);
  }
}

function abrirSaidaModal(peca) {
  state.pecaSelecionada = peca;
  elements.saidaForm.reset();
  clearFieldErrors();
  elements.saidaPecaNome.textContent = peca.nomePeca || '—';
  elements.saidaEstoqueAtual.textContent = `${formatQuantity(peca.quantidade)} ${peca.unidadeMedida || ''}`.trim();
  abrirModal(elements.saidaModal);
  setTimeout(() => elements.quantidadeSaida.focus(), 0);
}

function fecharSaidaModal() {
  if (state.movimentando) return;
  fecharModal(elements.saidaModal);
  clearFieldErrors();
}

async function confirmarSaida(event) {
  event.preventDefault();
  clearFieldErrors();
  const peca = state.pecaSelecionada;
  if (!peca) return;

  const quantidade = parseDecimalBR(elements.quantidadeSaida.value);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    setFieldError('quantidadeSaida', 'Informe uma quantidade maior que zero.');
    showToast('Revise os dados da saída.', 'warning');
    return;
  }

  if (quantidade > toNumber(peca.quantidade)) {
    setFieldError('quantidadeSaida', 'A saída não pode ser maior que o estoque atual.');
    showToast('Quantidade maior que o estoque disponível.', 'warning');
    return;
  }

  setMovementSaving('saida', true);
  try {
    await apiRequest(`/oficinas/${oficinaId}/pecas/${peca.estoqueId}/remover`, {
      method: 'PATCH', body: JSON.stringify({ quantidade })
    });
    showToast('Saída registrada com sucesso.', 'success');
    setMovementSaving('saida', false);
    fecharSaidaModal();
    await recarregarEstoque();
  } catch (error) {
    console.error(error);
    handleValidationError(error, 'Não foi possível registrar a saída.');
  } finally {
    setMovementSaving('saida', false);
  }
}

function abrirDeleteModal(peca) {
  state.pecaSelecionada = peca;
  elements.deletePecaNome.textContent = peca.nomePeca || '—';
  abrirModal(elements.deleteModal);
}

function fecharDeleteModal() {
  if (state.excluindo) return;
  fecharModal(elements.deleteModal);
}

async function confirmarExclusao() {
  const peca = state.pecaSelecionada;
  if (!peca || state.excluindo) return;
  state.excluindo = true;
  elements.btnConfirmarDelete.disabled = true;
  elements.btnConfirmarDelete.textContent = 'Excluindo...';

  try {
    await apiRequest(`/oficinas/${oficinaId}/pecas/${peca.estoqueId}`, { method: 'DELETE' });
    showToast('Item excluído com sucesso.', 'success');
    state.excluindo = false;
    fecharDeleteModal();
    await recarregarEstoque();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível excluir o item.'), 'error');
  } finally {
    state.excluindo = false;
    elements.btnConfirmarDelete.disabled = false;
    elements.btnConfirmarDelete.textContent = 'Excluir';
  }
}

async function recarregarEstoque() {
  try {
    const data = await apiRequest(`/oficinas/${oficinaId}/pecas`);
    state.pecas = Array.isArray(data) ? data : [];
    renderEstoque();
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível atualizar o estoque.'), 'error');
  }
}

function setLoading(loading) {
  elements.loading.classList.toggle('hidden', !loading);
  if (loading) {
    elements.tableWrap.classList.add('hidden');
    elements.empty.classList.add('hidden');
  }
}

function setPecaSaving(saving) {
  state.salvando = saving;
  elements.btnSalvarPeca.disabled = saving;
  elements.btnSalvarPeca.textContent = saving ? 'Salvando...' : (state.pecaEmEdicao ? 'Salvar' : 'Cadastrar');
}

function setMovementSaving(type, saving) {
  state.movimentando = saving;
  const button = type === 'entrada' ? elements.btnConfirmarEntrada : elements.btnConfirmarSaida;
  button.disabled = saving;
  button.textContent = saving ? 'Salvando...' : (type === 'entrada' ? 'Confirmar entrada' : 'Confirmar saída');
}

function abrirModal(modal) {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharModal(modal) {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  if (![elements.pecaModal, elements.entradaModal, elements.saidaModal, elements.deleteModal].some((m) => !m.classList.contains('hidden'))) {
    document.body.style.overflow = '';
  }
}

function bindCurrencyInput(input) {
  input.addEventListener('input', () => {
    input.value = Formatters.formatCurrencyInput(input.value);
  });
}

function bindDecimalInput(input) {
  input.addEventListener('input', () => {
    if (input.readOnly) return;
    let value = input.value.replace(/[^\d,.]/g, '').replace('.', ',');
    const firstComma = value.indexOf(',');
    if (firstComma !== -1) {
      value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '');
      const [intPart, decimalPart = ''] = value.split(',');
      value = `${intPart},${decimalPart.slice(0, 2)}`;
    }
    input.value = value;
  });
}

function parseDecimalBR(value) {
  const normalized = String(value ?? '').trim().replace(/\./g, '').replace(',', '.');
  if (normalized === '') return NaN;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function formatDecimalInput(value) {
  const number = toNumber(value);
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(number);
}

function formatQuantity(value) {
  const number = toNumber(value);
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(number);
}

function getMeterPercent(quantity, minimum) {
  if (minimum <= 0) return quantity > 0 ? 100 : 0;
  return Math.max(4, Math.min(100, (quantity / minimum) * 65));
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setFieldError(field, message) {
  const element = document.querySelector(`[data-error-for="${field}"]`);
  if (element) element.textContent = message || '';
}

function clearFieldError(field) { setFieldError(field, ''); }
function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
}

function handleValidationError(error, fallback) {
  const fieldErrors = extractValidationErrors(error?.body);
  if (fieldErrors.length) {
    fieldErrors.forEach(({ field, message }) => setFieldError(field, message));
    showToast('Revise os dados informados.', 'warning');
    return;
  }
  showToast(getApiErrorMessage(error, fallback), 'error');
}

function extractValidationErrors(body) {
  if (!body) return [];
  if (Array.isArray(body.errors)) {
    return body.errors.map((item) => ({
      field: item.field || item.campo || '',
      message: item.defaultMessage || item.message || item.mensagem || 'Valor inválido.'
    })).filter((item) => item.field);
  }
  if (body.errors && typeof body.errors === 'object') {
    return Object.entries(body.errors).map(([field, message]) => ({ field, message: String(message) }));
  }
  return [];
}

function getApiErrorMessage(error, fallback) {
  const body = error?.body;
  if (typeof body === 'string' && body.trim()) return body;
  if (body?.message) return body.message;
  if (body?.mensagem) return body.mensagem;
  if (error?.message && !/^Erro \d+$/.test(error.message)) return error.message;
  return fallback;
}

function pencilIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}

function trashIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
}
