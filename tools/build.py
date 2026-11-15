"""Rrjeti site build: Albanian pages are the source, this script

1. adds the SEO block to every page (canonical, hreflang, Open Graph,
   Twitter, robots, JSON-LD structured data),
2. builds the English version of every page in new/en/ from tools/en.json,
3. writes sitemap.xml, robots.txt, llms.txt and CNAME.

Run after any change to the Albanian pages:   python tools/build.py
New Albanian text that has no English yet is listed at the end; add it
to tools/en.json and run again.
"""
import html as htmlmod
import json
import os
import posixpath
import re
import sys
from datetime import date

sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', 'new'))
SITE = 'https://rrjetiagency.com'
TODAY = date.today().isoformat()
MAP = 'https://maps.app.goo.gl/XbtsDaji2A8jET966'
EN = json.load(open(os.path.join(HERE, 'en.json'), encoding='utf-8'))
NOINDEX = {'faleminderit/index.html', '404.html'}
TRANSLATE_ATTRS = ('alt', 'placeholder', 'aria-label', 'title', 'label')
META_KEYS = ('description', 'og:image:alt')

# ---------------------------------------------------------------- helpers
def clean(rel):
    """file path -> pretty URL path (no leading slash)."""
    if rel == 'index.html':
        return ''
    if rel.endswith('/index.html'):
        return rel[:-len('index.html')]
    return rel


def url_for(rel, lang):
    return SITE + '/' + ('en/' if lang == 'en' else '') + clean(rel)


def depth(rel):
    return rel.count('/')


def rel_link(from_rel, to_path):
    """relative href from page from_rel (site path) to site path to_path."""
    base = posixpath.dirname(from_rel) or '.'
    target = to_path or '.'
    r = posixpath.relpath(target if target != '.' else '.', base)
    if to_path.endswith('/') or to_path == '':
        r = r.rstrip('/') + '/'
        if r == './' or r == '/':
            r = './'
    return r


def get_title(s):
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    return htmlmod.unescape(m.group(1).strip()) if m else 'Rrjeti Agency'


def get_desc(s):
    m = re.search(r'<meta name="description" content="([^"]*)"', s)
    return htmlmod.unescape(m.group(1)) if m else ''


def strip_tags(x):
    return re.sub(r'\s+', ' ', htmlmod.unescape(re.sub(r'<[^>]+>', '', x))).strip()


# ---------------------------------------------------------------- translation
TOKEN = re.compile(r'(<!--.*?-->|<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', re.S)
missing = {}


def tr_text(t, page):
    core = t.strip()
    if core in EN:
        return t.replace(core, EN[core])
    if not core or not re.search(r'[A-Za-zÇçËë]{2,}', core):
        return t
    if core in EN:
        return t.replace(core, EN[core])
    if re.search(r'[ëçË]|\b(dhe|për|në|që|një|nga|të|me|jo|ose|tënd|tuaj|yt)\b', core):
        missing.setdefault(core, page)
    return t


def tr_tag(tag, page):
    def attr(m):
        name, val = m.group(1), m.group(2)
        if name in TRANSLATE_ATTRS:
            v = htmlmod.unescape(val)
            if v in EN:
                return f'{name}="{htmlmod.escape(EN[v], quote=True)}"'
            if re.search(r'[ëçË]', v):
                missing.setdefault(v, page)
        return m.group(0)
    if tag.startswith('<meta'):
        key = re.search(r'(?:name|property)="([^"]+)"', tag)
        if key and key.group(1) in META_KEYS:
            def c(m):
                v = htmlmod.unescape(m.group(1))
                if v in EN:
                    return f'content="{htmlmod.escape(EN[v], quote=True)}"'
                missing.setdefault(v, page)
                return m.group(0)
            return re.sub(r'content="([^"]*)"', c, tag)
        return tag
    return re.sub(r'\b([a-z-]+)="([^"]*)"', attr, tag)


def translate(s, page):
    parts = TOKEN.split(s)
    out = []
    in_title = False
    for p in parts:
        if not p:
            continue
        if p.startswith('<'):
            if p.startswith(('<!--', '<script', '<style')):
                out.append(p)
            else:
                out.append(tr_tag(p, page))
        else:
            out.append(tr_text(p, page))
    return ''.join(out)


