renderMenu('clientes');
renderHeader('Clientes');

const oficinaId = Session.getOficinaId();

const state = {
  clientes: [],
  filtro: '',
  clienteEmEdicao: null,
  salvando: false,
  filtroStatus: 'Todos'
};

const elements = {
  btnFiltro: document.getElementById('btnFiltroClientes'),
  btnNovo: document.getElementById('btnNovoCliente'),
  busca: document.getElementById('buscaCliente'),
  count: document.getElementById('clientesCount'),
  loading: document.getElementById('clientesLoading'),
  list: document.getElementById('clientesList'),
  empty: document.getElementById('clientesEmpty'),
  emptyText: document.getElementById('clientesEmptyText'),
  modal: document.getElementById('clienteModal'),
  modalEyebrow: document.getElementById('clienteModalEyebrow'),
  modalTitle: document.getElementById('clienteModalTitle'),
  btnFecharModal: document.getElementById('btnFecharModal'),
  btnCancelar: document.getElementById('btnCancelarCliente'),
  form: document.getElementById('clienteForm'),
  nome: document.getElementById('nomeCliente'),
  cpfCnpj: document.getElementById('cpfCnpj'),
  telefone: document.getElementById('telefone'),
  email: document.getElementById('email'),
  statusField: document.getElementById('statusField'),
  status: document.getElementById('statusCliente'),
  btnSalvar: document.getElementById('btnSalvarCliente')
};

initClientes();

function initClientes() {
  if (!oficinaId) {
    showToast('Não foi possível identificar a oficina do usuário. Faça login novamente.', 'error');
    elements.loading.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = 'Oficina não identificada na sessão.';
    elements.btnNovo.disabled = true;
    return;
  }
  elements.btnFiltro.addEventListener('click', alternarFiltroStatus);
  elements.btnNovo.addEventListener('click', abrirModalNovoCliente);
  elements.busca.addEventListener('input', handleBusca);
  elements.btnFecharModal.addEventListener('click', fecharModalCliente);
  elements.btnCancelar.addEventListener('click', fecharModalCliente);
  elements.form.addEventListener('submit', salvarCliente);
  elements.cpfCnpj.addEventListener('input', aplicarMascaraCpfCnpj);
  elements.telefone.addEventListener('input', aplicarMascaraTelefone);
  elements.list.addEventListener('click', handleListaClick);
  elements.modal.addEventListener('click', handleModalBackdropClick);
  document.addEventListener('keydown', handleEscape);

  carregarClientes();
}

async function carregarClientes() {
  setListLoading(true);

  try {
    const clientes = await apiRequest(`/oficinas/${oficinaId}/clientes`);
    state.clientes = Array.isArray(clientes) ? clientes : [];
    renderClientes();
  } catch (error) {
    console.error(error);
    state.clientes = [];
    renderClientes();
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os clientes.'), 'error');
  } finally {
    setListLoading(false);
  }
}

function renderClientes() {
  const termo = normalizeSearch(state.filtro);

  const clientesFiltrados = state.clientes.filter((cliente) => {
    const statusCliente = normalizeStatusValue(cliente.status);

    // Filtro por status
    if (
      state.filtroStatus !== 'Todos' &&
      statusCliente !== state.filtroStatus
    ) {
      return false;
    }

    // Filtro por busca
    if (!termo) return true;

    return [
      cliente.nomeCliente,
      cliente.cpfcnpj,
      cliente.telefone,
      cliente.email,
      cliente.status
    ].some((value) => normalizeSearch(value).includes(termo));
  });

  elements.count.textContent = formatTotalCount(state.clientes.length);
  elements.list.innerHTML = '';

  if (clientesFiltrados.length === 0) {
    elements.list.classList.add('hidden');
    elements.empty.classList.remove('hidden');
    elements.emptyText.textContent = state.filtro
      ? 'Tente buscar usando outro nome, documento, telefone ou e-mail.'
      : 'Cadastre o primeiro cliente da oficina.';
    return;
  }

  elements.empty.classList.add('hidden');
  elements.list.classList.remove('hidden');

  const fragment = document.createDocumentFragment();

  clientesFiltrados.forEach((cliente) => {
    const row = document.createElement('article');
    row.className = 'cliente-row';
    row.innerHTML = `
      <div class="cliente-avatar" aria-hidden="true">${escapeHtml(getInitials(cliente.nomeCliente))}</div>

      <div class="cliente-main">
        <div class="cliente-name">${escapeHtml(cliente.nomeCliente || '—')}</div>
        <div class="cliente-meta">
          <span>${escapeHtml(cliente.telefone ? Formatters.formatPhone(cliente.telefone) : 'Sem telefone')}</span>
          <span class="cliente-meta-separator">·</span>
          <span class="cliente-meta-document">${escapeHtml(cliente.cpfcnpj ? Formatters.formatCpfCnpj(cliente.cpfcnpj) : 'Sem CPF/CNPJ')}</span>
          ${cliente.email ? `<span class="cliente-meta-separator cliente-email">·</span><span class="cliente-email" title="${escapeHtml(cliente.email)}">${escapeHtml(cliente.email)}</span>` : ''}
        </div>
      </div>

      <div class="cliente-row-end">
        ${renderStatus(cliente.status)}
        <button class="btn-edit-cliente" type="button" data-action="editar" data-id="${escapeHtml(cliente.clienteId)}" title="Editar cliente" aria-label="Editar ${escapeHtml(cliente.nomeCliente || 'cliente')}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </button>
      </div>
    `;
    fragment.appendChild(row);
  });

  elements.list.appendChild(fragment);
}


