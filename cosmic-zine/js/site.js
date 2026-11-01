/* Small on purpose: Instagram and TikTok run their own scripts too. Pages read and link fine without any of this. */
(function () {
  'use strict';
  var root = document.documentElement; root.classList.add('js');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* menu: focus trapped, Escape closes, focus goes back, the page behind goes inert and is put back exactly as it was */
  var menu = document.getElementById('menu'), opener = null, saved = [];
  function focusables() { return [].slice.call(menu.querySelectorAll('a[href],button')).filter(function (e) { return e.offsetParent !== null; }); }
  function inert(on) {
    if (on) saved = [].filter.call(document.body.children, function (e) { return e !== menu && e.tagName !== 'SCRIPT'; }).map(function (e) {
      var r = { e: e, inert: e.hasAttribute('inert'), hidden: e.getAttribute('aria-hidden') }; e.setAttribute('inert', ''); e.setAttribute('aria-hidden', 'true'); return r; });
    else { saved.forEach(function (r) { if (!r.inert) r.e.removeAttribute('inert'); if (r.hidden === null) r.e.removeAttribute('aria-hidden'); else r.e.setAttribute('aria-hidden', r.hidden); }); saved = []; }
  }
  function open(from) { if (!menu.hidden) return; opener = from; menu.hidden = false; inert(true); root.classList.add('menu-open'); var f = focusables(); if (f.length) f[0].focus(); }
  function close(back) { if (menu.hidden) return; menu.hidden = true; inert(false); root.classList.remove('menu-open'); if (back !== false && opener) opener.focus(); }
  if (menu) {
    document.querySelectorAll('[data-menu-open]').forEach(function (b) {
      b.setAttribute('aria-controls', 'menu'); b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('role', 'button');
      b.addEventListener('click', function (e) { e.preventDefault(); open(b); });
      b.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); open(b); } });
    });
    menu.querySelector('[data-menu-close]').addEventListener('click', function () { close(); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { close(false); }); });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(), a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
  }

  /* dock: three doors once the cover doors have gone; never two sets at once */
  var dock = document.querySelector('.dock'), mark = document.querySelector('[data-dock-after]') || document.querySelector('.hero');
  if (dock) {
    var was = null, tick = false;
    var sync = function () { tick = false; var on = mark ? mark.getBoundingClientRect().bottom < 0 : true; if (on === was) return; was = on; dock.classList.toggle('is-on', on);
      if (on) { dock.removeAttribute('inert'); dock.removeAttribute('aria-hidden'); } else { dock.setAttribute('inert', ''); dock.setAttribute('aria-hidden', 'true'); } };
    var ask = function () { if (!tick) { tick = true; requestAnimationFrame(sync); } };
    window.addEventListener('scroll', ask, { passive: true }); window.addEventListener('resize', ask); sync();
  }

  /* clips: invisible until really playing, so no system play button ever shows; the poster carries the scene without them */
  var ctl = document.querySelector('[data-pause]'), paused = false;
  function clip(v) {
    var src = window.matchMedia(v.dataset.bp || '(min-width:1000px)').matches ? v.dataset.wide : v.dataset.tall;
    if (v.dataset.on !== src) { v.dataset.on = src; v.src = src; v.load(); }
    var p = v.play(); if (p && p.then) p.then(function () {
      v.dataset.played = '1';
      var show = function () { v.classList.add('is-live'); if (ctl) ctl.hidden = false; };   /* the control appears with the first real frame, never over a refused clip */
      if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(show); else v.addEventListener('timeupdate', show, { once: true });
    }).catch(function (e) { if (e && e.name === 'AbortError') return; /* paused or scrolled away while loading: not a refusal */
      v.classList.remove('is-live'); if (ctl && !v.dataset.played) ctl.hidden = true; });
  }
  var vids = document.querySelectorAll('video[data-tall]');
  if (vids.length && 'IntersectionObserver' in window) {
    if (calm.matches) { /* poster only, no clip, no control */ } else {
      var go = function () { var io = new IntersectionObserver(function (es) { es.forEach(function (en) { var v = en.target;
        v.dataset.seen = en.isIntersecting ? '1' : ''; if (en.isIntersecting && !paused) clip(v); else if (!en.isIntersecting) v.pause(); }); }, { threshold: .25 });
        vids.forEach(function (v) { io.observe(v); }); };
      if (document.readyState === 'complete') setTimeout(go, 300); else window.addEventListener('load', function () { setTimeout(go, 300); });
    }
    if (ctl) ctl.addEventListener('click', function () { paused = !paused;
      ctl.textContent = paused ? 'Play' : 'Pause'; ctl.setAttribute('aria-label', paused ? 'Play the clip' : 'Pause the clip');
      vids.forEach(function (v) { if (paused) { v.pause(); } else if (v.dataset.seen) clip(v); }); });
  }

  /* the one signature moment: the gorilla flies through the scene once and out the far side, the first time you reach it */
  var gorilla = document.querySelector('[data-glide]');
  if (gorilla && !calm.matches && 'IntersectionObserver' in window) {
    root.classList.add('can-glide');
    var once = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { gorilla.classList.add('is-gliding'); once.disconnect(); } }, { threshold: .55 });
    once.observe(gorilla.parentElement);
  }

  /* contact: composes a message in the visitor's own email app, nothing is sent from the page */
  document.querySelectorAll('form[data-mailto]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); if (f.reportValidity && !f.reportValidity()) return;
      var v = function (n) { var x = f.elements[n]; return x ? x.value.trim() : ''; }, name = (v('first') + ' ' + v('last')).trim(), after = f.querySelector('[data-after]');
      window.location.href = 'mailto:' + f.dataset.mailto + '?subject=' + encodeURIComponent('Hello from ' + (name || 'the website')) + '&body=' + encodeURIComponent(v('message') + '\n\n' + name + '\n' + v('email') + (v('phone') ? '\n' + v('phone') : ''));
      if (after) after.hidden = false; });
  });
})();
