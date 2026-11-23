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

const PRECO_MAXIMO = 1000000;      // R$ 1.000.000,00
const QUANTIDADE_MAXIMA = 999999;

const state = {
  pecas: [],
  filtro: '',
  filtroSituacao: 'Ativas',
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
  btnFiltroSituacao: document.getElementById('btnFiltroSituacao'),
  loading: document.getElementById('estoqueLoading'),
  tableWrap: document.getElementById('estoqueTableWrap'),
  tbody: document.getElementById('estoqueTableBody'),
  empty: document.getElementById('estoqueEmpty'),
  emptyText: document.getElementById('estoqueEmptyText'),
  actionMenu: document.getElementById('estoqueActionMenu'),
  acaoSituacaoIcone: document.getElementById('acaoSituacaoIcone'),
  acaoSituacaoTitulo: document.getElementById('acaoSituacaoTitulo'),
  acaoSituacaoDescricao: document.getElementById('acaoSituacaoDescricao'),

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
  precoUnitarioEditHelp: document.getElementById('precoUnitarioEditHelp'),
  registrarCompraInicial: document.getElementById('registrarCompraInicial'),
  registrarCompraInicialWrap: document.getElementById('registrarCompraInicialWrap'),
  btnSalvarPeca: document.getElementById('btnSalvarPeca'),

  entradaModal: document.getElementById('entradaModal'),
  entradaForm: document.getElementById('entradaForm'),
  entradaPecaNome: document.getElementById('entradaPecaNome'),
  entradaEstoqueAtual: document.getElementById('entradaEstoqueAtual'),
  quantidadeEntrada: document.getElementById('quantidadeEntrada'),
  precoUnitarioEntrada: document.getElementById('precoUnitarioEntrada'),
  registrarEntradaCaixa: document.getElementById('registrarEntradaCaixa'),
  btnConfirmarEntrada: document.getElementById('btnConfirmarEntrada'),

  saidaModal: document.getElementById('saidaModal'),
  saidaForm: document.getElementById('saidaForm'),
  saidaPecaNome: document.getElementById('saidaPecaNome'),
  saidaEstoqueAtual: document.getElementById('saidaEstoqueAtual'),
  quantidadeSaida: document.getElementById('quantidadeSaida'),
  registrarSaidaCaixa: document.getElementById('registrarSaidaCaixa'),
  valorVendaWrap: document.getElementById('valorVendaWrap'),
  valorUnitarioVenda: document.getElementById('valorUnitarioVenda'),
  btnConfirmarSaida: document.getElementById('btnConfirmarSaida'),

  deleteModal: document.getElementById('deletePecaModal'),
  deletePecaNome: document.getElementById('deletePecaNome'),
  btnConfirmarDelete: document.getElementById('btnConfirmarDelete')
};

init();

async function init() {
  if (!Session.exigirLogin()) return;

  bindEvents();
  await carregarEstoque();
}

