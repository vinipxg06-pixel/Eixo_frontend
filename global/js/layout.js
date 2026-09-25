function renderHeader(sectionName) {
  const target = document.querySelector('[data-header]');
  if (!target) return;

  target.className = 'app-header';
  target.innerHTML = `
    <div class="app-header-left">
      <button class="menu-toggle" type="button" aria-label="Abrir menu" data-menu-toggle>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <span class="app-header-section">${escapeLayoutHtml(sectionName)}</span>
    </div>

    <div class="app-header-right">
      <span class="app-header-date">${formatCurrentDate()}</span>
    </div>
  `;

  target.querySelector('[data-menu-toggle]')?.addEventListener('click', () => {
    document.body.classList.toggle('menu-open');
  });
}

function formatCurrentDate() {
  const text = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return text.replaceAll('.', '');
}

function escapeLayoutHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
