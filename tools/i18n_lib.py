"""Shared helpers: find translatable text in the Albanian pages.

A "segment" is a visible text node (whitespace-trimmed) or the value of
alt / placeholder / aria-label / title / meta description-style attributes.
"""
import re
from html.parser import HTMLParser

ATTRS = ('alt', 'placeholder', 'aria-label', 'title', 'aria-valuetext', 'label')
META_NAMES = ('description', 'og:title', 'og:description', 'twitter:title', 'twitter:description', 'og:image:alt')
HAS_WORD = re.compile(r'[A-Za-zÇçËë]{2,}')


def wanted(text):
    return bool(text and HAS_WORD.search(text))


class Collector(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'svg'):
            self.skip += 1 if tag != 'svg' or True else 0
        a = dict(attrs)
        if tag == 'meta':
            key = a.get('name') or a.get('property')
            if key in META_NAMES and wanted(a.get('content')):
                self.out.append(a['content'])
            return
        for k in ATTRS:
            v = a.get(k)
            if v and wanted(v) and not v.startswith(('http', '#', '+')):
                self.out.append(v)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag in ('script', 'style', 'svg'):
            self.skip -= 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'svg'):
            self.skip -= 1

    def handle_data(self, data):
        if self.skip:
            return
        s = data.strip()
        if wanted(s):
            self.out.append(s)


def segments(html):
    c = Collector()
    c.feed(html)
    return c.out