function bindEvents() {
  elements.busca.addEventListener('input', () => {
    state.filtro = normalizeText(elements.busca.value);
    renderEstoque();
  });

  elements.btnNova.addEventListener('click', abrirModalNovaPeca);
  elements.btnFiltroSituacao.addEventListener('click', alternarFiltroSituacao);
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
  bindCurrencyInput(elements.valorUnitarioVenda);
  elements.registrarSaidaCaixa.addEventListener('change', atualizarCampoValorVenda);
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
    showToast(ApiErros.mensagem(error, 'Não foi possível carregar o estoque.'), 'error');
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
    elements.emptyText.textContent = (state.filtro || state.filtroSituacao !== 'Todas')
      ? 'Nenhum item corresponde à busca ou ao filtro.'
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
    <tr class="${peca.ativa === false ? 'estoque-row-inativa' : ''}">
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
      <td>${renderSituacao(peca, baixo)}</td>
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

function renderSituacao(peca, baixo) {
  if (peca.ativa === false) return '<span class="stock-status inativa">Inativa</span>';
  return `<span class="stock-status ${baixo ? 'low' : 'ok'}">${baixo ? 'Baixo' : 'OK'}</span>`;
}

const FILTROS_SITUACAO = ['Ativas', 'Inativas', 'Todas'];

function alternarFiltroSituacao() {
  const atual = FILTROS_SITUACAO.indexOf(state.filtroSituacao);
  state.filtroSituacao = FILTROS_SITUACAO[(atual + 1) % FILTROS_SITUACAO.length];
  elements.btnFiltroSituacao.textContent = state.filtroSituacao;
  renderEstoque();
}

function correspondeSituacao(peca) {
  if (state.filtroSituacao === 'Ativas') return peca.ativa !== false;
  if (state.filtroSituacao === 'Inativas') return peca.ativa === false;
  return true;
}

function getFilteredPecas() {
  const porSituacao = state.pecas.filter(correspondeSituacao);
  if (!state.filtro) return porSituacao;
  return porSituacao.filter((peca) => {
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
  atualizarAcaoSituacao(peca);
  const rect = anchor.getBoundingClientRect();
  const menuWidth = 205;
  const menuHeight = 190;
  let left = rect.right - menuWidth;
  let top = rect.bottom + 6;
  if (left < 8) left = 8;
  if (top + menuHeight > window.innerHeight - 8) top = rect.top - menuHeight - 6;

  elements.actionMenu.style.left = `${left}px`;
  elements.actionMenu.style.top = `${top}px`;
  elements.actionMenu.classList.remove('hidden');
  elements.actionMenu.setAttribute('aria-hidden', 'false');
}

function atualizarAcaoSituacao(peca) {
  const ativa = peca.ativa !== false;
  elements.acaoSituacaoIcone.textContent = ativa ? '⏸' : '▶';
  elements.acaoSituacaoTitulo.textContent = ativa ? 'Inativar' : 'Reativar';
  elements.acaoSituacaoDescricao.textContent = ativa ? 'Ocultar de orçamentos e OS' : 'Voltar a usar em orçamentos e OS';
}

/** Inativar mantém a peça no histórico; ela só deixa de ser oferecida em novos orçamentos e OS. */
async function alternarSituacaoPeca(peca) {
  const acao = peca.ativa === false ? 'reativar' : 'inativar';
  try {
    await apiRequest(`/oficinas/${oficinaId}/pecas/${peca.estoqueId}/${acao}`, { method: 'POST' });
    showToast(acao === 'inativar' ? 'Peça inativada. Ela continua no histórico.' : 'Peça reativada.', 'success');
    await recarregarEstoque();
  } catch (error) {
    console.error(error);
    showToast(ApiErros.mensagem(error, `Não foi possível ${acao} a peça.`), 'error');
  }
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
  if (button.dataset.stockAction === 'alternar-situacao') alternarSituacaoPeca(peca);
  if (button.dataset.stockAction === 'editar') abrirModalEditarPeca(peca);
}

function abrirModalNovaPeca() {
  state.pecaEmEdicao = null;
  elements.pecaForm.reset();
  clearFieldErrors();
  elements.pecaModalTitle.textContent = 'Novo item';
  elements.pecaModalSubtitle.textContent = 'Cadastre uma nova peça no estoque.';
  elements.btnSalvarPeca.textContent = 'Cadastrar';
  definirCamposControladosPeloEstoque(false);
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
  definirCamposControladosPeloEstoque(true);
  elements.estoqueMinimo.value = formatDecimalInput(peca.estoqueMinimo);
  elements.precoUnitario.value = Formatters.formatCurrencyBRL(toNumber(peca.precoUnitario));

  abrirModal(elements.pecaModal);
  setTimeout(() => elements.nomePeca.focus(), 0);
}

function fecharPecaModal() {
  if (state.salvando) return;
  fecharModal(elements.pecaModal);
  state.pecaEmEdicao = null;
  definirCamposControladosPeloEstoque(false);
  clearFieldErrors();
}

/**
 * Regra: na edição, quantidade e preço unitário não são alterados pelo formulário.
 * A quantidade muda por Entrada/Saída e o preço é o preço médio recalculado a cada Entrada.
 */
function definirCamposControladosPeloEstoque(somenteLeitura) {
  elements.quantidade.readOnly = somenteLeitura;
  elements.precoUnitario.readOnly = somenteLeitura;
  elements.quantidadeEditHelp.classList.toggle('hidden', !somenteLeitura);
  elements.precoUnitarioEditHelp.classList.toggle('hidden', !somenteLeitura);
  elements.registrarCompraInicialWrap.classList.toggle('hidden', somenteLeitura);
}

async function salvarPeca(event) {
  event.preventDefault();
  clearFieldErrors();

  const editando = Boolean(state.pecaEmEdicao);
  const payload = editando ? montarPayloadEdicao() : montarPayloadCadastro();

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

function montarDadosCadastrais() {
  return {
    nomePeca: elements.nomePeca.value.trim(),
    categoria: elements.categoria.value,
    codigoBarras: elements.codigoBarras.value.trim() || null,
    estoqueMinimo: parseDecimalBR(elements.estoqueMinimo.value),
    unidadeMedida: elements.unidadeMedida.value
  };
}

/** Cadastro: além dos dados cadastrais, define a quantidade e o preço iniciais. */
function montarPayloadCadastro() {
  return {
    ...montarDadosCadastrais(),
    quantidade: parseDecimalBR(elements.quantidade.value),
    precoUnitario: Formatters.currencyToNumber(elements.precoUnitario.value),
    registrarMovimentacao: elements.registrarCompraInicial.checked
  };
}

/** Edição: apenas dados cadastrais (PecaEstoqueUpdateRequest). */
function montarPayloadEdicao() {
  return montarDadosCadastrais();
}

function validatePeca(payload, editando) {
  let valid = true;
  if (!payload.nomePeca) { setFieldError('nomePeca', 'Informe o nome da peça.'); valid = false; }
  if (!payload.categoria) { setFieldError('categoria', 'Selecione a categoria.'); valid = false; }
  if (!payload.unidadeMedida) { setFieldError('unidadeMedida', 'Selecione a unidade.'); valid = false; }

  if (!editando && (!Number.isFinite(payload.quantidade) || payload.quantidade < 0)) {
    setFieldError('quantidade', 'Informe uma quantidade válida.'); valid = false;
  } else if (!editando && payload.quantidade > QUANTIDADE_MAXIMA) {
    setFieldError('quantidade', `A quantidade máxima permitida é ${QUANTIDADE_MAXIMA.toLocaleString('pt-BR')}.`); valid = false;
  }

  if (!Number.isFinite(payload.estoqueMinimo) || payload.estoqueMinimo < 0) {
    setFieldError('estoqueMinimo', 'Informe um estoque mínimo válido.'); valid = false;
  } else if (payload.estoqueMinimo > QUANTIDADE_MAXIMA) {
    setFieldError('estoqueMinimo', `O estoque mínimo máximo permitido é ${QUANTIDADE_MAXIMA.toLocaleString('pt-BR')}.`); valid = false;
  }

  // preço só é informado no cadastro; na edição ele é o preço médio, calculado pelas entradas
  if (!editando && (!Number.isFinite(payload.precoUnitario) || payload.precoUnitario < 0)) {
    setFieldError('precoUnitario', 'Informe um preço válido.'); valid = false;
  } else if (!editando && payload.precoUnitario > PRECO_MAXIMO) {
    setFieldError('precoUnitario', `O preço máximo permitido é ${Formatters.formatCurrencyBRL(PRECO_MAXIMO)}.`); valid = false;
  }

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
    precoUnitarioEntrada: Formatters.currencyToNumber(elements.precoUnitarioEntrada.value),
    registrarMovimentacao: elements.registrarEntradaCaixa.checked
  };

  let valid = true;
  if (!Number.isFinite(payload.quantidadeEntrada) || payload.quantidadeEntrada <= 0) {
    setFieldError('quantidadeEntrada', 'Informe uma quantidade maior que zero.'); valid = false;
  } else if (payload.quantidadeEntrada > QUANTIDADE_MAXIMA) {
    setFieldError('quantidadeEntrada', `A quantidade máxima permitida é ${QUANTIDADE_MAXIMA.toLocaleString('pt-BR')}.`); valid = false;
  }
  if (!Number.isFinite(payload.precoUnitarioEntrada) || payload.precoUnitarioEntrada < 0) {
    setFieldError('precoUnitarioEntrada', 'Informe um preço válido.'); valid = false;
  } else if (payload.precoUnitarioEntrada > PRECO_MAXIMO) {
    setFieldError('precoUnitarioEntrada', `O preço máximo permitido é ${Formatters.formatCurrencyBRL(PRECO_MAXIMO)}.`); valid = false;
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
  elements.valorUnitarioVenda.value = Formatters.formatCurrencyBRL(toNumber(peca.precoUnitario));
  atualizarCampoValorVenda();
  abrirModal(elements.saidaModal);
  setTimeout(() => elements.quantidadeSaida.focus(), 0);
}

function fecharSaidaModal() {
  if (state.movimentando) return;
  fecharModal(elements.saidaModal);
  clearFieldErrors();
}

/** O valor de venda só é pedido quando a retirada será registrada no caixa como venda. */
function atualizarCampoValorVenda() {
  elements.valorVendaWrap.classList.toggle('hidden', !elements.registrarSaidaCaixa.checked);
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

  const registrarMovimentacao = elements.registrarSaidaCaixa.checked;
  const valorUnitarioVenda = registrarMovimentacao ? Formatters.currencyToNumber(elements.valorUnitarioVenda.value) : null;
  if (registrarMovimentacao && (!Number.isFinite(valorUnitarioVenda) || valorUnitarioVenda < 0)) {
    setFieldError('valorUnitarioVenda', 'Informe um valor de venda válido.');
    showToast('Revise os dados da saída.', 'warning');
    return;
  }

  setMovementSaving('saida', true);
  try {
    await apiRequest(`/oficinas/${oficinaId}/pecas/${peca.estoqueId}/remover`, {
      method: 'PATCH', body: JSON.stringify({ quantidade, registrarMovimentacao, valorUnitarioVenda })
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
    if (error.status === 409) {
      // Peça com histórico: o backend orienta a inativar em vez de excluir
      state.excluindo = false;
      fecharDeleteModal();
      showToast(ApiErros.mensagem(error, 'Esta peça já foi usada e não pode ser excluída. Inative-a.'), 'warning');
      return;
    }
    showToast(ApiErros.mensagem(error, 'Não foi possível excluir o item.'), 'error');
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
    showToast(ApiErros.mensagem(error, 'Não foi possível atualizar o estoque.'), 'error');
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
  const fieldErrors = ApiErros.campos(error);
  if (fieldErrors.length) {
    fieldErrors.forEach(({ field, message }) => setFieldError(field, message));
    showToast('Revise os dados informados.', 'warning');
    return;
  }
  showToast(ApiErros.mensagem(error, fallback), 'error');
}

function pencilIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
}

function trashIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>';
}