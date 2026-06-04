/* ==========================================================================
   A.M. Target — лендінг /military/  ·  власний JS (без залежностей)
   Прогресивне покращення: без JS сторінка повністю робоча (контент видимий,
   FAQ на <details>, таби показують усі товари). JS додає:
   поява при скролі · лічильники · фільтр каталогу · parallax мішені.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('.landing');
  if (!root) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- 1. Поява при скролі + стагер у межах спільного батька ---- */
  var revealItems = Array.prototype.slice.call(root.querySelectorAll('[data-reveal]'));

  // стагер: індекс серед сусідів, що теж мають [data-reveal]
  revealItems.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) {
      return c.hasAttribute && c.hasAttribute('data-reveal');
    });
    var idx = sibs.indexOf(el);
    el.style.setProperty('--d', Math.min(idx, 8) * 70);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealItems.forEach(function (el) { io.observe(el); });
  }

  /* ---- 2. Анімовані лічильники ---- */
  var counters = Array.prototype.slice.call(root.querySelectorAll('[data-count]'));
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var dur = 1300, start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (counters.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      // лишаємо фінальні значення з розмітки
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---- 3. Фільтр каталогу за категорією ---- */
  var tabs = Array.prototype.slice.call(root.querySelectorAll('.landing__tab'));
  var products = Array.prototype.slice.call(root.querySelectorAll('.landing__product'));
  var countOut = root.querySelector('[data-catalog-count]');

  function applyFilter(cat) {
    var shown = 0;
    products.forEach(function (p) {
      var match = p.getAttribute('data-cat') === cat;
      p.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    if (countOut) countOut.textContent = 'Показано: ' + shown;
  }

  if (tabs.length && products.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('active', on);
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        applyFilter(tab.getAttribute('data-cat'));
      });
    });
    var initial = tabs.filter(function (t) { return t.classList.contains('active'); })[0] || tabs[0];
    applyFilter(initial.getAttribute('data-cat'));
  }

  /* ---- 4. Parallax «живої мішені» в геро (лише точний вказівник) ---- */
  var media = root.querySelector('.landing__hero-media');
  var target = root.querySelector('.landing__hero-target');
  if (media && target && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    var raf = null;
    media.addEventListener('pointermove', function (ev) {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = null;
        var r = media.getBoundingClientRect();
        var dx = (ev.clientX - r.left) / r.width - 0.5;
        var dy = (ev.clientY - r.top) / r.height - 0.5;
        target.style.transform = 'translate(' + (dx * 18).toFixed(1) + 'px,' + (dy * 18).toFixed(1) + 'px)';
      });
    });
    media.addEventListener('pointerleave', function () {
      target.style.transform = '';
    });
  }

  /* ---- 5. Попап відео (інлайн-прев'ю muted → попап зі звуком) ---- */
  var vOpen = root.querySelector('[data-video-open]');
  var popup = document.getElementById('video-popup');
  var inlineVid = root.querySelector('.landing__gallery-video-media');
  var modalVid = popup ? popup.querySelector('.landing__video-player') : null;

  // під prefers-reduced-motion не автопрогравати інлайн-прев'ю
  if (reduceMotion && inlineVid) {
    inlineVid.removeAttribute('autoplay');
    try { inlineVid.pause(); } catch (e) {}
  }

  if (vOpen && popup && modalVid) {
    var lastFocus = null;
    var openVideo = function () {
      lastFocus = document.activeElement;
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
      try { modalVid.currentTime = 0; } catch (e) {}
      var p = modalVid.play(); if (p && p.catch) p.catch(function () {});
      if (inlineVid) { try { inlineVid.pause(); } catch (e) {} }
      var cb = popup.querySelector('.close_btn'); if (cb) cb.focus();
    };
    var closeVideo = function () {
      popup.classList.remove('active');
      document.body.style.overflow = '';
      try { modalVid.pause(); } catch (e) {}
      if (inlineVid && !reduceMotion) { var ip = inlineVid.play(); if (ip && ip.catch) ip.catch(function () {}); }
      if (lastFocus) { try { lastFocus.focus(); } catch (e) {} }
    };
    vOpen.addEventListener('click', openVideo);
    Array.prototype.forEach.call(popup.querySelectorAll('[data-video-close]'), function (el) {
      el.addEventListener('click', closeVideo);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && popup.classList.contains('active')) closeVideo();
    });
  }
})();
