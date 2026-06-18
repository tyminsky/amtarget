# -*- coding: utf-8 -*-
"""Generate AMTarget catalog prototype HTML from the real product feed.
Layout: category-based product LISTS, per-steel price breakdown, auto-pagination."""
import openpyxl, io, re
from collections import OrderedDict

wb = openpyxl.load_workbook('feed - AMTarget.xlsx', read_only=True, data_only=True)

def num(x):
    try: return float(x)
    except: return None

def grab(sheet, colmap):
    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    out = []
    for r in rows[3:]:
        sku = r[0]
        if not sku or str(sku).strip() in ('', 'None'):
            continue
        out.append({k: (r[i] if i < len(r) else None) for k, i in colmap.items()})
    return out

gong_cols = {'sku':0,'title':1,'line':2,'desc':4,'price':5,'size':17,'material':16,'cat':24,'labels':27}
mish_cols = {'sku':0,'title':1,'line':2,'desc':4,'price':5,'size':16,'material':20,'cat':24,'labels':27}
rows = grab('Gong - UA', gong_cols) + grab('Mishen - UA', mish_cols)

cats = OrderedDict()
for d in rows:
    cat = str(d['cat']).split('|')[0].strip() if d['cat'] else '(інше)'
    line = str(d['line']).strip() if d['line'] else str(d['sku'])
    g = cats.setdefault(cat, OrderedDict()).setdefault(
        line, {'title': None, 'sizes': [], 'mats': [], 'prices': [], 'by_steel': OrderedDict(),
               'desc': None, 'labels': set()})
    if d['labels'] and str(d['labels']) != 'None':
        for tok in re.split(r'[,\s]+', str(d['labels']).strip().lower()):
            if tok:
                g['labels'].add(tok)
    t = re.sub(r'\s*AR ?5[05]0.*$', '', str(d['title'])).strip()
    if t and (g['title'] is None or len(t) < len(g['title'])):
        g['title'] = t
    if not g['desc'] and d['desc'] and str(d['desc']) != 'None':
        g['desc'] = str(d['desc'])
    if d['size'] and str(d['size']) != 'None':
        s = str(d['size']).strip()
        if s not in g['sizes']: g['sizes'].append(s)
    m = str(d['material']).strip() if d['material'] and str(d['material']) != 'None' else None
    if m and m not in g['mats']:
        g['mats'].append(m)
    p = num(d['price'])
    if p:
        g['prices'].append(p)
        if m and m not in g['by_steel']:
            g['by_steel'][m] = int(p)

STEEL = {
    'AR 500 5 mm':'AR500·5','AR 500 10 mm':'AR500·10','AR 550 10 mm':'AR550·10',
    'AR 500 20 mm':'AR500·20','AR 500 7-10 mm':'AR500·7–10','Ст3':'Ст3',
}
STEEL_ORDER = {'AR 500 5 mm':0,'AR 500 10 mm':1,'AR 550 10 mm':2,'AR 500 20 mm':3,'AR 500 7-10 mm':4,'Ст3':9}
def steel_chip(m):
    return '<span class="chip %s">%s</span>' % ('ar550' if '550' in m else 'steel', STEEL.get(m, m))

def short_desc(t, cap=185, grow=75):
    if not t or str(t) == 'None':
        return ''
    t = re.sub(r'\s+', ' ', str(t)).strip()
    t = re.split(r'Зовнішній вигляд', t)[0].strip()      # drop boilerplate tail
    sents = re.split(r'(?<=[.!?])\s+', t)
    out = ''
    for s in sents:
        if not out:
            out = s
        elif len(out) < grow:
            out += ' ' + s
        else:
            break
    if len(out) > cap:
        out = out[:cap - 2].rsplit(' ', 1)[0].rstrip(' ,.;') + '…'
    return out

# ---------- shared price block ----------
def price_html(g):
    pr = g['prices']
    pmin, pmax = (int(min(pr)), int(max(pr))) if pr else (0, 0)
    if g['by_steel']:
        steels = sorted(g['by_steel'].items(), key=lambda kv: STEEL_ORDER.get(kv[0], 8))
        head = '<div class="psteel pshead"><span class="ps-h">Тип сталі</span><span class="ps-h">Ціна</span></div>'
        body = ''.join(
            '<div class="psteel">%s<span class="ps-val">%s<small>грн</small></span></div>'
            % (steel_chip(m), v) for m, v in steels)
        return '<div class="price">%s%s</div>' % (head, body), len(steels), pmax
    price = ('%s–%s' % (pmin, pmax)) if pmin != pmax else ('%s' % pmin)
    return '<span class="price">%s<small>грн</small></span>' % price, 1, pmax