function aplicarMascaraCpfCnpj(event) {
  event.target.value = Formatters.formatCpfCnpj(event.target.value);
}

function aplicarMascaraTelefone(event) {
  event.target.value = Formatters.formatPhone(event.target.value);
}

function alternarFiltroStatus() {
  if (state.filtroStatus === 'Todos') {
    state.filtroStatus = 'Ativo';
  } else if (state.filtroStatus === 'Ativo') {
    state.filtroStatus = 'Inativo';
  } else {
    state.filtroStatus = 'Todos';
  }

  elements.btnFiltro.textContent = state.filtroStatus;

  renderClientes();
}

function handleBusca(event) {
  state.filtro = event.target.value.trim();
  renderClientes();
}

async function handleListaClick(event) {
  const button = event.target.closest('[data-action="editar"]');
  if (!button) return;

  const clienteId = button.dataset.id;
  if (!clienteId) return;

  button.disabled = true;

  try {
    const cliente = await apiRequest(`/oficinas/${oficinaId}/clientes/${clienteId}`);
    abrirModalEditarCliente(cliente);
  } catch (error) {
    console.error(error);
    showToast(getApiErrorMessage(error, 'Não foi possível carregar os dados do cliente.'), 'error');
  } finally {
    button.disabled = false;
  }
}

function abrirModalNovoCliente() {
  state.clienteEmEdicao = null;
  elements.form.reset();
  clearFieldErrors();

  elements.modalEyebrow.textContent = 'Cadastro';
  elements.modalTitle.textContent = 'Novo cliente';
  elements.btnSalvar.textContent = 'Salvar cliente';
  elements.statusField.classList.add('hidden');
  elements.status.value = 'Ativo';

  abrirModal();
}

function abrirModalEditarCliente(cliente) {
  state.clienteEmEdicao = cliente;
  elements.form.reset();
  clearFieldErrors();

  elements.nome.value = cliente.nomeCliente || '';
  elements.cpfCnpj.value = Formatters.formatCpfCnpj(cliente.cpfcnpj || '');
  elements.telefone.value = Formatters.formatPhone(cliente.telefone || '');
  elements.email.value = cliente.email || '';
  elements.status.value = normalizeEditableStatus(cliente.status);

  elements.modalEyebrow.textContent = `Cliente #${cliente.clienteId}`;
  elements.modalTitle.textContent = 'Editar cliente';
  elements.btnSalvar.textContent = 'Salvar alterações';
  elements.statusField.classList.remove('hidden');

  abrirModal();
}

function abrirModal() {
  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => elements.nome.focus(), 0);
}

function fecharModalCliente() {
  if (state.salvando) return;

  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.clienteEmEdicao = null;
  clearFieldErrors();
}

function handleModalBackdropClick(event) {
  if (event.target === elements.modal) fecharModalCliente();
}

function handleEscape(event) {
  if (event.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
    fecharModalCliente();
  }
}

