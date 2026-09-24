const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '../dashboard/dashboard.html', icon: 'dashboard' },
  { id: 'clientes', label: 'Clientes', href: '../clientes/clientes.html', icon: 'users' },
  { id: 'veiculos', label: 'Veículos', href: '../veiculos/veiculos.html', icon: 'car' },
  { id: 'orcamentos', label: 'Orçamentos', href: '../orcamentos/orcamentos.html', icon: 'file' },
  { id: 'ordens-servico', label: 'Ordens de Serviço', href: '../ordens-servico/ordens-servico.html', icon: 'clipboard' },
  { id: 'estoque', label: 'Estoque', href: '../estoque/estoque.html', icon: 'package' },
  { id: 'fluxo-caixa', label: 'Fluxo de Caixa', href: '../fluxo-caixa/fluxo-caixa.html', icon: 'chart' }
];

const MENU_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  car: '<svg viewBox="0 0 24 24"><path d="M5 17h14v-5l-2-5H7l-2 5v5Z"/><path d="M7 17v2M17 17v2M5 12h14"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/></svg>',
  package: '<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 7 9 5 9-5M3 7v10l9 5 9-5V7M12 12v10"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 16 4-5 3 3 5-7"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>'
};

function renderMenu(activePage) {
  const target = document.querySelector('[data-menu]');
  if (!target) return;

  const links = MENU_ITEMS.map(item => `
    <a class="sidebar-link ${item.id === activePage ? 'active' : ''}" href="${item.href}">
      <span class="sidebar-link-icon" aria-hidden="true">${MENU_ICONS[item.icon]}</span>
      <span>${item.label}</span>
    </a>
  `).join('');

  const userName = Session.getUsuarioNome() || 'Usuário';
  const userRole = Session.getUsuarioPerfil() || 'Oficina';

  target.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img src="../assets/images/logoeixo.png" alt="EIXO">
      </div>

      <nav class="sidebar-nav" aria-label="Menu principal">
        <div class="sidebar-section-label">Gestão da oficina</div>
        ${links}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-name">${escapeHtml(userName)}</div>
          <div class="sidebar-user-role">${escapeHtml(userRole)}</div>
        </div>
        <button class="sidebar-logout" type="button" data-logout>
          ${MENU_ICONS.logout}
          <span>Sair do sistema</span>
        </button>
      </div>
    </aside>
    <div class="sidebar-overlay" data-menu-overlay></div>
  `;

  target.querySelector('[data-logout]')?.addEventListener('click', logout);
  target.querySelector('[data-menu-overlay]')?.addEventListener('click', closeMenu);
}

function logout() {
  Session.clear();
  window.location.href = '../login/login.html';
}

function closeMenu() {
  document.body.classList.remove('menu-open');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