# ---------- regular list row ----------
def product_block(line, g):
    pb, nlines, pmax = price_html(g)
    toggle = ' data-toggle' if pmax >= 5000 else ''
    sizes = ' · '.join(g['sizes'][:3]) if g['sizes'] else '—'
    meta = '<span class="sku">%s</span><span class="dim">%s мм</span>' % (line, sizes)
    desc = short_desc(g['desc'])
    desc_html = '<p class="pdesc">%s</p>' % desc if desc else ''
    html = ('<div class="prow brk"%s>'
            '<div class="thumb"></div>'
            '<div class="pinfo"><h4>%s</h4><div class="meta">%s</div>%s</div>'
            '<div class="pprice">%s<span class="price-req">Ціна за запитом</span></div>'
            '</div>' % (toggle, g['title'], meta, desc_html, pb))
    desc_lines = 0 if not desc else (3 if len(desc) > 120 else 2)
    cost = max(96, 50 + desc_lines * 16, 24 + nlines * 27) + 32
    return html, cost

# ---------- big TOP/featured card ----------
def hero_card(line, g, badge):
    pb, nlines, pmax = price_html(g)
    toggle = ' data-toggle' if pmax >= 5000 else ''
    sizes = ' · '.join(g['sizes'][:3]) if g['sizes'] else '—'
    desc = short_desc(g['desc'], cap=320, grow=240)
    bcls = 'top' if badge == 'ТОП' else 'rec'
    return ('<div class="hero"%s>'
            '<div class="ph hero-img"><span class="hero-badge %s">%s</span>'
            '<span class="ph-cap">%s</span></div>'
            '<div class="hero-body">'
            '<h3>%s</h3>'
            '<div class="meta"><span class="sku">%s</span><span class="dim">%s мм</span></div>'
            '<p class="hero-desc">%s</p>'
            '<div class="hero-price">%s<span class="price-req">Ціна за запитом</span></div>'
            '</div></div>'
            % (toggle, bcls, badge, g['title'], g['title'], line, sizes, desc, pb))

# ---------- chapters (real feed categories only) ----------
CHAPTERS = [
    dict(tab='Гонги', kicker='Продукти · Гонги', title='Гонги',
         sub='Класична мішень-гонг: влучання підтверджується дзвоном. Доступні у 3 марках сталі — ціна вказана окремо під кожну.',
         sections=[('Гонги на два отвори','Гонги>Гонги на два отвори'),
                   ('Гонги на один отвір','Гонги>Гонги на один отвір'),
                   ('Гонги IPSC','Гонги>Гонги IPSC'),
                   ('AM-ImpacT','Гонги>AM-ImpacT')]),
    dict(tab='Тарілки', kicker='Продукти · Тарілки', title='Тарілки на підставці',
         sub='Тарілки на стійці для швидкісної стрільби — квадратні та круглі, у 3 марках сталі.',
         sections=[('Квадратні тарілки','Тарілки на підставці>Квадратні тарілки'),
                   ('Круглі тарілки','Тарілки на підставці>Круглі тарілки')]),
    dict(tab='Установки', kicker='Продукти · Установки', title='Мішеневі установки',
         sub='Реактивні мішені: поппери, що падають, рухомі та тактичні установки.',
         sections=[('Поппери','Мішеневі установки>Поппери'),
                   ('Tactical','Мішеневі установки>Tactical'),
                   ('Training','Мішеневі установки>Training'),
                   ('Рухомі мішені','Мішеневі установки>Рухомі мішені')]),
    dict(tab='Обладнання', kicker='Продукти · Обладнання', title='Додаткове обладнання',
         sub='Стійки, стенди, треноги та кулеуловлювачі.',
         sections=[('Стійки · треноги · стенди','Додаткове обладнання'),
                   ('Кулеуловлювачі','Додаткове обладнання>Кулеуловлювачі')]),
    dict(tab='Запчастини', kicker='Продукти · Комплектуючі', title='Запасні частини та комплектуючі',
         sub='Окремі тарілки, набори гонгів, рами та кронштейни для мішеневих установок.',
         sections=[('Комплектуючі','Запасні частини')]),
]

