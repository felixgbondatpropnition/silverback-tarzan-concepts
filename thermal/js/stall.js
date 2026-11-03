/* Silverback Tarzan, option 8 "The Stall". Menu board, tags that swing when they arrive, poster-first clips, mailto form.
   Everything on the page works without this file: every product, price and Buy button is plain HTML, and the bar and footer link to every page. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var WIDE_CLIP = '(min-width: 700px), (min-aspect-ratio: 1/1)'; // keep in step with WIDE_CLIP in tools/build.js

  /* menu: a menu board */
  var menu = doc.getElementById('menu'), lastFocus = null, warmed = false;
  function setInert(on) { doc.querySelectorAll('.skip, main, .bar, footer').forEach(function (el) { el.inert = on; }); }
  function focusables() { return Array.prototype.slice.call(menu.querySelectorAll('a[href], button')).filter(function (el) { return el.offsetParent !== null; }); }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab') return;
    var f = focusables(); if (!f.length) return;
    if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  function expanded(v) { doc.querySelectorAll('[data-menu-open]').forEach(function (b) { b.setAttribute('aria-expanded', v); }); }
  function warm() { if (warmed || !menu) return; warmed = true; menu.querySelectorAll('img[loading="lazy"]').forEach(function (i) { i.loading = 'eager'; }); }
  function openMenu(t) { warm(); lastFocus = t; menu.hidden = false; root.classList.add('menu-open'); setInert(true); expanded('true'); menu.querySelector('.menu__close').focus(); doc.addEventListener('keydown', onKey); }
  function closeMenu(back) { menu.hidden = true; root.classList.remove('menu-open'); setInert(false); expanded('false'); doc.removeEventListener('keydown', onKey); if (back && lastFocus) lastFocus.focus(); }
  if (menu) {
    doc.querySelectorAll('[data-menu-open]').forEach(function (b) {
      b.addEventListener('click', function () { openMenu(b); });
      ['pointerenter', 'touchstart', 'focus'].forEach(function (ev) { b.addEventListener(ev, warm, { once: true, passive: true }); });
    });
    menu.querySelectorAll('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { closeMenu(true); }); });
    menu.querySelectorAll('a[href]').forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
  }

  /* tags: on a phone there is no hover, so each tag gives one small swing the first time it arrives on screen */
  if (!reduce.matches && 'IntersectionObserver' in window && !window.matchMedia('(hover: hover)').matches) {
    var sio = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('swung'); sio.unobserve(en.target); } }); }, { threshold: .3 });
    doc.querySelectorAll('.tag').forEach(function (t) { sio.observe(t); });
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
    this.v = v; this.btn = v.closest('.ph').querySelector('.vid-btn'); this.label = v.getAttribute('data-label');
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
