# A.M. Target — окремий статичний лендінг

Самодостатня лендінг-сторінка **поза WordPress**: HTML + CSS + невеликий власний
vanilla-JS (`landing.js`), без gulp-збірки, без SASS і без include-блоків. Підключає
**повний CSS сайту**, а власні стилі пише під коренем `.landing`.

`landing.js` — **progressive enhancement** (без JS сторінка повністю робоча): поява секцій
при скролі (IntersectionObserver), анімовані лічильники, фільтр каталогу за категорією,
parallax мішені в геро. Усе поважає `prefers-reduced-motion`.

---

## 1. Структура папки

```
landing/
├─ index.html              # один HTML-файл (head + шапка + контент + футер)
├─ style.css               # СТИЛІ ЛЕНДІНГУ — лише нові правила під .landing
├─ landing.js              # власний vanilla-JS лендінгу (progressive enhancement)
├─ README.md               # цей файл
├─ assets/
│  ├─ css/
│  │   └─ styles.css        # ПОВНИЙ CSS сайту (копія theme/assets/css/styles.css)
│  ├─ fonts/                # HelveticaNeueCyr 400/500/700 + BF_* (лише woff2 — підтримка ~99%)
│  ├─ img/                  # SVG (sprite/logo/divider…) + растри у WebP (фото/товари/фони)
│  └─ video/                # mp4 (усі підвантажуються ліниво, поза стартом)
└─ _src-originals/          # оригінали png/jpg + бекап css (НЕ для деплою; джерело для ре-конвертації)
```

Структура `assets/css` ↔ `assets/fonts` ↔ `assets/img` **дзеркалить тему**, тому
відносні шляхи всередині `styles.css` працюють без змін:
`@font-face` тягне `../fonts/…`, фонові — `../img/…`.

---

## 2. Як влаштовані стилі

У `<head>` стилі підключені у такому порядку (порядок DOM = каскад):

```html
<style> …критичний інлайн-мінімум: темний фон + фікс-хедер… </style>

<!-- 1. повна тема (240KB) — НЕ блокує рендер (media-swap), лишається на DOM-позиції 1 -->
<link rel="stylesheet" href="assets/css/styles.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="assets/css/styles.css"></noscript>

<!-- 2. стилі лендінгу — критичний шар, лишається блокуючим -->
<link rel="stylesheet" href="style.css">
```

1. **`assets/css/styles.css`** — увесь стиль теми: reset, токени, типографіка,
   `.container`, `.header*`, `.footer*`, `.btn` тощо. Завантажується **асинхронно**
   (`media="print"`→`all` по `onload`), тож не блокує перший рендер. Лишається на
   **DOM-позиції 1**, тому `.landing`-перевизначення з `style.css` коректно перекривають.
   Поки тема їде — інлайн-`<style>` тримає темний фон і фікс-хедер (без білого спалаху).
2. **`style.css`** — підключається **останнім** (блокуючий), тож завжди може перекрити
   сайтове правило всередині `.landing`.

> ⚠️ Не повертайте тему на звичайний `rel="stylesheet"` без `media`-swap — це знову
> зробить її render-blocking. І не міняйте місцями два `<link>`: каскад тримається на
> DOM-порядку (тема → лендінг).

---

## 3. Головне правило: нові стилі — лише під `.landing`

Корінь контенту — `<main class="landing">`. **Усі нові правила** пишемо під ним:

```css
/* BEM-префікс .landing__<element> */
.landing__hero { ... }
.landing__hero-title { ... }

/* або через вкладеність */
.landing .some-block { ... }
```

**Не можна** використовувати імена класів сайту для НОВИХ блоків
(інакше зламаєте шапку/футер/спільні компоненти):

> `.header*`, `.footer*`, `.container`, `.btn`, `.richtext`, `.content_builder`,
> `.section`, `.lang`, `.catalog_menu`, `.opt_ticker`, `.badge`

Їх можна лише **перевикористовувати** як є (наприклад, обгорнути секцію в `.container`
або поставити кнопку `.btn .btn-more`).

---

## 4. Дизайн-токени та брейкпоінти

Кольори теми у `styles.css` скомпільовані в hex і **недоступні** як CSS-змінні,
тож у `style.css` вони продубльовані локально під `.landing`:

