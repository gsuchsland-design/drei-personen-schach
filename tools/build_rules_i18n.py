"""Erzeugt die übersetzten Regelseiten <sprache>/<seite>.html aus den deutschen Seiten.
Übersetzungen: tools/site_lang/<sprache>.py mit D (deutscher Abschnitt → Übersetzung) und U (Kopf/Fuß).
Aufruf: python3 tools/build_rules_i18n.py  (wird auch am Ende von build_site.py aufgerufen)."""
import os, re, sys, importlib.util, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from site_seg import PAGES, main_of, meta_of, segments, apply
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = [('de', 'Deutsch'), ('en', 'English'), ('fr', 'Français'), ('es', 'Español'), ('it', 'Italiano'), ('pt', 'Português'),
         ('nl', 'Nederlands'), ('pl', 'Polski'), ('tr', 'Türkçe'), ('ru', 'Русский'), ('uk', 'Українська'), ('zh', '中文'), ('ja', '日本語'), ('ko', '한국어'), ('th', 'ไทย'), ('ar', 'العربية'), ('is', 'Íslenska'), ('da', 'Dansk')]
GAMES = ('spiel.html', 'raum.html', 'grenzenlos.html')

def german_segments():
    seen = []
    for f in PAGES:
        h = open(os.path.join(ROOT, f), encoding='utf-8').read()
        for s in list(meta_of(h)) + segments(main_of(h)):
            if s not in seen: seen.append(s)
    return seen

def tags(s): return collections.Counter(re.findall(r'<[^>]+>', s))

def load(lang):
    p = os.path.join(ROOT, 'tools', 'site_lang', lang + '.py')
    if not os.path.exists(p): return None
    spec = importlib.util.spec_from_file_location('l_' + lang, p); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def switcher(cur, fn, depth):
    opts = ''
    for code, name in LANGS:
        if code != 'de' and not os.path.exists(os.path.join(ROOT, 'tools', 'site_lang', code + '.py')): continue
        if code == 'de': href = ('../' if depth else '') + fn
        else: href = (('../' if depth else '') + code + '/' + fn) if code != cur else fn
        if code == cur: href = fn
        opts += f'<option value="{href}"{" selected" if code == cur else ""}>{name}</option>'
    return f'<select class="lang" aria-label="Sprache" onchange="location.href=this.value">{opts}</select>'

def alternates(fn):   # erst mit eigener Domain (CNAME), wie die kanonischen Adressen
    if not os.path.exists(os.path.join(ROOT, 'CNAME')): return ''
    dom = open(os.path.join(ROOT, 'CNAME')).read().strip()
    out = f'<link rel="alternate" hreflang="de" href="https://{dom}/{fn}">\n'
    for code, _ in LANGS[1:]: out += f'<link rel="alternate" hreflang="{code}" href="https://{dom}/{code}/{fn}">\n'
    return out

def relink(html):
    def fix(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'(https?:|#|/|\.\./|mailto:|data:)', url): return m.group(0)
        if url.split('#')[0].split('?')[0] in PAGES: return m.group(0)
        return f'{attr}="../{url}"'
    return re.sub(r'\b(href|src|content)="([^"]*?\.(?:html|png|webp|jpg|css|webmanifest|svg)(?:\?[^"#]*)?(?:#[^"]*)?)"', fix, html)

def run():
    segs = german_segments(); bad = 0
    for f in PAGES:   # deutsche Seiten: Sprachwahl + hreflang
        p = os.path.join(ROOT, f); h = open(p, encoding='utf-8').read()
        if 'class="lang"' not in h:
            h = h.replace('</nav>', '</nav>' + switcher('de', f, 0), 1).replace('</head>', alternates(f) + '</head>', 1)
            open(p, 'w', encoding='utf-8').write(h)
    for code, _ in LANGS[1:]:
        m = load(code)
        if not m: print(code, 'fehlt'); continue
        # D: deutscher Abschnitt → Übersetzung. Fehlt ein Abschnitt, bleibt er vorerst deutsch (wird gemeldet).
        miss = [x for x in segs if x not in m.D]
        if miss: print(code, len(miss), 'Abschnitte noch ohne Übersetzung, z. B.:', miss[0][:70])
        tr = {x: m.D.get(x, x) for x in segs}
        for de, x in tr.items():
            if tags(de) != tags(x): print(code, 'Tags weichen ab:', de[:60], '|', x[:60]); bad += 1
        os.makedirs(os.path.join(ROOT, code), exist_ok=True)
        for f in PAGES:
            h = open(os.path.join(ROOT, f), encoding='utf-8').read()
            t, d = meta_of(h); body = main_of(h)
            h = h.replace(body, apply(body, tr))
            h = h.replace(f'<title>{t}</title>', f'<title>{tr[t]}</title>').replace(f'content="{d}"', f'content="{tr[d]}"').replace(f'content="{t}"', f'content="{tr[t]}"')
            h = h.replace('<html lang="de">', f'<html lang="{code}"' + (' dir="rtl"' if code == 'ar' else '') + '>')
            h = re.sub(r'<select class="lang".*?</select>', lambda _: switcher(code, f, 1), h, flags=re.S)
            for de, x in sorted(m.U.items(), key=lambda kv: -len(kv[0])):
                h = re.sub(r'(<a[^>]*>(?:<img[^>]*>)?)' + re.escape(de) + '</a>', lambda mm: mm.group(1) + x + '</a>', h)
            h = relink(h)
            h = h.replace('</body>', "<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');"
                          f"if(a&&/(spiel|raum|grenzenlos|stern)\\.html/.test(a.getAttribute('href')||''))try{{localStorage.setItem('dreiSchach.lang','{code}')}}catch(_){{}}}});</script>\n</body>")
            open(os.path.join(ROOT, code, f), 'w', encoding='utf-8').write(h)
    print('Regelseiten übersetzt' + (f' – {bad} Fehler' if bad else ''))

if __name__ == '__main__': run()
