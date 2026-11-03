/* Silverback Tarzan, option 6 "Thermal redesign". Altitude readout, menu, poster-first clips. Everything on the page works without this file. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var WIDE_CLIP = '(min-width: 700px), (min-aspect-ratio: 1/1)'; // keep in step with WIDE_CLIP in tools/build.js

  /* menu */
  var menu = doc.getElementById('menu'), lastFocus = null;
  function setInert(on) { doc.querySelectorAll('.skip, main, .bar, footer, .alt').forEach(function (el) { el.inert = on; }); }
  function focusables() { return Array.prototype.slice.call(menu.querySelectorAll('a[href], button')).filter(function (el) { return el.offsetParent !== null; }); }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  function expanded(v) { doc.querySelectorAll('[data-menu-open]').forEach(function (b) { b.setAttribute('aria-expanded', v); }); }
  function openMenu(t) { lastFocus = t; menu.hidden = false; root.classList.add('menu-open'); setInert(true); expanded('true'); menu.querySelector('.menu__close').focus(); doc.addEventListener('keydown', onKey); }
  function closeMenu(back) { menu.hidden = true; root.classList.remove('menu-open'); setInert(false); expanded('false'); doc.removeEventListener('keydown', onKey); if (back && lastFocus) lastFocus.focus(); }
  if (menu) {
    window.matchMedia('(min-width: 1040px)').addEventListener && window.matchMedia('(min-width: 1040px)').addEventListener('change', function (q) { if (q.matches && !menu.hidden) closeMenu(false); });
    doc.querySelectorAll('[data-menu-open]').forEach(function (b) { b.addEventListener('click', function () { openMenu(b); }); });
    menu.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { closeMenu(true); }); });
    menu.querySelectorAll('a[href]').forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
  }

  /* altitude: every section with data-alt is a waypoint, in the order of the page. The readout, the tape on the right edge and the
     climb rate all come from where the top of the screen is between two waypoints. No waypoints means one fixed altitude (inner pages). */
  var readV = doc.querySelector('[data-alt-v]'), readPh = doc.querySelector('[data-phase-v]'), readVs = doc.querySelector('[data-vario]'), mark = doc.querySelector('.alt__mark');
  var pts = [], fixed = doc.querySelector('main[data-alt]'), CEIL = 3000, lastAlt = null, lastT = 0, vs = 0, shown = '', shownPh = '', shownVs = '', raf = 0, idle = 0;
  function measure() {
    var y0 = window.pageYOffset, bar = (doc.querySelector('.bar') || { offsetHeight: 56 }).offsetHeight;
    pts = Array.prototype.map.call(doc.querySelectorAll('section[data-alt]'), function (s) { return { y: Math.max(0, s.getBoundingClientRect().top + y0 - bar), a: +s.getAttribute('data-alt'), ph: s.getAttribute('data-phase') || '' }; });
    if (pts.length) pts[0].y = 0;
  }
  function altAt(y) {
    if (!pts.length) return { a: fixed ? +fixed.getAttribute('data-alt') : 0, ph: fixed ? fixed.getAttribute('data-phase') : '' };
    var i = 0; while (i < pts.length - 1 && pts[i + 1].y <= y) i++;
    var p = pts[i], q = pts[i + 1];
    if (!q) return { a: p.a, ph: p.ph };
    var t = (y - p.y) / Math.max(1, q.y - p.y);
    return { a: p.a + (q.a - p.a) * Math.min(1, Math.max(0, t)), ph: t > .5 ? q.ph : p.ph };
  }
  function paint(force) {
    var now = performance.now(), r = altAt(window.pageYOffset), a = Math.round(r.a / 5) * 5;
    if (lastAlt !== null && now > lastT) { var inst = (r.a - lastAlt) / ((now - lastT) / 1000) / 40; vs += (Math.max(-5, Math.min(5, inst)) - vs) * .25; }
    lastAlt = r.a; lastT = now;
    var txt = a.toLocaleString('en-GB'); if (readV && txt !== shown) { shown = txt; readV.textContent = txt; }
    if (readPh && r.ph !== shownPh) { shownPh = r.ph; readPh.textContent = r.ph; }
    var v = Math.abs(vs) < .05 ? 0 : vs, vt = (v > 0 ? '↑ +' : v < 0 ? '↓ −' : '→ ') + Math.abs(v).toFixed(1);
    if (readVs && vt !== shownVs) { shownVs = vt; readVs.textContent = vt; readVs.setAttribute('data-dir', v > 0 ? 'up' : v < 0 ? 'down' : 'flat'); }
    if (mark) mark.style.setProperty('--a', Math.min(100, r.a / CEIL * 100).toFixed(2));
  }
  function decay() { paint(); if (Math.abs(vs) > .05) idle = setTimeout(decay, 90); }
  function tick() { raf = 0; paint(); clearTimeout(idle); idle = setTimeout(decay, 120); }
  if (readV || mark) {
    measure(); paint();
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    window.addEventListener('resize', function () { measure(); paint(); });
    window.addEventListener('load', function () { measure(); paint(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { measure(); paint(); });
  }

  /* clips: the poster shows first; a clip fades in only on its first painted frame */
  var PLAY = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M5 3.5v13l11-6.5z"/></svg><span>Play</span>';
  var PAUSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M4.5 3h4v14h-4zM11.5 3h4v14h-4z"/></svg><span>Pause</span>';
  function wide(v) { return window.matchMedia(v.getAttribute('data-wide') || WIDE_CLIP).matches; } // phone footage keeps its portrait cut on portrait tablets
  function pick(v) {
    if (!wide(v)) return v.getAttribute('data-src');
    var lg = v.getAttribute('data-src-lg');
    return lg && (window.innerWidth > 1440 || window.innerHeight > 1000) ? lg : v.getAttribute('data-src-wide');
  }
  function Clip(v) {
    this.v = v; this.btn = v.closest('.scene').querySelector('.vid-btn'); this.label = v.getAttribute('data-label');
    this.paused = false; this.seen = false; this.failed = false; this.src = null;
    v.muted = true; v.defaultMuted = true; v.playsInline = true;
    var s = this;
    v.addEventListener('pause', function () { if (!v.seeking) s.mark('play'); });
    v.addEventListener('playing', function () { s.mark('pause'); });
    if (this.btn) this.btn.addEventListener('click', function () { s.toggle(); });
    this.mark(reduce.matches ? 'play' : 'pause');
    if (reduce.matches && this.btn) this.btn.classList.add('ready');
  }
  Clip.prototype.mark = function (st) { if (!this.btn) return; this.btn.innerHTML = st === 'play' ? PLAY : PAUSE; this.btn.setAttribute('aria-label', (st === 'play' ? 'Play ' : 'Pause ') + this.label); };
  Clip.prototype.load = function () { var s = pick(this.v); if (!s || s === this.src) return; this.src = s; this.v.classList.remove('on'); this.v.src = s; this.v.load(); };
  Clip.prototype.play = function () {
    var s = this, v = this.v, done = false;
    this.failed = false; this.load();
    function show() { if (!done && !s.failed) { done = true; v.classList.add('on'); } }
    if ('requestVideoFrameCallback' in v) v.requestVideoFrameCallback(show);
    var t = function () { if (v.currentTime > 0) { v.removeEventListener('timeupdate', t); show(); } };
    v.addEventListener('timeupdate', t);
    var p = v.play();
    if (p && p.then) p.then(function () { s.mark('pause'); if (s.btn) s.btn.classList.add('ready'); }).catch(function (err) {
      if (err && err.name === 'AbortError') return; // a newer load replaced this play, for example the phone was rotated
      s.failed = true; v.classList.remove('on'); s.mark('play'); if (s.btn) s.btn.classList.add('ready'); // the poster stays and our own button offers play
    });
  };
  Clip.prototype.toggle = function () { if (this.v.paused) { this.paused = false; this.play(); } else { this.paused = true; this.v.pause(); this.mark('play'); } };
  function start() {
    var clips = Array.prototype.map.call(doc.querySelectorAll('video.loop'), function (v) { return new Clip(v); });
    if (!clips.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var c = clips.filter(function (x) { return x.v === en.target; })[0];
        c.seen = en.isIntersecting;
        if (en.isIntersecting) { if (!reduce.matches && !c.paused) c.play(); } else if (!c.v.paused) c.v.pause();
      });
    }, { threshold: .15 });
    clips.forEach(function (c) { io.observe(c.v); });
    var swap = function () { clips.forEach(function (c) { if (c.src && c.src !== pick(c.v)) { c.src = null; if (c.seen && !c.paused && !reduce.matches) c.play(); else c.load(); } }); };
    [WIDE_CLIP, '(min-aspect-ratio: 1/1)'].forEach(function (q) { var mq = window.matchMedia(q); if (mq.addEventListener) mq.addEventListener('change', swap); });
  }
  function later() { requestAnimationFrame(function () { setTimeout(start, 60); }); }
  if (doc.readyState === 'complete') later(); else window.addEventListener('load', later);

  /* contact: compose an email, no fake submit */
  var form = doc.querySelector('form.form');
  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var g = function (n) { return form.elements[n] ? form.elements[n].value.trim() : ''; };
    var name = [g('first'), g('last')].filter(Boolean).join(' ');
    var lines = [g('message'), '', name, g('email'), g('phone')].filter(function (x, i) { return i < 2 || x; });
    var href = 'mailto:' + form.getAttribute('data-to') + '?subject=' + encodeURIComponent('Hello from ' + (name || 'the website')) + '&body=' + encodeURIComponent(lines.join('\n'));
    form.setAttribute('data-href', href);
    form.querySelector('.form__after').hidden = false;
    window.location.href = href;
  });
})();
