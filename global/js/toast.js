function showToast(message, type = 'info', title = '') {
  let container = document.querySelector('.toast-container');

  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const titles = {
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Atenção',
    info: 'Informação'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const content = document.createElement('div');
  content.className = 'toast-content';

  const titleElement = document.createElement('div');
  titleElement.className = 'toast-title';
  titleElement.textContent = title || titles[type] || titles.info;

  const messageElement = document.createElement('div');
  messageElement.className = 'toast-message';
  messageElement.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'toast-close';
  closeButton.setAttribute('aria-label', 'Fechar aviso');
  closeButton.textContent = '×';

  content.append(titleElement, messageElement);
  toast.append(content, closeButton);
  container.appendChild(toast);

  const removeToast = () => {
    if (!toast.isConnected) return;
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 180);
  };

  closeButton.addEventListener('click', removeToast);
  setTimeout(removeToast, 3500);
}
