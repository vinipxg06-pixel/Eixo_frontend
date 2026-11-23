/**
 * Select com pesquisa.
 *
 * Melhora qualquer <select data-pesquisavel> trocando a lista nativa (que vaza da tela quando há muitas
 * opções) por um painel com campo de busca e rolagem. O <select> original continua no formulário e segue
 * sendo a fonte da verdade: valor, opções, disabled, classes de erro, evento "change" e form.reset().
 * Por isso o código das telas não muda — basta marcar o select com o atributo data-pesquisavel,
 * inclusive em selects criados depois (ex.: linhas de peças), que são detectados automaticamente.
 */
const SelectPesquisavel = (() => {
  const SELETOR = 'select[data-pesquisavel]';
  const CLASSES_DE_ERRO = ['invalid', 'field-invalid'];
  const ALTURA_PAINEL = 300;
  const descritorValor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  const descritorIndice = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');
  let contador = 0;

  function normalizar(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function aplicar(select) {
    if (select.dataset.pesquisavelAtivo) return;
    select.dataset.pesquisavelAtivo = 'true';
    contador += 1;

    const raiz = document.createElement('div');
    raiz.className = 'select-pesquisavel';

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'select-pesquisavel-botao';
    botao.id = `${select.id || 'select'}-pesquisavel-${contador}`;
    botao.setAttribute('aria-haspopup', 'listbox');
    botao.setAttribute('aria-expanded', 'false');
    if (select.getAttribute('aria-label')) botao.setAttribute('aria-label', select.getAttribute('aria-label'));

    const painel = document.createElement('div');
    painel.className = 'select-pesquisavel-painel hidden';
    const busca = document.createElement('input');
    busca.type = 'search';
    busca.className = 'select-pesquisavel-busca';
    busca.placeholder = 'Pesquisar...';
    busca.autocomplete = 'off';
    busca.setAttribute('aria-label', 'Pesquisar opções');
    const lista = document.createElement('ul');
    lista.className = 'select-pesquisavel-lista';
    lista.setAttribute('role', 'listbox');
    painel.append(busca, lista);

    select.parentNode.insertBefore(raiz, select);
    raiz.append(select, botao, painel);
    select.classList.add('select-pesquisavel-nativo');

    // O <label for="..."> passa a apontar para o botão visível
    if (select.id) {
      const label = document.querySelector(`label[for="${select.id}"]`);
      if (label) label.htmlFor = botao.id;
    }

    let destaque = -1;

    function opcoesSelecionaveis() {
      return [...select.options].filter((opcao) => opcao.value !== '');
    }

    function sincronizar() {
      const selecionada = select.options[select.selectedIndex];
      const placeholder = [...select.options].find((opcao) => opcao.value === '');
      const temValor = selecionada && selecionada.value !== '';
      botao.textContent = temValor ? selecionada.textContent : (placeholder?.textContent || 'Selecione');
      botao.classList.toggle('vazio', !temValor);
      botao.disabled = select.disabled;
      const comErro = CLASSES_DE_ERRO.some((classe) => select.classList.contains(classe));
      botao.classList.toggle('select-pesquisavel-invalido', comErro);
      if (!painel.classList.contains('hidden')) renderizar();
    }

    function renderizar() {
      const termo = normalizar(busca.value);
      const visiveis = opcoesSelecionaveis().filter((opcao) => normalizar(opcao.textContent).includes(termo));
      lista.innerHTML = '';
      if (!visiveis.length) {
        const vazio = document.createElement('li');
        vazio.className = 'select-pesquisavel-sem-resultado';
        vazio.textContent = 'Nenhuma opção encontrada';
        lista.appendChild(vazio);
        destaque = -1;
        return;
      }
      visiveis.forEach((opcao, indice) => {
        const item = document.createElement('li');
        item.className = 'select-pesquisavel-opcao';
        item.setAttribute('role', 'option');
        item.dataset.valor = opcao.value;
        item.textContent = opcao.textContent;
        item.setAttribute('aria-selected', String(opcao.value === select.value));
        if (opcao.disabled) item.setAttribute('aria-disabled', 'true');
        if (opcao.value === select.value) item.classList.add('selecionada');
        lista.appendChild(item);
        if (opcao.value === select.value && destaque < 0) destaque = indice;
      });
      aplicarDestaque();
    }

    function itensHabilitados() {
      return [...lista.querySelectorAll('.select-pesquisavel-opcao:not([aria-disabled="true"])')];
    }

    function aplicarDestaque() {
      const itens = itensHabilitados();
      itens.forEach((item, indice) => item.classList.toggle('destacada', indice === destaque));
      itens[destaque]?.scrollIntoView({ block: 'nearest' });
    }

    function posicionar() {
      const retangulo = botao.getBoundingClientRect();
      const espacoAbaixo = window.innerHeight - retangulo.bottom;
      const abrirParaCima = espacoAbaixo < ALTURA_PAINEL && retangulo.top > espacoAbaixo;
      painel.style.left = `${retangulo.left}px`;
      painel.style.width = `${Math.max(retangulo.width, 220)}px`;
      painel.style.top = abrirParaCima ? '' : `${retangulo.bottom + 4}px`;
      painel.style.bottom = abrirParaCima ? `${window.innerHeight - retangulo.top + 4}px` : '';
    }

    function abrir() {
      if (select.disabled) return;
      busca.value = '';
      destaque = -1;
      painel.classList.remove('hidden');
      botao.setAttribute('aria-expanded', 'true');
      posicionar();
      renderizar();
      busca.focus();
    }

    function fechar({ focarBotao = false } = {}) {
      if (painel.classList.contains('hidden')) return;
      painel.classList.add('hidden');
      botao.setAttribute('aria-expanded', 'false');
      if (focarBotao) botao.focus();
    }

    function escolher(valor) {
      const opcao = [...select.options].find((item) => item.value === valor);
      if (!opcao || opcao.disabled) return;
      descritorValor.set.call(select, valor);
      sincronizar();
      fechar({ focarBotao: true });
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    botao.addEventListener('click', () => (painel.classList.contains('hidden') ? abrir() : fechar()));
    botao.addEventListener('keydown', (evento) => {
      if (evento.key === 'ArrowDown') { evento.preventDefault(); abrir(); }
    });
    busca.addEventListener('input', () => { destaque = 0; renderizar(); destaque = itensHabilitados().length ? 0 : -1; aplicarDestaque(); });
    busca.addEventListener('keydown', (evento) => {
      const itens = itensHabilitados();
      if (evento.key === 'ArrowDown') { evento.preventDefault(); destaque = Math.min(destaque + 1, itens.length - 1); aplicarDestaque(); }
      if (evento.key === 'ArrowUp') { evento.preventDefault(); destaque = Math.max(destaque - 1, 0); aplicarDestaque(); }
      if (evento.key === 'Enter') { evento.preventDefault(); if (itens[destaque]) escolher(itens[destaque].dataset.valor); }
      if (evento.key === 'Escape') { evento.preventDefault(); evento.stopPropagation(); fechar({ focarBotao: true }); }
      if (evento.key === 'Tab') fechar();
    });
    lista.addEventListener('mousedown', (evento) => evento.preventDefault()); // mantém o foco na busca
    lista.addEventListener('click', (evento) => {
      const item = evento.target.closest('.select-pesquisavel-opcao');
      if (item && item.getAttribute('aria-disabled') !== 'true') escolher(item.dataset.valor);
    });
    document.addEventListener('mousedown', (evento) => { if (!raiz.contains(evento.target)) fechar(); }, true);
    window.addEventListener('resize', () => fechar());
    window.addEventListener('scroll', (evento) => { if (!painel.contains(evento.target)) fechar(); }, true);

    // Mudanças feitas pelo código das telas (opções, disabled, erro, valor, reset) refletem no botão
    new MutationObserver(sincronizar).observe(select, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'class']
    });
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() { return descritorValor.get.call(this); },
      set(valor) { descritorValor.set.call(this, valor); sincronizar(); }
    });
    Object.defineProperty(select, 'selectedIndex', {
      configurable: true,
      get() { return descritorIndice.get.call(this); },
      set(indice) { descritorIndice.set.call(this, indice); sincronizar(); }
    });
    select.form?.addEventListener('reset', () => setTimeout(sincronizar, 0));
    select.addEventListener('change', sincronizar);

    sincronizar();
  }

  function aplicarEm(raiz) {
    if (raiz.matches?.(SELETOR)) aplicar(raiz);
    raiz.querySelectorAll?.(SELETOR).forEach(aplicar);
  }

  aplicarEm(document);
  new MutationObserver((mutacoes) => {
    mutacoes.forEach((mutacao) => mutacao.addedNodes.forEach((no) => {
      if (no.nodeType === Node.ELEMENT_NODE) aplicarEm(no);
    }));
  }).observe(document.body, { childList: true, subtree: true });

  return { aplicar };
})();
