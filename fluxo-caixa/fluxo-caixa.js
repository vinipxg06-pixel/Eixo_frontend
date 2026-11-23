renderMenu('fluxo-caixa');
renderHeader('Fluxo de Caixa');

const oficinaId = Session.getOficinaId();

const CATEGORIAS = [
  ['Servico', 'Serviço'],
  ['VendaDePeca', 'Venda de Peça'],
  ['CompraDePeca', 'Compra de Peça'],
  ['Salario', 'Salário'],
  ['Aluguel', 'Aluguel'],
  ['ContaDeConsumo', 'Conta de Consumo'],
  ['ManutencaoDeEquipamento', 'Manutenção de Equipamento'],
  ['Imposto', 'Imposto'],
  ['Fornecedor', 'Fornecedor'],
  ['Marketing', 'Marketing'],
  ['Outros', 'Outros']
];

const categoryLabels = Object.fromEntries(CATEGORIAS);

let movimentacoes = [];
let filtroAtual = 'Todos';
let movimentacaoEditando = null;
let movimentacaoCancelando = null;

const el = {
  subtitle: document.getElementById('fluxoSubtitle'),
  loading: document.getElementById('fluxoLoading'),
  empty: document.getElementById('fluxoEmpty'),
  tableWrap: document.getElementById('fluxoTableWrap'),
  tableBody: document.getElementById('fluxoTableBody'),
  totalEntradas: document.getElementById('totalEntradas'),
  totalSaidas: document.getElementById('totalSaidas'),
  saldoPeriodo: document.getElementById('saldoPeriodo'),
  saldoCard: document.getElementById('saldoCard'),
  novo: document.getElementById('btnNovoLancamento'),
  filtros: [...document.querySelectorAll('.fluxo-filter')],

  modal: document.getElementById('lancamentoModal'),
  modalTitle: document.getElementById('lancamentoModalTitle'),
  modalSubtitle: document.getElementById('lancamentoModalSubtitle'),
  form: document.getElementById('lancamentoForm'),
  descricao: document.getElementById('descricao'),
  tipo: document.getElementById('tipo'),
  categoria: document.getElementById('categoria'),
  valor: document.getElementById('valor'),
  salvar: document.getElementById('btnSalvarLancamento'),
  fecharModal: document.getElementById('btnFecharLancamentoModal'),
  cancelarModal: document.getElementById('btnCancelarLancamento'),

  cancelModal: document.getElementById('cancelarLancamentoModal'),
  cancelDescricao: document.getElementById('cancelarLancamentoDescricao'),
  fecharCancel: document.getElementById('btnFecharCancelarLancamento'),
  voltarCancel: document.getElementById('btnVoltarCancelarLancamento'),
  confirmarCancel: document.getElementById('btnConfirmarCancelarLancamento')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  const parts = String(value).split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function categoryLabel(value) {
  return categoryLabels[value] || value || '—';
}

function signedCurrency(movimentacao) {
  const value = Math.abs(Number(movimentacao.valor) || 0);
  const formatted = Formatters.formatCurrencyBRL(value);
  return movimentacao.tipo === 'Saida' ? `- ${formatted}` : formatted;
}

function preencherCategorias() {
  el.categoria.innerHTML = CATEGORIAS
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');
}

/** Regra: lançamentos cancelados ficam no histórico, mas não entram em nenhum total. */
function lancamentosContabilizados() {
  return movimentacoes.filter(m => !m.cancelada);
}

function atualizarResumo() {
  const contabilizados = lancamentosContabilizados();

  const entradas = contabilizados
    .filter(m => m.tipo === 'Entrada')
    .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  const saidas = contabilizados
    .filter(m => m.tipo === 'Saida')
    .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  const saldo = entradas - saidas;

  el.totalEntradas.textContent = Formatters.formatCurrencyBRL(entradas);
  el.totalSaidas.textContent = Formatters.formatCurrencyBRL(saidas);
  el.saldoPeriodo.textContent = saldo < 0
    ? `- ${Formatters.formatCurrencyBRL(Math.abs(saldo))}`
    : Formatters.formatCurrencyBRL(saldo);

  el.saldoCard.classList.toggle('negative', saldo < 0);
}

function movimentacoesFiltradas() {
  if (filtroAtual === 'Todos') return movimentacoes;
  return movimentacoes.filter(m => m.tipo === filtroAtual);
}

/** Só lançamentos manuais e ativos podem ser editados ou cancelados (regra validada também no backend). */
function renderAcoes(m) {
  if (m.automatica) {
    return '<span class="fluxo-tag-automatico" title="Gerado pelo sistema (OS ou estoque). Não pode ser alterado manualmente.">Automático</span>';
  }
  if (m.cancelada) return '';

  return `
          <div class="fluxo-row-actions">
            <button class="fluxo-icon-btn" type="button" data-action="edit" data-id="${m.idMovimentacao}" aria-label="Editar lançamento" title="Editar">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg>
            </button>
            <button class="fluxo-icon-btn delete" type="button" data-action="cancel" data-id="${m.idMovimentacao}" aria-label="Cancelar lançamento" title="Cancelar">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="m5.6 5.6 12.8 12.8"></path></svg>
            </button>
          </div>`;
}

function renderTabela() {
  const lista = movimentacoesFiltradas();
  el.subtitle.textContent = `${movimentacoes.length} ${movimentacoes.length === 1 ? 'lançamento' : 'lançamentos'} no período`;
  atualizarResumo();

  el.loading.classList.add('hidden');

  if (!lista.length) {
    el.tableWrap.classList.add('hidden');
    el.empty.classList.remove('hidden');
    return;
  }

  el.empty.classList.add('hidden');
  el.tableWrap.classList.remove('hidden');

  el.tableBody.innerHTML = lista.map(m => {
    const entrada = m.tipo === 'Entrada';
    const osText = m.ordemServicoId ? `#${m.ordemServicoId}` : '—';
    const origemTitle = m.estoqueId ? `Movimentação vinculada ao estoque #${m.estoqueId}` : '';

    return `
      <tr data-id="${m.idMovimentacao}" class="${m.cancelada ? 'fluxo-row-cancelada' : ''}">
        <td class="fluxo-date">${escapeHtml(formatDate(m.dataMovimentacao))}</td>
        <td class="fluxo-description" title="${escapeHtml(origemTitle || m.descricao)}">${escapeHtml(m.descricao)}${m.cancelada ? ' <span class="fluxo-badge-cancelado">Cancelado</span>' : ''}</td>
        <td><span class="fluxo-category" title="${escapeHtml(categoryLabel(m.categoria))}">${escapeHtml(categoryLabel(m.categoria))}</span></td>
        <td class="fluxo-os ${m.ordemServicoId ? 'linked' : ''}">${escapeHtml(osText)}</td>
        <td><span class="fluxo-type ${entrada ? 'entrada' : 'saida'}">${entrada ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td class="fluxo-value ${entrada ? 'entrada' : 'saida'}">${escapeHtml(signedCurrency(m))}</td>
        <td class="fluxo-actions-col">
          ${renderAcoes(m)}
        </td>
      </tr>`;
  }).join('');
}

async function carregarMovimentacoes() {
  if (!Session.exigirLogin()) return;

  try {
    movimentacoes = await apiRequest(`/oficinas/${oficinaId}/fluxo-caixa`) || [];
    renderTabela();
  } catch (error) {
    el.loading.classList.add('hidden');
    el.empty.classList.remove('hidden');
    el.empty.querySelector('strong').textContent = 'Erro ao carregar';
    el.empty.querySelector('span').textContent = 'Não foi possível carregar o fluxo de caixa.';
    showToast(ApiErros.mensagem(error, 'Erro ao carregar o fluxo de caixa.'), 'error');
  }
}

function abrirModal(movimentacao = null) {
  movimentacaoEditando = movimentacao;
  el.form.reset();

  if (movimentacao) {
    el.modalTitle.textContent = 'Editar Lançamento';
    el.modalSubtitle.textContent = 'Altere os dados da movimentação selecionada.';
    el.salvar.textContent = 'Salvar';
    el.descricao.value = movimentacao.descricao || '';
    el.tipo.value = movimentacao.tipo || 'Entrada';
    el.categoria.value = movimentacao.categoria || 'Outros';
    el.valor.value = Formatters.formatCurrencyBRL(Number(movimentacao.valor) || 0);
  } else {
    el.modalTitle.textContent = 'Novo Lançamento';
    el.modalSubtitle.textContent = 'Registre uma entrada ou saída manual.';
    el.salvar.textContent = 'Lançar';
    el.tipo.value = 'Entrada';
    el.categoria.value = 'Servico';
    el.valor.value = '';
  }

  el.modal.classList.remove('hidden');
  el.modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => el.descricao.focus(), 0);
}

