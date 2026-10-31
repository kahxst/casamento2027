/* =========================================================
   CONFIGURAÇÕES — é só aqui que você precisa mexer
   ========================================================= */

// Link do botão "Envie seu presente". Troque o endereço entre as aspas
// pelo link real da lista (ainda é um endereço de exemplo).
const GIFT_LIST_URL = "https://SEU-LINK-DA-LISTA-AQUI.com";

// Carrossel de looks: tempo entre uma foto e outra (em milissegundos).
const CAROUSEL_INTERVAL = 2000;

// Data e hora do casamento (horário de Brasília, UTC-3).
const WEDDING_DATE = new Date("2027-01-30T14:00:00-03:00");

// Para onde o botão "Confirme sua presença" leva: a página do formulário.
// (Se um dia o formulário for para outro endereço, troque aqui.)
const RSVP_URL = "formulario-confirmacao/index.html";

// false = todo mundo vê as animações (envelope, flores, carrossel), mesmo que o computador/celular
//         esteja com "reduzir animações" ligado. (padrão, para o convite sempre aparecer completo)
// true  = quem ativou "reduzir movimento" no aparelho não vê animações (opção de acessibilidade).
const RESPECT_REDUCED_MOTION = false;

/* =========================================================
   Movimento reduzido
   ========================================================= */
if (!RESPECT_REDUCED_MOTION) document.documentElement.classList.add("force-motion");
const REDUCED_MOTION = RESPECT_REDUCED_MOTION && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   Abertura com envelope
   entra -> selo estala -> aba abre -> convite sobe -> some e mostra a capa
   Clique/toque no selo abre na hora; "Pular" ou Esc vai direto para a capa.
   ========================================================= */
(function intro() {
  const html = document.documentElement;
  const root = document.getElementById("intro");
  const release = () => html.classList.remove("has-intro", "cover-hold");

  if (!root || !html.classList.contains("has-intro")) { release(); if (root) root.remove(); return; }
  if (REDUCED_MOTION) { release(); root.remove(); return; }

  const seal = root.querySelector(".envelope__seal");
  const skip = root.querySelector(".intro__skip");
  const behind = [document.querySelector("main"), document.querySelector(".page-dots"), document.querySelector(".skip-link")];
  behind.forEach((el) => el && (el.inert = true));

  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers.length = 0; };
  let state = "waiting"; // waiting -> opening -> leaving -> done

  function finish() {
    if (state === "done") return;
    state = "done";
    clearTimers();
    release();
    behind.forEach((el) => el && (el.inert = false));
    root.remove();
  }
  function leave() {
    if (state === "leaving" || state === "done") return;
    state = "leaving";
    clearTimers();
    root.classList.add("is-leaving");
    later(() => html.classList.remove("cover-hold"), 450); // a capa começa a animar enquanto o envelope some
    later(finish, 1500);
  }
  function open() {
    if (state !== "waiting") return;
    state = "opening";
    clearTimers();
    root.classList.add("is-seal-pop");
    later(() => root.classList.add("is-open"), 350);   // aba abre
    later(() => root.classList.add("is-rise"), 1250);  // convite sobe
    later(leave, 2500);
  }

  root.addEventListener("click", () => { if (state === "waiting") open(); else if (state === "opening") leave(); });
  skip.addEventListener("click", (e) => { e.stopPropagation(); leave(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") leave(); });

  // Espera imagens e fontes ficarem prontas para a animação não "engasgar".
  const imgs = [...root.querySelectorAll("img")].map((i) => (i.decode ? i.decode().catch(() => {}) : null));
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : null;
  // também espera a imagem de fundo (a mesma escolhida pelo CSS) para ela não "aparecer de repente"
  const bgSrc = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? "assets/fundo_envelope.jpg" : "assets/fundo_envelope_wide.jpg";
  const bg = new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = bgSrc; });
  Promise.race([Promise.all([...imgs, fonts, bg]), new Promise((r) => setTimeout(r, 2500))]).then(() => {
    if (state !== "waiting") return;
    root.classList.add("is-in");
    seal.focus({ preventScroll: true });
    later(open, 1900); // abre sozinho depois de um instante
  });
})();

/* =========================================================
   Links e botões
   ========================================================= */
(function setupLinks() {
  const giftLink = document.getElementById("gift-link");
  const rsvpLink = document.getElementById("rsvp-link");
  if (giftLink && GIFT_LIST_URL.trim()) giftLink.href = GIFT_LIST_URL.trim();
  if (rsvpLink && RSVP_URL.trim()) rsvpLink.href = RSVP_URL.trim();
})();

/* =========================================================
   Rolagem suave ao clicar em "Ver detalhes", nas bolinhas e nos links internos
   (animação própria, mais lenta e com aceleração/desaceleração)
   ========================================================= */
(function smoothAnchors() {
  const html = document.documentElement;
  let frame = null;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    html.style.scrollSnapType = "";
    html.style.scrollBehavior = "";
  }

  function scrollToY(targetY) {
    stop();
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) return;
    if (REDUCED_MOTION) { window.scrollTo(0, targetY); return; }

    const duration = Math.min(2600, Math.max(1500, Math.abs(dist) * 1.15));
    const t0 = performance.now();
    html.style.scrollSnapType = "none";   // o "imã" das seções atrapalha a animação
    html.style.scrollBehavior = "auto";

    (function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, startY + dist * ease(p));
      if (p < 1) frame = requestAnimationFrame(step); else stop();
    })(t0);
  }

  // Se a pessoa mexer na tela durante a animação, ela para na hora.
  ["wheel", "touchstart", "keydown", "mousedown"].forEach((ev) => window.addEventListener(ev, () => { if (frame) stop(); }, { passive: true }));

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    scrollToY(target.getBoundingClientRect().top + window.scrollY);
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
})();