async function salvarCliente(event) {
  event.preventDefault();

  const payloadBase = {
    nomeCliente: elements.nome.value.trim(),
    cpfCnpj: Formatters.onlyDigits(elements.cpfCnpj.value) || null,
    telefone: Formatters.onlyDigits(elements.telefone.value),
    email: elements.email.value.trim()
  };

  if (!validateForm(payloadBase)) return;

  const editando = Boolean(state.clienteEmEdicao);
  const clienteId = state.clienteEmEdicao?.clienteId;

  const payload = editando
    ? {
        ...payloadBase,
        status: elements.status.value
      }
    : payloadBase;

  setSaving(true);

  try {
    if (editando) {
      await apiRequest(`/oficinas/${oficinaId}/clientes/${clienteId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Cliente atualizado com sucesso.', 'success');
    } else {
      await apiRequest(`/oficinas/${oficinaId}/clientes`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Cliente cadastrado com sucesso.', 'success');
    }

    setSaving(false);
    fecharModalCliente();
    await carregarClientes();
  } catch (error) {
    console.error(error);
    handleSaveError(error);
  } finally {
    setSaving(false);
  }
}

function validateForm(data) {
  clearFieldErrors();
  let valid = true;

  if (!data.nomeCliente) {
    setFieldError('nomeCliente', 'Informe o nome do cliente.');
    valid = false;
  }
  if (!data.nomeCliente) {
  setFieldError('nomeCliente', 'Informe o nome do cliente.');
  valid = false;
} else if (/^\d/.test(data.nomeCliente.trim())) {
  setFieldError('nomeCliente', 'O nome não pode começar com um número.');
  valid = false;
}
  if (!data.telefone) {
    setFieldError('telefone', 'Informe o telefone.');
    valid = false;
  } else if (data.telefone.length !== 10 && data.telefone.length !== 11) {
    setFieldError(
      'telefone',
      'Informe um telefone fixo com 10 dígitos ou celular com 11 dígitos.'
    );
    valid = false;
  }

  if (!data.email) {
    setFieldError('email', 'Informe o e-mail.');
    valid = false;
  } else if (!isValidEmail(data.email)) {
    setFieldError('email', 'Informe um e-mail válido.');
    valid = false;
  }

  if (!valid) {
    showToast('Revise os campos obrigatórios.', 'warning');
  }

  return valid;
}

function handleSaveError(error) {
  const fieldErrors = extractValidationErrors(error?.body);

  if (fieldErrors.length > 0) {
    fieldErrors.forEach(({ field, message }) => setFieldError(field, message));
    showToast('Revise os dados informados.', 'warning');
    return;
  }

  showToast(getApiErrorMessage(error, 'Não foi possível salvar o cliente.'), 'error');
}

function extractValidationErrors(body) {
  if (!body) return [];

  if (Array.isArray(body.errors)) {
    return body.errors
      .map((item) => ({
        field: mapBackendField(item.field || item.campo),
        message: item.defaultMessage || item.message || item.mensagem || 'Valor inválido.'
      }))
      .filter((item) => item.field);
  }

  if (body.errors && typeof body.errors === 'object') {
    return Object.entries(body.errors)
      .map(([field, message]) => ({ field: mapBackendField(field), message: String(message) }))
      .filter((item) => item.field);
  }

  return [];
}

function mapBackendField(field) {
  const fields = {
    nomeCliente: 'nomeCliente',
    cpfCnpj: 'cpfCnpj',
    cpfcnpj: 'cpfCnpj',
    telefone: 'telefone',
    email: 'email',
    status: 'status'
  };

  return fields[field] || null;
}

function setFieldError(fieldName, message) {
  const input = elements.form.elements[fieldName];
  const error = elements.form.querySelector(`[data-error-for="${fieldName}"]`);

  if (input) input.classList.add('invalid');
  if (error) error.textContent = message;
}

function clearFieldErrors() {
  elements.form.querySelectorAll('.invalid').forEach((input) => input.classList.remove('invalid'));
  elements.form.querySelectorAll('.field-error').forEach((error) => {
    error.textContent = '';
  });
}

function setListLoading(loading) {
  if (loading) {
    elements.loading.classList.remove('hidden');
    elements.list.classList.add('hidden');
    elements.empty.classList.add('hidden');
    elements.count.textContent = 'Carregando...';
    return;
  }

  elements.loading.classList.add('hidden');
  renderClientes();
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

function renderStatus(status) {
  const value = normalizeStatusValue(status);
  return `<span class="cliente-status" data-status="${escapeHtml(value)}">${escapeHtml(value)}</span>`;
}

function formatStatus(status) {
  if (!status) return '—';
  return String(status).replaceAll('_', ' ');
}

function formatTotalCount(total) {
  return `${total} ${total === 1 ? 'cadastrado' : 'cadastrados'}`;
}

function normalizeEditableStatus(status) {
  return normalizeStatusValue(status);
}

function normalizeStatusValue(status) {
  const normalized = String(status || 'Ativo').trim().toLowerCase();
  return normalized === 'inativo' ? 'Inativo' : 'Ativo';
}

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return '--';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function normalizeSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
