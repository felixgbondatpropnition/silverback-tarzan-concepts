/* Silverback Tarzan, option 5: Upside Down. Everything works without this file. It adds the menu dialog,
   the dock, the flip (the one signature moment), rail buttons and the training clip. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else mq.addListener(fn); };

  /* ---------- menu: dialog with a focus trap, Escape closes ---------- */
  const menu = $('#menu');
  const opener = $('[data-menu-open]');
  if (menu && opener) {
    const outside = $$('body > :not(#menu):not(svg)');
    let lastFocus = null;
    const focusables = () => $$('a[href], button:not([disabled])', menu);
    const open = () => {
      lastFocus = document.activeElement;
      menu.hidden = false;
      menu.classList.add('is-open');
      document.documentElement.classList.add('menu-open');
      opener.setAttribute('aria-expanded', 'true');
      outside.forEach(el => { el.inert = true; });
      $('[data-menu-close]', menu).focus();
    };
    const close = (restore = true) => {
      menu.classList.remove('is-open');
      menu.hidden = true;
      document.documentElement.classList.remove('menu-open');
      opener.setAttribute('aria-expanded', 'false');
      outside.forEach(el => { el.inert = false; });
      if (restore && lastFocus) lastFocus.focus();
    };
    opener.setAttribute('role', 'button');
    opener.setAttribute('aria-expanded', 'false');
    opener.addEventListener('click', e => { e.preventDefault(); open(); });
    opener.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); open(); } });
    $('[data-menu-close]', menu).addEventListener('click', () => close());
    menu.addEventListener('click', e => { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', e => {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    onChange(window.matchMedia('(min-width: 1000px)'), m => { if (m.matches && !menu.hidden) close(false); });
  }

  /* ---------- dock: never on screen at the same time as the hero doors ---------- */
  const dock = $('.dock');
  const doors = $('.doors');
  if (dock && dock.dataset.dock === 'after-hero' && doors && 'IntersectionObserver' in window) {
    dock.dataset.off = '';
    new IntersectionObserver(([e]) => { if (e.isIntersecting) dock.dataset.off = ''; else delete dock.dataset.off; }).observe(doors);
  }

  /* ---------- flip it: a hard cut to him the right way up on the same steps. The name never moves ---------- */
  const flip = $('.flip');
  const hero = $('.hero');
  if (flip && hero && !reduce.matches) {
    const live = $('.flip-live');
    let ready = null;
    const prep = () => {
      if (ready) return ready;
      const b = new Image();
      b.className = 'hero__b';
      b.alt = flip.dataset.alt;
      b.sizes = '(min-width: 560px) and (min-aspect-ratio: 1/1) 40vw, 100vw';
      b.srcset = window.matchMedia('(max-width: 699px)').matches ? flip.dataset.m : flip.dataset.w;
      flip.before(b);
      ready = b.decode ? b.decode().catch(() => {}) : Promise.resolve();
      return ready;
    };
    flip.hidden = false;
    flip.addEventListener('pointerenter', prep, { once: true });
    flip.addEventListener('focus', prep, { once: true });
    flip.addEventListener('click', () => prep().then(() => {
      const on = hero.classList.toggle('is-flipped');
      flip.textContent = on ? 'Flip back' : 'Flip it';
      if (live) live.textContent = on ? 'Matt the right way up, winking. Not his natural position.' : 'Matt back in his handstand.';
    }));
  }

  /* ---------- rails: previous and next buttons, instant jumps ---------- */
  $$('[data-rail]').forEach(rail => {
    const track = $('.rail__track', rail), prev = $('[data-rail-prev]', rail), next = $('[data-rail-next]', rail);
    const step = () => { const i = track.children[0], gap = parseFloat(getComputedStyle(track).columnGap) || 0; return i ? i.getBoundingClientRect().width + gap : track.clientWidth * 0.8; };
    const update = () => {
      const focused = document.activeElement;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      if (focused === next && next.disabled) prev.focus();
      if (focused === prev && prev.disabled) next.focus();
    };
    prev.addEventListener('click', () => { track.scrollBy({ left: -step() }); });
    next.addEventListener('click', () => { track.scrollBy({ left: step() }); });
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  });

  /* ---------- training clip: poster first, source only once in view, faded in on its first real frame, always pausable ---------- */
  $$('.scene video').forEach(video => {
    const scene = video.closest('.scene__photo'), btn = $('.loop__ctl', scene), label = $('span', btn), icon = $('use', btn);
    let userPaused = false;
    const show = playing => { label.textContent = playing ? 'Pause' : 'Play'; icon.setAttribute('href', playing ? '#i-pause' : '#i-play'); };
    const attach = () => {
      if (video.getAttribute('src')) return;
      video.src = window.matchMedia('(max-width: 699px)').matches ? video.dataset.m : video.dataset.w;
      video.load();
      const live = () => video.classList.add('is-live');
      /* only once it really plays: a browser that refuses autoplay can still paint a first frame, and that must not replace the chosen still */
      if ('requestVideoFrameCallback' in video) video.addEventListener('playing', () => video.requestVideoFrameCallback(live), { once: true });
      else video.addEventListener('timeupdate', function t() { if (video.currentTime > 0) { live(); video.removeEventListener('timeupdate', t); } });
    };
    const play = () => { attach(); const p = video.play(); if (p) p.then(() => show(true)).catch(() => show(false)); };
    btn.addEventListener('click', () => { if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); show(false); } });
    show(false);
    if (reduce.matches || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !userPaused) play();
      else if (!e.isIntersecting && !video.paused) { video.pause(); show(false); }
    }, { threshold: 0.35 }).observe(scene);
  });
  /* ---------- contact form: composes an email in the visitor's own app, nothing is sent from the page ---------- */
  $$('[data-mailto-form]').forEach(form => {
    const after = $('.form__after', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form), who = [d.get('First name'), d.get('Last name')].filter(Boolean).join(' ');
      const body = [d.get('Message'), '', who, d.get('Email'), d.get('Phone')].filter(x => x !== null).join('\n').trim();
      const url = form.getAttribute('action') + '?subject=' + encodeURIComponent('Website message' + (who ? ' from ' + who : '')) + '&body=' + encodeURIComponent(body);
      form.dataset.composed = url;
      if (after) after.hidden = false;
      window.location.href = url;
    });
  });
})();