/* =========================================================
   Contagem regressiva
   ========================================================= */
(function countdown() {
  const els = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    mins: document.getElementById("cd-mins"),
    secs: document.getElementById("cd-secs"),
  };
  const box = document.getElementById("countdown");
  const done = document.getElementById("countdown-done");
  const sr = document.getElementById("countdown-sr");
  const two = (n) => String(n).padStart(2, "0");
  let lastMinute = -1;
  let timer;

  function tick() {
    const diff = WEDDING_DATE - new Date();

    if (diff <= 0) {
      clearInterval(timer);
      box.hidden = true;
      done.hidden = false;
      done.textContent = diff > -86400000 ? "Hoje é o nosso dia!" : "Obrigado por celebrar com a gente!";
      return;
    }

    const totalSecs = Math.floor(diff / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    els.days.textContent = days;
    els.hours.textContent = two(hours);
    els.mins.textContent = two(mins);
    els.secs.textContent = two(secs);

    // Leitores de tela: atualiza só a cada minuto, para não falar sem parar.
    if (mins !== lastMinute) {
      lastMinute = mins;
      sr.textContent = `Faltam ${days} dias, ${hours} horas e ${mins} minutos para o casamento.`;
    }
  }

  tick();
  timer = setInterval(tick, 1000);
})();

/* =========================================================
   Bolinhas laterais: marcam a seção que está no meio da tela
   ========================================================= */
(function pageDots() {
  const sections = [...document.querySelectorAll(".page")];
  const dots = [...document.querySelectorAll(".page-dots .dot")];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const index = sections.indexOf(entry.target);
      dots.forEach((dot, i) => {
        const active = i === index;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });

  sections.forEach((s) => observer.observe(s));
})();

/* =========================================================
   Entrada suave das seções internas
   ========================================================= */
(function reveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    items.forEach((i) => i.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });
  items.forEach((i) => observer.observe(i));
})();

/* =========================================================
   Carrossel de looks
   - passa sozinho a cada CAROUSEL_INTERVAL ms
   - setas, bolinhas, teclado (← →) e arrastar com o dedo
   - pausa ao passar o mouse/focar, com a aba escondida ou fora da tela
   - quem prefere menos movimento não recebe a passagem automática
   ========================================================= */
(function carousel() {
  const root = document.getElementById("looks");
  if (!root) return;

  const track = root.querySelector(".carousel__track");
  const slides = [...track.children];
  const total = slides.length;
  const dots = [...root.querySelectorAll(".carousel__dot")];
  const pauseBtn = root.querySelector(".carousel__pause");
  
  // Cópia do primeiro slide no fim, para a volta ficar contínua.
  const clone = slides[0].cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.querySelector("img").alt = "";
  track.appendChild(clone);

  let index = 0;            // posição atual (total = cópia do primeiro)
  let timer = null;
  let userPaused = REDUCED_MOTION;
  let hovering = false;
  let offscreen = true;

  function render(animate = true) {
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translateX(${-index * 100}%)`;
    const current = index % total;
    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i === current);
      d.setAttribute("aria-current", i === current ? "true" : "false");
    });
    if (!animate) void track.offsetWidth; // aplica o salto sem animação
  }

  function next() {
    if (index >= total) { index = 0; render(false); }
    index += 1;
    render();
  }
  function prev() {
    if (index <= 0) { index = total; render(false); }
    index -= 1;
    render();
  }
  function goTo(i) { index = i; render(); }

  // Terminou de entrar na cópia? Volta ao início sem ninguém perceber.
  track.addEventListener("transitionend", (e) => {
    if (e.target !== track) return;
    if (index >= total) { index = 0; render(false); }
  });

  function shouldRun() { return !userPaused && !hovering && !offscreen && !document.hidden; }
  function restart() {
    clearInterval(timer);
    timer = null;
    if (shouldRun()) timer = setInterval(next, CAROUSEL_INTERVAL);
  }

  function setPaused(value) {
    userPaused = value;
    pauseBtn.setAttribute("aria-pressed", String(value));
    pauseBtn.setAttribute("aria-label", value ? "Retomar passagem automática" : "Pausar passagem automática");
    root.classList.toggle("is-paused", value);
    track.setAttribute("aria-live", value ? "polite" : "off");
    restart();
  }

  root.querySelector(".carousel__btn--next").addEventListener("click", () => { next(); restart(); });
  root.querySelector(".carousel__btn--prev").addEventListener("click", () => { prev(); restart(); });
  dots.forEach((d, i) => d.addEventListener("click", () => { goTo(i); restart(); }));
  pauseBtn.addEventListener("click", () => setPaused(!userPaused));

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { next(); restart(); }
    if (e.key === "ArrowLeft") { prev(); restart(); }
  });

  // Pausa enquanto o mouse está em cima ou algum botão tem o foco.
  root.addEventListener("mouseenter", () => { hovering = true; restart(); });
  root.addEventListener("mouseleave", () => { hovering = false; restart(); });
  root.addEventListener("focusin", () => { hovering = true; restart(); });
  root.addEventListener("focusout", () => { hovering = false; restart(); });

  // Arrastar com o dedo no celular.
  let startX = null;
  root.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 40) return;
    dx < 0 ? next() : prev();
    restart();
  });

  document.addEventListener("visibilitychange", restart);
  new IntersectionObserver((entries) => {
    offscreen = !entries[0].isIntersecting;
    restart();
  }, { threshold: 0.35 }).observe(root);

  if (userPaused) setPaused(true);
  render(false);
})();
