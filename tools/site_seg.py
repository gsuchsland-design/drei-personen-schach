"""Zerlegt die Regelseiten in übersetzbare Abschnitte (gemeinsam genutzt von Extraktion und Seitenbau)."""
import re
PAGES = ['regeln.html', 'reiche-regeln.html', 'grenzenlos-regeln.html']
BLOCK = re.compile(r'<(h1|h2|h3|p|li|figcaption)(\s[^>]*)?>(.*?)</\1>', re.S)
ALT = re.compile(r'alt="([^"]+)"')
def main_of(html):
    return html[html.index('<main>') + 6:html.index('</main>')]
def meta_of(html):
    t = re.search(r'<title>(.*?)</title>', html).group(1)
    d = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
    return t, d
def segments(body):
    out = []
    for m in BLOCK.finditer(body):
        s = m.group(3).strip()
        if s and re.search(r'[A-Za-zÄÖÜäöüß]', re.sub('<[^>]+>', '', s)): out.append(s)
    out += [a for a in ALT.findall(body)]
    return out
def apply(body, tr):
    def blk(m):
        s = m.group(3).strip()
        return m.group(0) if s not in tr else f'<{m.group(1)}{m.group(2) or ""}>{tr[s]}</{m.group(1)}>'
    body = BLOCK.sub(blk, body)
    return ALT.sub(lambda m: f'alt="{tr.get(m.group(1), m.group(1))}"', body)
