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

  /* ---- 0. Меню поверх фото: прозоре на самому верху, суцільне на скролі ----
   * Фото-банер тягнеться під фіксоване меню. Поки сторінка вгорі (scrollY≈0)
   * додаємо .at-top → плашка-меню прозора (видно фото). Щойно скрол пішов —
   * повертаємо суцільну плашку теми (читабельність над контентом). */
  var header = document.querySelector('.header');
  if (header) {
    var syncHeaderTop = function () {
      header.classList.toggle('at-top', window.pageYOffset < 30);
    };
    syncHeaderTop();
    window.addEventListener('scroll', syncHeaderTop, { passive: true });
    window.addEventListener('resize', syncHeaderTop, { passive: true });
  }

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

  /* ---- 1b. Лінива підгрузка декоративних відео (не вантажиться на старті) ---- *
   * preload="none" + data-src: байти відео тягнуться й автоплей стартує лише
   * коли елемент входить у в'юпорт → нульовий вплив на початкове завантаження.
   * Охоплює: відео-мішені галереї, інлайн-прев'ю «з полігону» та фонове відео
   * блоку «Про компанію» (amtarget.mp4 ~2.6 МБ — найважче, тепер поза стартом). */
  var galVids = Array.prototype.slice.call(
    root.querySelectorAll('.landing__gallery-vid, .landing__gallery-video-media, .landing__about-video')
  );
  function loadGalVid(v) {
    if (v.dataset.loaded) return;
    var src = v.getAttribute('data-src');
    if (!src) return;
    v.dataset.loaded = '1';
    v.src = src;
    if (reduceMotion) return; // без руху: лишаємо перший кадр (preload спрацює, але не граємо)
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  }
  if (galVids.length) {
    if (!('IntersectionObserver' in window)) {
      galVids.forEach(loadGalVid);
    } else {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            loadGalVid(v);
            if (!reduceMotion && v.dataset.loaded) { var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); }
          } else if (v.dataset.loaded && !v.paused) {
            try { v.pause(); } catch (err) {} // економимо ресурси поза екраном
          }
        });
      }, { rootMargin: '200px 0px', threshold: 0.1 });
      galVids.forEach(function (v) { vio.observe(v); });
    }
  }

  /* ---- 2. Анімовані лічильники ---- */
  var counters = Array.prototype.slice.call(root.querySelectorAll('[data-count]'));
  function groupThousands(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    var group = el.hasAttribute('data-group'); // розряди через нерозривний пробіл (10 000+)
    var dur = 1300, start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      var val = Math.round(eased * target);
      el.textContent = (group ? groupThousands(val) : val) + suffix;
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

  function applyFilter(cat) {
    products.forEach(function (p) {
      p.classList.toggle('is-hidden', p.getAttribute('data-cat') !== cat);
    });
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

  /* ---- 3b. Слайдер каталогу (моб./планшет): стрілки гортають стрічку ---- */
  var catGrid = root.querySelector('.landing__catalog-grid');
  var catNav = root.querySelector('[data-catalog-nav]');

  /* CTA-картку «60+ позицій» тримаємо в ряду товарів на десктопі, а на моб./планшеті
     виносимо поза слайдер (тримач .landing__catalog-foot) — щоб була завжди видима. */
  var ctaCard = root.querySelector('.landing__cta-card');
  var catFoot = root.querySelector('[data-catalog-foot]');
  if (ctaCard && catFoot && catGrid) {
    var catMq = window.matchMedia('(max-width: 1023px)');
    var placeCta = function () {
      var target = catMq.matches ? catFoot : catGrid;
      if (ctaCard.parentElement !== target) target.appendChild(ctaCard);
    };
    placeCta();
    catMq.addEventListener('change', placeCta);
  }

  if (catGrid && catNav) {
    var prevBtn = catNav.querySelector('[data-dir="prev"]');
    var nextBtn = catNav.querySelector('[data-dir="next"]');

    function catStep() {
      var card = catGrid.querySelector('li:not(.is-hidden)');
      if (!card) return catGrid.clientWidth;
      var gap = parseFloat(getComputedStyle(catGrid).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    function catSync() {
      var max = catGrid.scrollWidth - catGrid.clientWidth - 1;
      if (prevBtn) prevBtn.disabled = catGrid.scrollLeft <= 1;
      if (nextBtn) nextBtn.disabled = catGrid.scrollLeft >= max;
    }
    if (prevBtn) prevBtn.addEventListener('click', function () {
      catGrid.scrollBy({ left: -catStep(), behavior: 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      catGrid.scrollBy({ left: catStep(), behavior: 'smooth' });
    });
    catGrid.addEventListener('scroll', catSync, { passive: true });
    window.addEventListener('resize', catSync);
    // при зміні категорії стрічка вертається на старт
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        catGrid.scrollTo({ left: 0, behavior: 'smooth' });
        catSync();
      });
    });
    catSync();
  }

  /* ---- 4. Попап відео (інлайн-прев'ю muted → попап зі звуком) ---- */
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

/* ==========================================================================
   ПІКСЕЛЬНИЙ СЛІД (pixel trail) — нативний Canvas, без p5.js
   Порт ефекту з kratos.army: під курсором «загораються» клітинки сітки
   (плюс випадкові сусіди), потім плавно згасають. Працює на будь-якому
   елементі з [data-grid]. Поважає prefers-reduced-motion. Без залежностей.
   Параметри: --grid-trail-cell (CSS, розмір клітинки) + константи нижче.
   ========================================================================== */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('requestAnimationFrame' in window)) return;

  var containers = Array.prototype.slice.call(document.querySelectorAll('[data-grid]'));
  if (!containers.length) return;

  var PROB_OF_NEIGHBOR   = 0.05;  // шанс, що сусідня клітинка теж спалахне
  var AMT_FADE_PER_FRAME = 5;     // згасання альфи за кадр (шкала 0..255)
  var MAX_ALPHA          = 0.15;  // пік непрозорості білого пікселя (×2 прозоріше за вихідні 0.30)
  var IDLE_MS            = 700;   // присипляємо rAF, коли нема активних клітинок і руху

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  // розмір клітинки з CSS-змінної (rem або px); фолбек 40px
  function cellSizePx() {
    var rootStyle = getComputedStyle(document.documentElement);
    var raw = rootStyle.getPropertyValue('--grid-trail-cell').trim();
    var n = parseFloat(raw);
    if (!n) return 40;
    if (/rem\s*$/.test(raw)) return n * (parseFloat(rootStyle.fontSize) || 16);
    return n; // px або безрозмірне трактуємо як px
  }

  function makeTrail(container) {
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); // різкість без перевитрат
    var W = 0, H = 0, CELL = 40, rows = 0, cols = 0;
    var curRow = -2, curCol = -2;
    var cells = [];                       // {row, col, a} — a: 0..255
    var mx = 0, my = 0, inside = false, visible = true;
    var running = false, lastMove = 0;
    var skipSel = container.getAttribute('data-grid-skip'); // не малювати, коли курсор над цими зонами (напр. герой)

    function resize() {
      var r = container.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      CELL = cellSizePx();
      canvas.width  = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rows = Math.ceil(H / CELL);
      cols = Math.ceil(W / CELL);
    }

    function addNeighbors(row, col) {
      for (var dR = -1; dR <= 1; dR++) {
        for (var dC = -1; dC <= 1; dC++) {
          if (dR === 0 && dC === 0) continue;
          var nR = row + dR, nC = col + dC;
          if (nR < 0 || nR >= rows || nC < 0 || nC >= cols) continue;
          if (Math.random() < PROB_OF_NEIGHBOR) cells.push({ row: nR, col: nC, a: 255 });
        }
      }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);

      // нова клітинка під курсором (+ випадкові сусіди), лише коли заходимо в іншу
      if (visible && inside && mx >= 0 && mx < W && my >= 0 && my < H) {
        var row = Math.floor(my / CELL), col = Math.floor(mx / CELL);
        if (row !== curRow || col !== curCol) {
          curRow = row; curCol = col;
          cells.push({ row: row, col: col, a: 255 });
          addNeighbors(row, col);
        }
      }

      // згасання + промальовка живих клітинок
      var live = [];
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        c.a -= AMT_FADE_PER_FRAME;
        if (c.a <= 0) continue;
        ctx.fillStyle = 'rgba(255,255,255,' + (c.a / 255 * MAX_ALPHA).toFixed(3) + ')';
        ctx.fillRect(c.col * CELL, c.row * CELL, CELL, CELL);
        live.push(c);
      }
      cells = live;

      // нічого не світиться й курсор давно не рухався → засинаємо
      if (!cells.length && (now() - lastMove) > IDLE_MS) { running = false; return; }
      requestAnimationFrame(frame);
    }

    function kick() {
      if (!running) { running = true; requestAnimationFrame(frame); }
    }

    // курсор над зоною-винятком (інший data-grid поверх) → фоновий шар тут не малює
    function pointerOverSkip(cx, cy) {
      if (!skipSel) return false;
      var zones = document.querySelectorAll(skipSel), z, zr;
      for (z = 0; z < zones.length; z++) {
        zr = zones[z].getBoundingClientRect();
        if (cx >= zr.left && cx < zr.right && cy >= zr.top && cy < zr.bottom) return true;
      }
      return false;
    }

    function onMove(e) {
      var r = container.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
      inside = mx >= 0 && mx < W && my >= 0 && my < H && !pointerOverSkip(e.clientX, e.clientY);
      lastMove = now();
      if (visible && inside) kick();
    }

    resize();
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('blur', function () { inside = false; });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 150);
    }, { passive: true });

    // не рахувати, коли контейнер поза екраном (важить для in-flow [data-grid])
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 }).observe(container);
    }
  }

  containers.forEach(makeTrail);

  /* ---- 7. RFQ: показ імені прикріпленого PDF у компактному контролі ---- */
  var rfqFile = root.querySelector('#rfq-file');
  var rfqAttach = root.querySelector('.landing__rfq-attach');
  if (rfqFile && rfqAttach) {
    var rfqAttachText = rfqAttach.querySelector('.landing__rfq-attach-text');
    var rfqAttachLabel = rfqAttachText ? rfqAttachText.textContent : '';
    var rfqAttachTitle = rfqAttach.getAttribute('title') || '';
    rfqFile.addEventListener('change', function () {
      var f = rfqFile.files && rfqFile.files[0];
      if (f) {
        if (rfqAttachText) rfqAttachText.textContent = f.name;
        rfqAttach.classList.add('is-filled');
        rfqAttach.setAttribute('title', f.name);
      } else {
        if (rfqAttachText) rfqAttachText.textContent = rfqAttachLabel;
        rfqAttach.classList.remove('is-filled');
        rfqAttach.setAttribute('title', rfqAttachTitle);
      }
    });
  }
})();