function fecharModal() {
  el.modal.classList.add('hidden');
  el.modal.setAttribute('aria-hidden', 'true');
  movimentacaoEditando = null;
}

async function salvarLancamento(event) {
  event.preventDefault();

  const descricao = el.descricao.value.trim();
  const valor = Formatters.currencyToNumber(el.valor.value);

  if (!descricao) {
    showToast('Informe a descrição do lançamento.', 'warning');
    el.descricao.focus();
    return;
  }

  if (descricao.length > 100) {
    showToast('A descrição deve ter no máximo 100 caracteres.', 'warning');
    return;
  }

  if (valor < 0 || !Number.isFinite(valor)) {
    showToast('Informe um valor válido.', 'warning');
    el.valor.focus();
    return;
  }

  const payload = {
    descricao,
    tipo: el.tipo.value,
    valor,
    categoria: el.categoria.value
  };

  const editando = Boolean(movimentacaoEditando);
  const endpoint = editando
    ? `/oficinas/${oficinaId}/fluxo-caixa/${movimentacaoEditando.idMovimentacao}`
    : `/oficinas/${oficinaId}/fluxo-caixa`;

  el.salvar.disabled = true;
  const originalText = el.salvar.textContent;
  el.salvar.textContent = editando ? 'Salvando...' : 'Lançando...';

  try {
    await apiRequest(endpoint, {
      method: editando ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    fecharModal();
    showToast(editando ? 'Lançamento atualizado com sucesso.' : 'Lançamento registrado com sucesso.', 'success');
    await carregarMovimentacoes();
  } catch (error) {
    showToast(ApiErros.mensagem(error, 'Não foi possível salvar o lançamento.'), 'error');
  } finally {
    el.salvar.disabled = false;
    el.salvar.textContent = originalText;
  }
}

function abrirCancelamento(movimentacao) {
  movimentacaoCancelando = movimentacao;
  el.cancelDescricao.textContent = movimentacao.descricao || 'este lançamento';
  el.cancelModal.classList.remove('hidden');
  el.cancelModal.setAttribute('aria-hidden', 'false');
}

function fecharCancelamento() {
  el.cancelModal.classList.add('hidden');
  el.cancelModal.setAttribute('aria-hidden', 'true');
  movimentacaoCancelando = null;
}

async function confirmarCancelamento() {
  if (!movimentacaoCancelando) return;

  el.confirmarCancel.disabled = true;
  el.confirmarCancel.textContent = 'Cancelando...';

  try {
    await apiRequest(`/oficinas/${oficinaId}/fluxo-caixa/${movimentacaoCancelando.idMovimentacao}/cancelar`, {
      method: 'POST'
    });
    fecharCancelamento();
    showToast('Lançamento cancelado. Ele continua no histórico, mas não conta mais nos totais.', 'success');
    await carregarMovimentacoes();
  } catch (error) {
    showToast(ApiErros.mensagem(error, 'Não foi possível cancelar o lançamento.'), 'error');
  } finally {
    el.confirmarCancel.disabled = false;
    el.confirmarCancel.textContent = 'Cancelar lançamento';
  }
}

el.valor.addEventListener('input', () => {
  el.valor.value = Formatters.formatCurrencyInput(el.valor.value);
});

el.novo.addEventListener('click', () => abrirModal());
el.fecharModal.addEventListener('click', fecharModal);
el.cancelarModal.addEventListener('click', fecharModal);
el.form.addEventListener('submit', salvarLancamento);

el.filtros.forEach(button => {
  button.addEventListener('click', () => {
    filtroAtual = button.dataset.filter;
    el.filtros.forEach(b => b.classList.toggle('active', b === button));
    renderTabela();
  });
});

el.tableBody.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;

  const id = Number(button.dataset.id);
  const movimentacao = movimentacoes.find(m => Number(m.idMovimentacao) === id);
  if (!movimentacao) return;

  if (button.dataset.action === 'edit') abrirModal(movimentacao);
  if (button.dataset.action === 'cancel') abrirCancelamento(movimentacao);
});

el.fecharCancel.addEventListener('click', fecharCancelamento);
el.voltarCancel.addEventListener('click', fecharCancelamento);
el.confirmarCancel.addEventListener('click', confirmarCancelamento);

[el.modal, el.cancelModal].forEach(modal => {
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    if (modal === el.modal) fecharModal();
    if (modal === el.cancelModal) fecharCancelamento();
  });
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!el.cancelModal.classList.contains('hidden')) fecharCancelamento();
  else if (!el.modal.classList.contains('hidden')) fecharModal();
});

preencherCategorias();
carregarMovimentacoes();
