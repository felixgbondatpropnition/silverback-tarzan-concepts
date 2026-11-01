/* Silverback Tarzan. Plain JS, no dependencies. Everything here is enhancement: with JS off, every word, link and price is on the page. */
(() => {
  const d = document, root = d.documentElement, body = d.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 900px) and (min-aspect-ratio: 1/1), (min-width: 560px) and (min-aspect-ratio: 5/4)');

  /* menu: a modal dialog with a focus trap; Escape closes */
  const menu = d.getElementById('menu');
  const openers = [...d.querySelectorAll('[data-menu-open]')];
  let lastFocus = null;
  const focusables = () => [...menu.querySelectorAll('a[href], button:not([disabled])')].filter(el => el.offsetParent !== null);
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    /* the trap moves focus itself: WebKit's Tab skips links, so it would otherwise fall out of the dialog */
    e.preventDefault();
    const i = f.indexOf(d.activeElement);
    f[e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i + 1) % f.length].focus();
  }
  function openMenu(e) {
    if (e) e.preventDefault();
    lastFocus = d.activeElement; menu.hidden = false; root.classList.add('menu-open');
    openers.forEach(o => o.setAttribute('aria-expanded', 'true'));
    d.addEventListener('keydown', onKey);
    /* focus the dialog itself: screen readers read its name, and a phone is not left with a focus box round Close */
    menu.scrollTop = 0; menu.focus({ preventScroll: true });
  }
  function closeMenu(back) {
    menu.hidden = true; root.classList.remove('menu-open');
    openers.forEach(o => o.setAttribute('aria-expanded', 'false'));
    d.removeEventListener('keydown', onKey);
    if (back && lastFocus) lastFocus.focus();
  }
  openers.forEach(o => {
    o.setAttribute('role', 'button'); o.setAttribute('aria-controls', 'menu'); o.setAttribute('aria-expanded', 'false');
    o.addEventListener('click', openMenu);
    o.addEventListener('keydown', e => { if (e.key === ' ') openMenu(e); });
  });
  if (menu) {
    menu.querySelector('[data-menu-close]').addEventListener('click', () => closeMenu(true));
    menu.addEventListener('click', e => { if (e.target.closest('a[href]')) closeMenu(false); });
  }

  /* header: see-through only on the sky at the very top of the home page */
  const hasHero = body.classList.contains('has-hero');
  const onScroll = () => { if (hasHero) body.classList.toggle('at-top', scrollY < 6); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const doors = d.querySelector('.hero .doors');
  if (doors) new IntersectionObserver(([en]) => body.classList.toggle('past-hero', !en.isIntersecting && en.boundingClientRect.top < 0)).observe(doors);

  /* header and dock take the colour of the scene beneath them, so the bar always belongs to the time of day */
  const tones = [...d.querySelectorAll('[data-hdr-bg]')];
  const base = [body.style.getPropertyValue('--hdr-bg'), body.style.getPropertyValue('--hdr-ink')];
  const setTone = () => {
    const y = parseFloat(getComputedStyle(d.querySelector('.hdr')).height) + 1;
    const el = tones.find(t => { const r = t.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
    body.style.setProperty('--hdr-bg', el ? el.dataset.hdrBg : base[0]);
    body.style.setProperty('--hdr-ink', el ? el.dataset.hdrInk : base[1]);
  };
  let toneQueued = false;
  addEventListener('scroll', () => { if (!toneQueued) { toneQueued = true; requestAnimationFrame(() => { toneQueued = false; setTone(); }); } }, { passive: true });
  addEventListener('resize', setTone); setTone();

  /* subtitles appear when their scene is on screen; the stars come out once, slowly */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-seen', 'lit'); io.unobserve(e.target); } }), { threshold: .3 });
  d.querySelectorAll('.scene, .opener').forEach(el => io.observe(el));
  const starIo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lit'); starIo.unobserve(e.target); } }), { threshold: .02 });
  d.querySelectorAll('.stars').forEach(el => starIo.observe(el));

  /* the opening lines change every few seconds, in step with the loop. Pause stops the words as well as the clip */
  const line = d.querySelector('[data-subs]');
  if (line && !reduce.matches) {
    const lines = ['Cosmic entertainment. You’ve come to the right place.', 'Real world movement, products and everyday philosophy.', 'Observing myself and learning what happens.'];
    const shot = d.querySelector('.hero [data-video]'); let i = 0, inView = true;
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }).observe(d.getElementById('top'));
    setInterval(() => {
      if (!inView || d.hidden || shot.dataset.paused) return;
      i = (i + 1) % lines.length; line.classList.add('is-swapping');
      setTimeout(() => { line.textContent = lines[i]; line.classList.remove('is-swapping'); }, 420);
    }, 4800);
  }

  /* video: poster first, clip only after load and only in view, faded in on its first painted frame, so no system play button ever shows */
  function initVideos() {
    d.querySelectorAll('[data-video]').forEach(fig => {
      const v = fig.querySelector('video'), btn = fig.closest('section').querySelector('[data-playctl]');
      if (!v) return;
      let loaded = false, userPaused = reduce.matches, inView = false, timer = 0;
      const label = btn && btn.querySelector('span'), icon = btn && btn.querySelector('use');
      const setBtn = s => { if (!btn) return; btn.hidden = false; label.textContent = s === 'pause' ? 'Pause' : 'Play'; icon.setAttribute('href', s === 'pause' ? '#i-pause' : '#i-play'); btn.setAttribute('aria-label', (s === 'pause' ? 'Pause' : 'Play') + ' the clip'); };
      const reveal = () => {
        if (v.classList.contains('is-playing')) return;
        if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(() => v.classList.add('is-playing'));
        else { const t = () => { if (v.currentTime > 0) { v.classList.add('is-playing'); v.removeEventListener('timeupdate', t); } }; v.addEventListener('timeupdate', t); }
      };
      const play = () => {
        if (!loaded) { loaded = true; v.src = (wide.matches && v.dataset.srcWide) || v.dataset.src; v.load(); }
        const p = v.play(); if (p && p.then) p.then(() => { reveal(); setBtn('pause'); }).catch(() => setBtn('play'));
      };
      const pause = () => { if (loaded) v.pause(); };
      setBtn('play'); /* it only says Pause once the clip is really playing, so refused autoplay shows a true Play button over the poster */
      /* turning a phone or tablet changes which clip fits, so the next play picks again */
      if (v.dataset.srcWide) wide.addEventListener('change', () => { if (!loaded) return; loaded = false; v.classList.remove('is-playing'); if (inView && !userPaused) play(); });
      if (userPaused) fig.dataset.paused = '1';
      if (btn) btn.addEventListener('click', () => {
        if (v.paused || !loaded) { userPaused = false; delete fig.dataset.paused; play(); }
        else { userPaused = true; fig.dataset.paused = '1'; pause(); setBtn('play'); }
      });
      /* a short wait, so flicking past a scene never starts a download */
      new IntersectionObserver(([e]) => {
        inView = e.isIntersecting; clearTimeout(timer);
        if (inView && !userPaused) timer = setTimeout(play, 250); else if (!inView) pause();
      }, { threshold: .25 }).observe(fig);
      d.addEventListener('visibilitychange', () => { if (d.hidden) pause(); else if (inView && !userPaused) play(); });
    });
  }
  if (d.readyState === 'complete') initVideos(); else addEventListener('load', initVideos, { once: true });

  /* progress line: CSS scroll timeline where supported, a light fallback elsewhere */
  const bar = d.querySelector('.progress i');
  if (bar && !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'))) {
    let queued = false;
    const update = () => { queued = false; const max = root.scrollHeight - innerHeight; bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0); };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); update();
  }

  /* contact: compose an email. Nothing is sent by the site */
  const form = d.getElementById('contact-form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault(); if (!form.reportValidity()) return;
    const val = n => (form.elements[n] ? form.elements[n].value.trim() : '');
    const name = [val('First name'), val('Last name')].filter(Boolean).join(' ');
    const lines = [val('Message'), '', name, val('Email'), val('Phone')].filter((l, i) => i < 2 || l);
    location.href = 'mailto:Silverbacktarzan@gmail.com?subject=' + encodeURIComponent('Hello from ' + (name || 'the website')) + '&body=' + encodeURIComponent(lines.join('\n'));
    form.querySelector('.form__after').hidden = false;
  });

  /* product page: thumbnails swap the main photo */
  const main = d.querySelector('.pp__main img');
  const thumbs = [...d.querySelectorAll('.thumbs button')];
  thumbs.forEach(t => t.addEventListener('click', () => {
    main.src = t.dataset.src; main.srcset = t.dataset.srcset; main.alt = t.dataset.alt; main.width = +t.dataset.w; main.height = +t.dataset.h;
    main.classList.toggle('contain', t.dataset.fit === 'contain');
    thumbs.forEach(o => o.setAttribute('aria-pressed', String(o === t)));
  }));
})();