```css
--accent: #FFD21D;   --green: #00A046;   --l-green: #00E569;
--site-bg: #161D1E;  --white: #fff;      --black: #000;   --error: #FF6363;
--font-title: "BF_Modernista", sans-serif;   /* заголовки/герой */
--r-btn: 10px;  --r-block: 20px;  --r-shortcard: 15px;
--p-block-mob: 20px;  --p-block-pc: 30px;
```

Основний шрифт тексту — `HelveticaNeueCyr` (успадковується з `body`).

**Брейкпоінти — mobile-first (`min-width`), як у темі:**

| Назва     | px    |
|-----------|-------|
| mobile    | 359   |
| tablet    | 768   |
| laptop    | 1024  |
| pc        | 1200  |
| pc-hd     | 1400  |
| pc-full-hd| 1800  |

```css
.landing__hero { font-size: 24px; }
@media (min-width: 768px)  { .landing__hero { font-size: 32px; } }
@media (min-width: 1200px) { .landing__hero { font-size: 48px; } }
```

Адаптивні CSS-змінні теми доступні (визначені на `html` у `styles.css`):
`--container-padding` (20→22→48→64) і `--header-font-size` (14→17).

---

## 5. Шапка та футер

- **Повна інлайн-копія** розмітки сайту, стилізована реальним `styles.css`.
- **Шапка `fixed`** + `.header_placeholder` резервує висоту (контент не ховається під нею).
  Клас `fixed` на `<header>` лишає темну «пігулку»-підкладку завжди видимою
  (на сайті вона з'являється на скролі через JS).
- **Інтерактив без JS теми** (дописано в `style.css`):
  - випадайка каталогу — на `:hover`;
  - підменю каталогу — на `:hover` (вже в site CSS);
  - розкривний пошук — на `:focus-within`.
- **Не функціонує** (залежало від JS/панелей теми, які навмисно не переносили):
  мобільне меню по бургеру, панель кошика, опт-попап. Кнопки лишаються візуальними.
  Якщо потрібен повний функціонал — підключіть JS теми й видаліть CSS-блок
  «Інтерактив шапки без JS» зі `style.css`.

---

## 6. Як додати нову секцію

1. **Розмітка** — у `index.html`, всередині `<main class="landing">`:
   ```html
   <section class="landing__hero">
     <div class="container">
       <h2 class="landing__hero-title">Заголовок</h2>
       <a href="#" class="btn btn-more">До каталогу</a> <!-- спільний компонент — ок -->
     </div>
   </section>
   ```
2. **Стилі** — у `style.css`, у блоці «СЕКЦІЇ ЛЕНДІНГУ», під `.landing`:
   ```css
   .landing__hero { padding: 40px 0; }
   .landing__hero-title { font-family: var(--font-title); text-transform: uppercase; }
   @media (min-width: 1024px) { .landing__hero { padding: 80px 0; } }
   ```
3. **Текстовий контент** (абзаци, списки, цитати) можна загорнути в `.richtext` —
   отримаєте готову типографіку сайту.
4. **Зображення/іконки** — кладіть у `assets/img/`. SVG-іконки зі спрайта:
   `<svg><use xlink:href="assets/img/sprite.svg#ico-…"></use></svg>`.

---

## 7. Локальний перегляд

⚠️ Через `file://` (подвійний клік) браузер може **блокувати SVG-спрайт** у `<use>` —
іконки шапки не з'являться. Шрифти й стилі працюють.

Запускайте через локальний сервер, напр.:

```bash
npx serve landing
# або VS Code → розширення "Live Server" → Open with Live Server
```

---

## 8. Обслуговування

- `assets/css/styles.css` — **знімок** стилів сайту. Якщо стилі теми оновилися,
  перекопіюйте файл:
  ```bash
  cp theme/assets/css/styles.css landing/assets/css/styles.css
  ```
- Цей лендінг **не бере участі** в gulp-збірці теми й не потрапляє у WordPress —
  це окремий статичний пакет (HTML + CSS + assets).

---

## 9. Чеклист перед здачею

- [ ] усі нові стилі — під `.landing` (немає глобальних правил, що чіпають сайт);
- [ ] жодне ім'я класу сайту не перевизначено для нового блоку;
- [ ] перевірено на брейкпоінтах 359 / 768 / 1024 / 1200 / 1400 / 1800;
- [ ] іконки/шрифти/зображення лежать локально в `assets/`;
- [ ] сторінка відкрита через локальний сервер (іконки спрайта видно);
- [ ] `styles.css` актуальний (перекопійований за потреби).