# ---------- build flow items ----------
seen = set()
TITLE_COST, CATBAR_COST, RUN_COST, HERO_COST = 150, 48, 32, 430
flow = []   # ('title'|'catbar'|'hero'|'prod', html, cost, tab)
for ch in CHAPTERS:
    flow.append(('title',
        '<div class="kicker">%s</div><h2 class="sec-title">%s</h2><p class="sec-sub">%s</p>'
        % (ch['kicker'], ch['title'], ch['sub']), TITLE_COST, ch['tab']))
    for subhead, cat in ch['sections']:
        lines = [(l, g) for l, g in cats.get(cat, {}).items() if l not in seen]
        if not lines:
            continue
        # pick up to 2 featured: feed "top" first, then earliest as fallback
        heroes = [x for x in lines if 'top' in x[1]['labels']][:2]
        hkeys = set(l for l, _ in heroes)
        for x in lines:
            if len(heroes) >= 2:
                break
            if x[0] not in hkeys:
                heroes.append(x); hkeys.add(x[0])
        rest = [x for x in lines if x[0] not in hkeys]
        for l, _ in lines:
            seen.add(l)
        flow.append(('catbar',
            '<div class="catbar">%s<span>%d позицій</span></div>' % (subhead, len(lines)),
            CATBAR_COST, ch['tab']))
        # 2 featured cards
        hcards = ''
        for l, g in heroes:
            badge = 'ТОП' if 'top' in g['labels'] else 'РЕКОМЕНДУЄМО'
            hcards += hero_card(l, g, badge)
        flow.append(('hero', '<div class="hero-row">%s</div>' % hcards, HERO_COST, ch['tab']))
        # the rest as list rows
        for l, g in rest:
            h, c = product_block(l, g)
            flow.append(('prod', '<div class="plist one">%s</div>' % h, c, ch['tab']))

# ---------- paginate ----------
BUDGET = 880
pages = []          # list of dict(items=[html], tab=, has_title=bool, chapter=)
cur = None
def new_page(tab):
    global cur
    cur = dict(items=[], used=0, tab=tab, has_title=False, chapter=tab)
    pages.append(cur)

def fits(extra):
    return cur is not None and (cur['used'] + extra) <= BUDGET

i = 0
while i < len(flow):
    kind, html, cost, tab = flow[i]
    if kind == 'title':
        # start a fresh page for each chapter title (clean chapter openings)
        new_page(tab); cur['has_title'] = True
        cur['items'].append(html); cur['used'] += cost; i += 1
        continue
    if kind == 'catbar':
        # keep catbar with the next block (hero/product) — avoid orphan header
        nxt_cost = flow[i+1][2] if i+1 < len(flow) and flow[i+1][0] in ('prod', 'hero') else 0
        if not fits(cost + nxt_cost):
            new_page(tab)
        cur['items'].append(html); cur['used'] += cost; cur['chapter'] = tab; i += 1
        continue
    # prod
    if not fits(cost):
        new_page(tab)
    cur['items'].append(html); cur['used'] += cost; i += 1

# ---------- read assets ----------
CSS = io.open('_assets_css.txt', encoding='utf-8').read()
STATIC = io.open('_assets_static.txt', encoding='utf-8').read()
S = {}
for block in STATIC.split('@@@'):
    block = block.strip()
    if not block: continue
    key, _, rest = block.partition('\n')
    S[key.strip()] = rest

# ---------- render product pages ----------
def page_html(p, n):
    head = '' if p['has_title'] else '<div class="runhdr">%s · продовження</div>' % p['chapter']
    return ('<section class="page"><span class="tab">%s</span><div class="pad">%s%s</div>'
            '<div class="foot-brand">AMTarget · amtarget.net</div>'
            '<div class="pageno">%02d</div></section>'
            % (p['tab'], head, '\n'.join(p['items']), n))

def setpno(html, n):
    return re.sub(r'(<div class="pageno"[^>]*>)\s*\d+\s*(</div>)',
                  lambda m: m.group(1) + ('%02d' % n) + m.group(2), html)

# front matter — ordered, numbered dynamically (02..)
n = 2
front = ''
for key in ['ABOUT', 'MATERIALS', 'MATERIALS2', 'CALIBER', 'MILITARY']:
    front += setpno(S[key], n); n += 1

prod_html = []
for p in pages:
    prod_html.append(page_html(p, n)); n += 1

safety = setpno(S['SAFETY'], n); n += 1

html = (
    '<!DOCTYPE html>\n<html lang="uk"><head><meta charset="UTF-8">'
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    '<title>AMTarget — Каталог · Прототип</title>\n<style>\n' + CSS + '\n</style></head><body>\n'
    + S['CONTROLS'] + S['COVER'] + front
    + '\n'.join(prod_html)
    + safety + S['CONTACTS'] + S['SCRIPT'] + '\n</body></html>'
)
io.open('amtarget_catalog_prototype.html', 'w', encoding='utf-8').write(html)
print('built · product pages:', len(pages), '· products:', len(seen), '· last numbered page:', n - 1)
