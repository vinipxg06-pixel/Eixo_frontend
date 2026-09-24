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
let movimentacaoExcluindo = null;

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

  deleteModal: document.getElementById('deleteLancamentoModal'),
  deleteDescricao: document.getElementById('deleteLancamentoDescricao'),
  fecharDelete: document.getElementById('btnFecharDeleteLancamento'),
  cancelarDelete: document.getElementById('btnCancelarDeleteLancamento'),
  confirmarDelete: document.getElementById('btnConfirmarDeleteLancamento')
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

function atualizarResumo() {
  const entradas = movimentacoes
    .filter(m => m.tipo === 'Entrada')
    .reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  const saidas = movimentacoes
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
      <tr data-id="${m.idMovimentacao}">
        <td class="fluxo-date">${escapeHtml(formatDate(m.dataMovimentacao))}</td>
        <td class="fluxo-description" title="${escapeHtml(origemTitle || m.descricao)}">${escapeHtml(m.descricao)}</td>
        <td><span class="fluxo-category" title="${escapeHtml(categoryLabel(m.categoria))}">${escapeHtml(categoryLabel(m.categoria))}</span></td>
        <td class="fluxo-os ${m.ordemServicoId ? 'linked' : ''}">${escapeHtml(osText)}</td>
        <td><span class="fluxo-type ${entrada ? 'entrada' : 'saida'}">${entrada ? '↑ Entrada' : '↓ Saída'}</span></td>
        <td class="fluxo-value ${entrada ? 'entrada' : 'saida'}">${escapeHtml(signedCurrency(m))}</td>
        <td class="fluxo-actions-col">
          <div class="fluxo-row-actions">
            <button class="fluxo-icon-btn" type="button" data-action="edit" data-id="${m.idMovimentacao}" aria-label="Editar lançamento" title="Editar">
              <svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg>
            </button>
            <button class="fluxo-icon-btn delete" type="button" data-action="delete" data-id="${m.idMovimentacao}" aria-label="Excluir lançamento" title="Excluir">
              <svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

async function carregarMovimentacoes() {
  if (!oficinaId) {
    el.loading.classList.add('hidden');
    showToast('Oficina não encontrada na sessão. Faça login novamente.', 'error');
    return;
  }

  try {
    movimentacoes = await apiRequest(`/oficinas/${oficinaId}/fluxo-caixa`) || [];
    renderTabela();
  } catch (error) {
    el.loading.classList.add('hidden');
    el.empty.classList.remove('hidden');
    el.empty.querySelector('strong').textContent = 'Erro ao carregar';
    el.empty.querySelector('span').textContent = 'Não foi possível carregar o fluxo de caixa.';
    showToast(error.message || 'Erro ao carregar o fluxo de caixa.', 'error');
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
    showToast(error.message || 'Não foi possível salvar o lançamento.', 'error');
  } finally {
    el.salvar.disabled = false;
    el.salvar.textContent = originalText;
  }
}

function abrirDelete(movimentacao) {
  movimentacaoExcluindo = movimentacao;
  el.deleteDescricao.textContent = movimentacao.descricao || 'este lançamento';
  el.deleteModal.classList.remove('hidden');
  el.deleteModal.setAttribute('aria-hidden', 'false');
}

function fecharDelete() {
  el.deleteModal.classList.add('hidden');
  el.deleteModal.setAttribute('aria-hidden', 'true');
  movimentacaoExcluindo = null;
}

async function confirmarDelete() {
  if (!movimentacaoExcluindo) return;

  el.confirmarDelete.disabled = true;
  el.confirmarDelete.textContent = 'Excluindo...';

  try {
    await apiRequest(`/oficinas/${oficinaId}/fluxo-caixa/${movimentacaoExcluindo.idMovimentacao}`, {
      method: 'DELETE'
    });
    fecharDelete();
    showToast('Lançamento excluído com sucesso.', 'success');
    await carregarMovimentacoes();
  } catch (error) {
    showToast(error.message || 'Não foi possível excluir o lançamento.', 'error');
  } finally {
    el.confirmarDelete.disabled = false;
    el.confirmarDelete.textContent = 'Excluir';
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
  if (button.dataset.action === 'delete') abrirDelete(movimentacao);
});

el.fecharDelete.addEventListener('click', fecharDelete);
el.cancelarDelete.addEventListener('click', fecharDelete);
el.confirmarDelete.addEventListener('click', confirmarDelete);

[el.modal, el.deleteModal].forEach(modal => {
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    if (modal === el.modal) fecharModal();
    if (modal === el.deleteModal) fecharDelete();
  });
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!el.deleteModal.classList.contains('hidden')) fecharDelete();
  else if (!el.modal.classList.contains('hidden')) fecharModal();
});

preencherCategorias();
carregarMovimentacoes();
