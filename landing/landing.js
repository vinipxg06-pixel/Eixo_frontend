/* EIXO — interações da landing page (index.html). As telas do sistema não usam este arquivo. */
'use strict';

const raiz = document.documentElement;
const anima = raiz.classList.contains('anima');
const $ = s => document.querySelector(s);

/* ---------- Cabeçalho, menu mobile e barra de progresso ---------- */
const cabecalho = $('#cabecalho');
const menuBtn = $('.menu-btn');
const menu = $('#menu');
const progresso = $('.barra-topo__progresso');

function fecharMenu(devolverFoco = false) {
  cabecalho.classList.remove('aberto');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Abrir menu');
  document.body.style.overflow = '';
  if (devolverFoco) menuBtn.focus();
}
menuBtn.addEventListener('click', () => {
  const abrir = menuBtn.getAttribute('aria-expanded') !== 'true';
  cabecalho.classList.toggle('aberto', abrir);
  menuBtn.setAttribute('aria-expanded', String(abrir));
  menuBtn.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  document.body.style.overflow = abrir ? 'hidden' : '';
});
menu.addEventListener('click', e => { if (e.target.closest('a')) fecharMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && cabecalho.classList.contains('aberto')) fecharMenu(true); });
matchMedia('(min-width: 861px)').addEventListener('change', () => fecharMenu());

let pedido = false;
function aoRolar() {
  pedido = false;
  cabecalho.classList.toggle('rolou', scrollY > 8);
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
  progresso.style.width = `max(280px, ${(p * 100).toFixed(2)}%)`;
}
addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(aoRolar); } }, { passive: true });
addEventListener('resize', aoRolar);
aoRolar();

/* ---------- Link da seção atual ---------- */
const links = [...menu.querySelectorAll('.link-nav[href^="#"]')];
const obsMenu = new IntersectionObserver(ents => {
  ents.forEach(en => { if (en.isIntersecting) links.forEach(l => l.toggleAttribute('aria-current', l.hash === `#${en.target.id}`)); });
}, { rootMargin: '-45% 0px -50% 0px' });
links.forEach(l => { const s = document.querySelector(l.hash); if (s) obsMenu.observe(s); });

/* ---------- Entrada do hero e revelações ---------- */
if (anima) requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.add('carregou')));

const alvos = document.querySelectorAll('.revela, [data-etapas]');
if (anima) {
  const obs = new IntersectionObserver(ents => {
    ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visivel'); obs.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  alvos.forEach(el => obs.observe(el));
  addEventListener('scroll', () => {
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 4) alvos.forEach(el => el.classList.add('visivel'));
  }, { passive: true });
} else {
  alvos.forEach(el => el.classList.add('visivel'));
}

/* ---------- Total da OS contando ---------- */
const total = $('[data-total]');
if (total && anima) {
  const alvo = Number(total.dataset.total);
  const fmt = v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  total.textContent = fmt(0);
  setTimeout(() => {
    const t0 = performance.now();
    const passo = t => {
      const p = Math.min((t - t0) / 1200, 1);
      total.textContent = fmt(Math.round(alvo * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }, 1100);
}

/* ---------- Card da OS inclinando com o mouse (só desktop) ---------- */
const os = $('.os');
if (os && anima && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  os.addEventListener('mousemove', e => {
    const r = os.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    os.style.transform = `perspective(1000px) rotateY(${(x * 6).toFixed(2)}deg) rotateX(${(-y * 6).toFixed(2)}deg)`;
  });
  os.addEventListener('mouseleave', () => { os.style.transform = ''; });
}

/* ---------- Faixa de especialidades em rolagem contínua ---------- */
const janela = $('.faixa__janela');
if (janela) {
  const lista = janela.querySelector('.faixa__lista');
  const trilho = document.createElement('div');
  trilho.className = 'faixa__trilho';
  janela.replaceChild(trilho, lista);
  trilho.append(lista);
  const montar = () => {
    trilho.querySelectorAll('[aria-hidden="true"]').forEach(c => c.remove());
    const base = lista.scrollWidth || 1;
    const copias = Math.max(1, Math.ceil(janela.clientWidth / base));
    // Metade do trilho precisa cobrir a janela; duplicamos o conjunto inteiro.
    for (let i = 0; i < copias * 2 - 1; i++) {
      const c = lista.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      trilho.append(c);
    }
    trilho.style.setProperty('--duracao', `${Math.round((trilho.scrollWidth / 2) / 40)}s`);
  };
  montar();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(montar, 200); });
}

/* ---------- Vídeo com capa ---------- */
const video = $('.video-demo__video');
const capa = $('.video-demo__capa');
if (video && capa) {
  capa.addEventListener('click', () => { capa.hidden = true; video.play().catch(() => {}); video.focus(); });
  video.addEventListener('play', () => { capa.hidden = true; });
  video.addEventListener('ended', () => { capa.hidden = false; });
}