def fix_paths_for_en(s, rel):
    """Page links stay (en/ mirrors the tree); assets get one more ../"""
    base = posixpath.dirname(rel)
    def f(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|#|data:|//|/)', url):
            return m.group(0)
        target = posixpath.normpath(posixpath.join(base, url))
        if target.startswith('assets/'):
            return f'{attr}="../{url}"' if url.startswith(('../', 'assets/')) else m.group(0)
        return m.group(0)
    return re.sub(r'\b(href|src)="([^"]*)"', f, s)


def absolutize(s, rel, lang):
    """404 pages are served at any URL depth, so links must be root-absolute."""
    base = posixpath.dirname(('en/' if lang == 'en' else '') + rel)
    def f(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'^(https?:|mailto:|tel:|#|data:|//|/)', url):
            return m.group(0)
        target = posixpath.normpath(posixpath.join(base, url))
        if target == '.':
            target = ''
        keep_slash = url.endswith('/') or url in ('./', '../')
        return f'{attr}="/{target}{"/" if keep_slash and target else ""}"'
    return re.sub(r'\b(href|src|data-redirect)="([^"]*)"', f, s)


# ---------------------------------------------------------------- SEO block
def org_node(lang):
    sq = lang == 'sq'
    return {
        '@type': ['ProfessionalService', 'LocalBusiness'],
        '@id': SITE + '/#org',
        'name': 'Rrjeti Agency',
        'alternateName': 'Rrjeti',
        'url': SITE + '/',
        'logo': SITE + '/assets/img/rrjeti-logo.webp',
        'image': SITE + '/assets/img/og/og-sq.jpg',
        'description': ('Agjencia e parë në Kosovë që ofron marketing me përqindje: reklama, përmbajtje, foto, video dhe website për 10% të qarkullimit bruto.'
                        if sq else 'The first agency in Kosovo to offer percentage-based marketing: ads, content, photo, video and website for 10% of gross revenue.'),
        'slogan': 'Ti rritesh. Ne marrim 10%.' if sq else 'You grow. We take 10%.',
        'telephone': '+38345775515',
        'email': 'yll@rrjetiagency.com',
        'address': {'@type': 'PostalAddress', 'streetAddress': 'Rr. Jakov Xoxa 113/3', 'addressLocality': 'Prishtinë' if sq else 'Prishtina',
                    'postalCode': '10000', 'addressCountry': 'XK'},
        'geo': {'@type': 'GeoCoordinates', 'latitude': 42.6481296, 'longitude': 21.1730162},
        'hasMap': MAP,
        'areaServed': {'@type': 'Country', 'name': 'Kosovo'},
        'knowsLanguage': ['sq', 'en'],
        'contactPoint': {'@type': 'ContactPoint', 'telephone': '+38345775515', 'contactType': 'sales', 'availableLanguage': ['Albanian', 'English']},
        'makesOffer': [
            {'@type': 'Offer', 'name': 'Marketing me 10%' if sq else 'Marketing for 10%',
             'description': ('Gjithë marketingu (reklama në Meta, përmbajtje, foto, video, website) për 10% të qarkullimit bruto mujor. Reklamat paguhen nga kjo shumë. Për biznese shërbimesh me 5.000 €+ qarkullim në muaj.'
                             if sq else 'All marketing (Meta ads, content, photo, video, website) for 10% of gross monthly revenue. Ads are paid from this amount. For service businesses with €5,000+ monthly revenue.')},
            {'@type': 'Offer', 'name': 'Çmim fiks mujor' if sq else 'Fixed monthly price',
             'description': 'Marketing me çmim fiks mujor për biznese me produkte ose nën 5.000 € qarkullim.' if sq else 'Marketing for a fixed monthly price for product businesses or those under €5,000 revenue.'},
        ],
    }


def seo_block(s, rel, lang):
    title, desc = get_title(s), get_desc(s)
    url = url_for(rel, lang)
    alt_sq, alt_en = url_for(rel, 'sq'), url_for(rel, 'en')
    img = f'{SITE}/assets/img/og/og-{lang}.jpg'
    robots = 'noindex, follow' if rel in NOINDEX else 'index, follow, max-image-preview:large, max-snippet:-1'
    inlang = 'sq-AL' if lang == 'sq' else 'en'
    graph = [org_node(lang),
             {'@type': 'WebSite', '@id': SITE + '/#website', 'url': SITE + '/', 'name': 'Rrjeti Agency', 'inLanguage': ['sq', 'en'], 'publisher': {'@id': SITE + '/#org'}},
             {'@type': 'WebPage', '@id': url + '#page', 'url': url, 'name': title, 'description': desc, 'inLanguage': inlang,
              'isPartOf': {'@id': SITE + '/#website'}, 'about': {'@id': SITE + '/#org'}, 'primaryImageOfPage': img, 'dateModified': TODAY}]
    # breadcrumbs
    if clean(rel):
        home = 'Ballina' if lang == 'sq' else 'Home'
        items = [{'@type': 'ListItem', 'position': 1, 'name': home, 'item': url_for('index.html', lang)}]
        parts = clean(rel).strip('/').split('/')
        if len(parts) == 2:
            items.append({'@type': 'ListItem', 'position': 2, 'name': 'Rastet' if lang == 'sq' else 'Case studies', 'item': url_for(parts[0] + '/index.html', lang)})
        items.append({'@type': 'ListItem', 'position': len(items) + 1, 'name': title.split(' · ')[0], 'item': url})
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': items})
    # FAQ
    qs = re.findall(r'<button class="faq-q"[^>]*><span>(.*?)</span>.*?<div class="faq-a"[^>]*>\s*<p>(.*?)</p>', s, re.S)
    if qs:
        graph.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': strip_tags(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip_tags(a)}} for q, a in qs]})
    # case studies
    if rel.startswith('rastet/') and rel != 'rastet/index.html':
        graph.append({'@type': 'Article', 'headline': title.split(' · ')[0], 'description': desc, 'inLanguage': inlang, 'url': url,
                      'image': img, 'author': {'@id': SITE + '/#org'}, 'publisher': {'@id': SITE + '/#org'}, 'dateModified': TODAY})
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    e = lambda x: htmlmod.escape(x, quote=True)
    loc, loc_alt = ('sq_AL', 'en_US') if lang == 'sq' else ('en_US', 'sq_AL')
    return f'''<!-- seo:start (generated by tools/build.py) -->
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="sq" href="{alt_sq}">
<link rel="alternate" hreflang="en" href="{alt_en}">
<link rel="alternate" hreflang="x-default" href="{alt_sq}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rrjeti Agency">
<meta property="og:locale" content="{loc}">
<meta property="og:locale:alternate" content="{loc_alt}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{img}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{img}">
<meta name="geo.region" content="XK">
<meta name="geo.placename" content="Prishtinë">
<meta name="geo.position" content="42.6481296;21.1730162">
<meta name="ICBM" content="42.6481296, 21.1730162">
<script type="application/ld+json">{ld}</script>
<!-- seo:end -->'''


def lang_switch(rel, lang):
    sq_href = rel_link(('en/' if lang == 'en' else '') + rel, clean(rel))
    en_href = rel_link(('en/' if lang == 'en' else '') + rel, 'en/' + clean(rel))
    label = 'Gjuha' if lang == 'sq' else 'Language'
    cur_sq = ' aria-current="true"' if lang == 'sq' else ''
    cur_en = ' aria-current="true"' if lang == 'en' else ''
    return (f'<div class="lang" role="group" aria-label="{label}"><a href="{sq_href}" hreflang="sq" lang="sq"{cur_sq}>SQ</a>'
            f'<a href="{en_href}" hreflang="en" lang="en"{cur_en}>EN</a></div>')


def finalize(s, rel, lang):
    s = re.sub(r'\n?<!-- seo:start.*?<!-- seo:end -->', '', s, flags=re.S)
    s = re.sub(r'\n?<!-- PREVIEW: remove the next line at launch -->', '', s)
    s = re.sub(r'\n?<meta name="robots"[^>]*>', '', s)
    s = re.sub(r'\n?<meta (?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>', '', s)
    s = re.sub(r'<html lang="[^"]*"', f'<html lang="{lang}"', s, count=1)
    s = re.sub(r'(<meta name="description"[^>]*>)', lambda m: m.group(1) + '\n' + seo_block(s, rel, lang), s, count=1)
    sw = lang_switch(rel, lang)
    # nav switcher (replace or add to minimal headers)
    if re.search(r'<div class="lang"[^>]*>.*?</div>', s, re.S):
        s = re.sub(r'<div class="lang"[^>]*>.*?</div>', sw, s, count=1, flags=re.S)
    else:
        s = s.replace('<div class="nav-right">', '<div class="nav-right">' + sw, 1)
    # switcher inside the mobile menu too (the nav one is hidden on phones)
    s = re.sub(r'<div class="lang m-lang"[^>]*>.*?</div>', '', s, flags=re.S)
    s = re.sub(r'(<div class="mobile-menu" id="mobile-menu">.*?)(</div>)', lambda m: m.group(1) + sw.replace('class="lang"', 'class="lang m-lang"') + m.group(2), s, count=1, flags=re.S)
    if rel == '404.html':
        s = absolutize(s, rel, lang)
    return s


# ---------------------------------------------------------------- run
def pages():
    for dp, dn, fn in os.walk(ROOT):
        dn[:] = [d for d in dn if d not in ('en', 'assets', '.git')]
        for f in fn:
            if f.endswith('.html'):
                yield posixpath.relpath(posixpath.join(dp.replace('\\', '/'), f), ROOT.replace('\\', '/'))


def main():
    built = []
    for rel in sorted(pages()):
        src = os.path.join(ROOT, rel)
        s = open(src, encoding='utf-8').read()
        s = re.sub(r'\n?<!-- seo:start.*?<!-- seo:end -->', '', s, flags=re.S)
        sq = finalize(s, rel, 'sq')
        open(src, 'w', encoding='utf-8').write(sq)
        en = translate(s, rel)
        en = fix_paths_for_en(en, rel)
        en = en.replace('!1ssq!2s', '!1sen!2s')  # map labels in English
        en = finalize(en, rel, 'en')
        out = os.path.join(ROOT, 'en', rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(en)
        built.append(rel)

    # sitemap with hreflang pairs
    urls = []
    for rel in built:
        if rel in NOINDEX:
            continue
        pri = '1.0' if rel == 'index.html' else ('0.9' if rel.count('/') == 1 and 'rastet' not in rel else '0.8')
        for lang in ('sq', 'en'):
            urls.append(f'''  <url><loc>{url_for(rel, lang)}</loc><lastmod>{TODAY}</lastmod><priority>{pri if lang == 'sq' else str(round(float(pri) - 0.1, 1))}</priority>
    <xhtml:link rel="alternate" hreflang="sq" href="{url_for(rel, 'sq')}"/>
    <xhtml:link rel="alternate" hreflang="en" href="{url_for(rel, 'en')}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="{url_for(rel, 'sq')}"/></url>''')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + '\n'.join(urls) + '\n</urlset>\n')
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(
        'User-agent: *\nAllow: /\nDisallow: /faleminderit/\nDisallow: /en/faleminderit/\n\n'
        '# AI assistants and answer engines are welcome to read and cite this site\n'
        + ''.join(f'User-agent: {b}\nAllow: /\n\n' for b in ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bingbot'])
        + f'Sitemap: {SITE}/sitemap.xml\n')
    open(os.path.join(ROOT, 'CNAME'), 'w').write('rrjetiagency.com\n')
    open(os.path.join(ROOT, '.nojekyll'), 'w').write('')
    print(f'built {len(built)} pages x 2 languages, sitemap with {len(urls)} URLs')
    if missing:
        print(f'\n{len(missing)} Albanian segments have no English yet (add them to tools/en.json):')
        for k, v in missing.items():
            print(f'  [{v}] {k}')


if __name__ == '__main__':
    main()
