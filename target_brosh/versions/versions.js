/* ==========================================================================
   A.M. Target — СИСТЕМА ВЕРСІЙ брошури
   --------------------------------------------------------------------------
   Єдине джерело правди: список збережених знімків + код лівої панелі.
   Підключається одним рядком у кожному файлі:  <script src="versions/versions.js">
   (у самих знімках, що лежать у versions/, шлях стає просто "versions.js").

   ЯК ЗБЕРЕГТИ НОВУ ВЕРСІЮ (робить асистент на прохання «зберігаємо цю версію»):
     1) скопіювати поточний amtarget_catalog_prototype.html → versions/vN.html
        із заміною шляхів:  assets/ → ../assets/   та   versions/versions.js → versions.js
     2) додати запис у масив VERSIONS нижче (новіші — зверху).
   Панель і список оновлюються в УСІХ знімках автоматично (спільний файл).
   ========================================================================== */
(function () {
  "use strict";

  /* ─── РОБОЧИЙ ФАЙЛ (живі правки, завжди зверху) ─────────────────────────── */
  var WORKING = {
    id: "working",
    label: "Поточна (робоча)",
    file: "amtarget_catalog_prototype.html",
    working: true,
    note: "Останні правки, ще не зафіксовані в окремий знімок."
  };

  /* ─── ЗБЕРЕЖЕНІ ВЕРСІЇ (новіші — зверху) ─────────────────────────────────── */
  var VERSIONS = [
    {
      id: "v1",
      label: "Базова тема з лендінгу",
      date: "2026-06-19",
      file: "versions/v1.html",
      note: "Брошуру переведено на дизайн-систему лендінгу: кольори і шрифти 1:1, темна тема, жовтий акцент. Типографіку очищено (BF_SUB_HEADLINE лише для uppercase-заголовків), виправлено заокруглення."
    },
    {
      id: "v0",
      label: "Прототип (до теми)",
      date: "2026-06-18",
      file: "versions/v0.html",
      note: "Початковий прототип каталогу: світла «презентаційна» тема — червоний акцент, шрифт Segoe UI, паперові сторінки, CSS-плейсхолдери. До переходу на дизайн-систему лендінгу."
    }
  ];

  window.AMT_VERSIONS = VERSIONS;

  /* ─── ШЛЯХИ / ДОПОМІЖНЕ ──────────────────────────────────────────────────── */
  function inVersionsDir() { return /\/versions\//.test(location.pathname); }
  function hrefFor(rootPath) { return inVersionsDir() ? "../" + rootPath : rootPath; }
  function basename(p) { return (p || "").split(/[\\/]/).pop(); }
  function fmtDate(d) {
    if (!d) return "";
    var p = d.split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : d;
  }
  function esc(s) {
    return (s || "").replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var here = basename(location.pathname);
  var items = [WORKING].concat(VERSIONS);
  var savedCount = VERSIONS.length;

  /* ─── СТИЛІ (узгоджені з темою брошури/лендінгу) ─────────────────────────── */
  var css = [
    ".amt-vrail,.amt-vrail__backdrop{font-family:var(--font-body,'Helvetica Neue',Arial,sans-serif);}",
    ".amt-vrail__backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.45);backdrop-filter:blur(1px);",
      "opacity:0;pointer-events:none;transition:opacity .3s ease;}",
    ".amt-vrail.open ~ .amt-vrail__backdrop,.amt-vrail.open + .amt-vrail__backdrop{opacity:1;pointer-events:auto;}",
    ".amt-vrail{position:fixed;top:0;left:0;height:100%;z-index:1001;pointer-events:none;}",
    ".amt-vrail *{box-sizing:border-box;}",
    /* ручка-вкладка на лівому краю */
    ".amt-vrail__handle{pointer-events:auto;position:absolute;top:104px;left:0;display:flex;flex-direction:column;",
      "align-items:center;gap:11px;background:#101617;color:#ffd21d;border:1px solid rgba(255,255,255,.12);",
      "border-left:none;border-radius:0 12px 12px 0;padding:14px 9px 13px;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.45);",
      "transition:transform .3s ease,opacity .25s ease;}",
    ".amt-vrail__handle:hover{transform:translateX(2px);}",
    ".amt-vrail.open .amt-vrail__handle{opacity:0;pointer-events:none;transform:translateX(-12px);}",
    ".amt-vrail__handle b{writing-mode:vertical-rl;text-orientation:mixed;font-family:var(--font-mono,monospace);",
      "font-size:11px;font-weight:400;letter-spacing:.24em;text-transform:uppercase;}",
    ".amt-vrail__handle .amt-vrail__ico{width:16px;height:16px;display:block;}",
    ".amt-vrail__badge{min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ffd21d;",
      "color:#000;font-family:var(--font-btn,Arial,sans-serif);font-weight:700;font-size:11px;line-height:18px;text-align:center;}",
    /* панель */
    ".amt-vrail__panel{pointer-events:auto;position:absolute;top:84px;left:0;width:308px;max-height:calc(100vh - 110px);",
      "display:flex;flex-direction:column;background:#101617;border:1px solid rgba(255,255,255,.12);border-left:none;",
      "border-radius:0 16px 16px 0;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden;",
      "transform:translateX(-112%);opacity:0;transition:transform .34s cubic-bezier(.4,0,.2,1),opacity .34s ease;}",
    ".amt-vrail.open .amt-vrail__panel{transform:none;opacity:1;}",
    ".amt-vrail__head{display:flex;align-items:center;justify-content:space-between;padding:14px 14px 12px;",
      "border-bottom:1px solid rgba(255,255,255,.1);}",
    ".amt-vrail__head b{font-family:var(--font-mono,monospace);font-weight:400;font-size:11px;letter-spacing:.18em;",
      "text-transform:uppercase;color:#ffd21d;}",
    ".amt-vrail__close{border:none;background:rgba(255,255,255,.07);color:#fff;width:26px;height:26px;border-radius:8px;",
      "cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;}",
    ".amt-vrail__close:hover{background:rgba(255,255,255,.14);}",
    ".amt-vrail__list{padding:8px;overflow-y:auto;display:flex;flex-direction:column;gap:7px;}",
    /* запис версії */
    ".amt-vrail__item{display:block;text-decoration:none;padding:11px 12px;border-radius:12px;",
      "background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);transition:border-color .2s,background .2s;}",
    ".amt-vrail__item:hover{border-color:rgba(255,255,255,.26);background:rgba(255,255,255,.06);}",
    ".amt-vrail__item.is-current{border-color:rgba(255,210,29,.55);background:rgba(255,210,29,.08);}",
    ".amt-vrail__item.is-working{border-style:dashed;}",
    ".amt-vrail__row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;}",
    ".amt-vrail__label{font-family:var(--font-btn,Arial,sans-serif);font-weight:700;font-size:13.5px;color:#fff;}",
    ".amt-vrail__date{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.06em;color:rgba(255,255,255,.5);white-space:nowrap;}",
    ".amt-vrail__note{margin-top:6px;font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.62);}",
    ".amt-vrail__tag{display:inline-block;margin-top:8px;font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.12em;",
      "text-transform:uppercase;padding:3px 7px;border-radius:6px;}",
    ".amt-vrail__tag--cur{background:#ffd21d;color:#000;}",
    ".amt-vrail__tag--work{background:rgba(255,255,255,.1);color:rgba(255,255,255,.7);}",
    ".amt-vrail__hint{padding:10px 14px 13px;border-top:1px solid rgba(255,255,255,.1);font-size:10.5px;line-height:1.5;",
      "color:rgba(255,255,255,.45);}",
    "@media print{.amt-vrail,.amt-vrail__backdrop{display:none!important;}}"
  ].join("");

  /* ─── ІНІЦІАЛІЗАЦІЯ ──────────────────────────────────────────────────────── */
  function build() {
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    var listHTML = items.map(function (it) {
      var isCur = basename(it.file) === here;
      var cls = "amt-vrail__item" + (isCur ? " is-current" : "") + (it.working ? " is-working" : "");
      var title = it.working ? it.label : (it.id.toUpperCase() + " · " + it.label);
      var dateOrTag = it.working ? "робоча" : fmtDate(it.date);
      var tag = "";
      if (isCur) tag = '<span class="amt-vrail__tag amt-vrail__tag--cur">Ви тут</span>';
      else if (it.working) tag = '<span class="amt-vrail__tag amt-vrail__tag--work">Жива версія</span>';
      return '<a class="' + cls + '" href="' + esc(hrefFor(it.file)) + '">' +
        '<div class="amt-vrail__row">' +
          '<span class="amt-vrail__label">' + esc(title) + '</span>' +
          '<span class="amt-vrail__date">' + esc(dateOrTag) + '</span>' +
        '</div>' +
        '<div class="amt-vrail__note">' + esc(it.note) + '</div>' +
        tag +
      '</a>';
    }).join("");

    var rail = document.createElement("div");
    rail.className = "amt-vrail";
    rail.innerHTML =
      '<button class="amt-vrail__handle" type="button" aria-label="Версії">' +
        '<svg class="amt-vrail__ico" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
          '<path d="M8 1.5 14.5 5 8 8.5 1.5 5 8 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
          '<path d="M1.5 8 8 11.5 14.5 8M1.5 11 8 14.5 14.5 11" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
        '</svg>' +
        '<b>Версії</b>' +
        (savedCount ? '<span class="amt-vrail__badge">' + savedCount + '</span>' : '') +
      '</button>' +
      '<div class="amt-vrail__panel" role="dialog" aria-label="Збережені версії">' +
        '<div class="amt-vrail__head"><b>Збережені версії</b>' +
          '<button class="amt-vrail__close" type="button" aria-label="Закрити">×</button></div>' +
        '<div class="amt-vrail__list">' + listHTML + '</div>' +
        '<div class="amt-vrail__hint">Натисни версію — миттєво відкриється той знімок. ' +
          'У нотатці видно, що змінилось.</div>' +
      '</div>';

    var backdrop = document.createElement("div");
    backdrop.className = "amt-vrail__backdrop";

    document.body.appendChild(rail);
    document.body.appendChild(backdrop);

    function open() { rail.classList.add("open"); backdrop.classList.add("on"); backdrop.style.pointerEvents = "auto"; backdrop.style.opacity = "1"; }
    function close() { rail.classList.remove("open"); backdrop.style.pointerEvents = "none"; backdrop.style.opacity = "0"; }

    rail.querySelector(".amt-vrail__handle").addEventListener("click", open);
    rail.querySelector(".amt-vrail__close").addEventListener("click", close);
    backdrop.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
