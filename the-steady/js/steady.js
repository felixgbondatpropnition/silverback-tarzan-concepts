/* The Steady: small enhancements. The pages read and work without this file. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var each = function (sel, fn) { Array.prototype.forEach.call(doc.querySelectorAll(sel), fn); };
  var hasIO = 'IntersectionObserver' in window;

  /* Header turns solid once the cover has gone; the dock arrives once the doors have gone */
  function bars() {
    var head = doc.getElementById('head'), dock = doc.getElementById('dock'), cover = doc.querySelector('.cover'), doors = doc.querySelector('.doors');
    if (!cover || !doors) return;
    if (!hasIO) { if (dock) dock.classList.add('is-on'); return; }
    new IntersectionObserver(function (e) {
      if (dock) dock.classList.toggle('is-on', !e[0].isIntersecting);
    }).observe(doors);
    // the header scrolls away with the masthead and comes back as a solid bar, so the cover's words never pass under a see-through one
    new IntersectionObserver(function (e) {
      if (head) head.classList.toggle('is-solid', !e[0].isIntersecting);
    }).observe(doc.getElementById('mast'));
  }

  /* Menu: a real dialog with JS, a :target panel without it */
  function menu() {
    var panel = doc.getElementById('menu');
    var openers = doc.querySelectorAll('.menu-btn, .dock-menu');
    if (!panel || !openers.length) return;
    var close = panel.querySelector('.menu-close');
    var outside = [doc.getElementById('main'), doc.querySelector('.foot'), doc.getElementById('head'), doc.getElementById('dock')];
    var last = null;
    var items = function () { return Array.prototype.filter.call(panel.querySelectorAll('a[href], button'), function (el) { return el.offsetParent !== null; }); };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); shut(); return; }
      if (e.key !== 'Tab') return;
      var f = items(); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && (doc.activeElement === a || doc.activeElement === panel)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    var pointer = false;
    doc.addEventListener('pointerdown', function () { pointer = true; }, true);
    doc.addEventListener('keydown', function () { pointer = false; }, true);
    function open(from) {
      last = from;
      panel.classList.add('is-open'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      Array.prototype.forEach.call(openers, function (b) { b.setAttribute('aria-expanded', 'true'); });
      root.style.overflow = 'hidden';
      outside.forEach(function (el) { if (el) el.setAttribute('inert', ''); });
      panel.setAttribute('tabindex', '-1'); panel.focus();
      doc.addEventListener('keydown', onKey);
    }
    function shut(keep) {
      panel.classList.remove('is-open'); panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      Array.prototype.forEach.call(openers, function (b) { b.setAttribute('aria-expanded', 'false'); });
      root.style.overflow = '';
      outside.forEach(function (el) { if (el) el.removeAttribute('inert'); });
      doc.removeEventListener('keydown', onKey);
      if (keep !== false && last && last.focus) {
        var back = last;
        if (pointer) { back.classList.add('no-ring'); back.addEventListener('blur', function () { back.classList.remove('no-ring'); }, { once: true }); }
        back.focus();
      }
    }
    Array.prototype.forEach.call(openers, function (b) {
      b.setAttribute('role', 'button');
      b.addEventListener('click', function (e) { e.preventDefault(); open(b); });
      b.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); open(b); } });
    });
    if (close) {
      close.setAttribute('role', 'button');
      close.addEventListener('click', function (e) { e.preventDefault(); shut(); });
      close.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); shut(); } });
    }
    panel.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a && a !== close) shut(false); });
    // Menu tapped before this script arrived: keep it open, as a real dialog
    if (location.hash === '#menu') { history.replaceState(null, '', location.pathname + location.search); open(openers[0]); }
  }

  /* The highlighter: each page's headline gets marked as the page arrives */
  function highlighter() {
    if (reduce.matches || !hasIO) { each('[data-pg]', function (p) { p.classList.add('in'); }); return; }
    // watch the headline, not the page: a tall page can never show 35 per cent of itself on a phone
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.closest('[data-pg]').classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .5 });
    each('[data-pg]', function (p) { var h = p.querySelector('.hl, .big'); if (h) io.observe(h); else p.classList.add('in'); });
  }

  /* Clips: poster first, video only after load and in view, never on its own under reduced motion */
  function clips() {
    each('[data-clip]', function (box) {
      var v = box.querySelector('video'), ctl = box.querySelector('.clip-ctl');
      if (!v || !ctl) return;
      var what = ctl.getAttribute('aria-label').replace(/^Play /, ''), loaded = false, stopped = false;
      var say = function () { var on = !v.paused; ctl.textContent = on ? 'Pause' : 'Play'; ctl.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + what); };
      function load() {
        if (loaded) return; loaded = true;
        var s = doc.createElement('source'); s.src = v.getAttribute('data-src'); s.type = 'video/mp4'; v.appendChild(s); v.load();
        // a decoded first frame is not proof it plays: where autoplay is refused (Low Power Mode) the poster stays and the video stays hidden,
        // so the system's own play button never appears over it
        var wait = function () {
          if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(function () { if (v.paused) wait(); else v.classList.add('is-on'); });
          else v.addEventListener('timeupdate', function t() { if (v.currentTime > 0 && !v.paused) { v.classList.add('is-on'); v.removeEventListener('timeupdate', t); } });
        };
        wait();
      }
      function play() { load(); var p = v.play(); if (p && p.catch) p.catch(function () { say(); }); }
      ctl.addEventListener('click', function () { if (v.paused) { stopped = false; play(); } else { stopped = true; v.pause(); } });
      v.addEventListener('playing', say); v.addEventListener('pause', say);
      if (reduce.matches || !hasIO) return;
      var start = function () {
        new IntersectionObserver(function (e) {
          if (e[0].isIntersecting) { if (!stopped) play(); } else if (!v.paused) v.pause();
        }, { threshold: .3 }).observe(box);
      };
      if (doc.readyState === 'complete') start(); else window.addEventListener('load', start);
    });
  }

  /* Progress line for browsers without scroll-driven animation */
  function spine() {
    var bar = doc.querySelector('.spine i');
    // reduced motion switches the CSS animation off, and the line is a position marker, so it still has to show where you are
    if (!bar || (!reduce.matches && window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'))) return;
    var on = false, draw = function () { on = false; var m = root.scrollHeight - root.clientHeight; bar.style.setProperty('--p', m > 0 ? (window.scrollY / m).toFixed(4) : 0); };
    window.addEventListener('scroll', function () { if (!on) { on = true; requestAnimationFrame(draw); } }, { passive: true });
    draw();
  }

  /* Contact form: writes the email in the visitor's own app. Nothing is sent from here. */
  function form() {
    var f = doc.getElementById('contact-form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      if (!f.checkValidity()) return;
      e.preventDefault();
      var v = function (id) { return doc.getElementById(id).value.trim(); };
      var name = (v('f-first') + ' ' + v('f-last')).trim();
      var lines = [v('f-msg'), '', name, v('f-email')];
      if (v('f-phone')) lines.push(v('f-phone'));
      window.location.href = f.getAttribute('action') + '?subject=' + encodeURIComponent('Hello from ' + name) + '&body=' + encodeURIComponent(lines.join('\r\n'));
      var after = f.querySelector('.form-after');
      if (after) after.hidden = false;
    });
  }

  bars(); menu(); highlighter(); clips(); spine(); form();
})();
