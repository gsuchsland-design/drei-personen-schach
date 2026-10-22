#!/usr/bin/env python3
"""Vor jeder Veröffentlichung ausführen: python3 tools/release.py
Setzt einen neuen Versionsstand (Datum und Uhrzeit, Berlin) in version.json, im Skript-Tag von lib/update.js
auf allen Seiten und in APP_VER (spiel.html). So erkennen alte, zwischengespeicherte Seiten, dass es eine neuere gibt,
und zeigen unten „🆕 Neue Version“ an."""
import glob, json, os, re, datetime
from zoneinfo import ZoneInfo
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
stamp = datetime.datetime.now(ZoneInfo('Europe/Berlin')).strftime('%Y-%m-%d %H:%M')
json.dump({'v': stamp}, open('version.json', 'w', encoding='utf-8'), ensure_ascii=False)
n = 0
for f in sorted(glob.glob('*.html') + glob.glob('*/*.html')):
    if f.split('/')[0] in ('tools', 'server', 'img', 'lib'): continue
    s = open(f, encoding='utf-8').read()
    if '</body>' not in s: continue
    pre = '../' if '/' in f else ''
    tag = f'<script src="{pre}lib/update.js?v={stamp.replace(" ", "_")}" data-v="{stamp}"></script>'
    s2 = re.sub(r'<script src="(\.\./)?lib/update\.js[^"]*"[^>]*></script>', tag, s)
    if s2 == s and 'lib/update.js' not in s: s2 = s.replace('</body>', tag + '\n</body>', 1)
    s2 = re.sub(r"^const APP_VER='[^']*'", f"const APP_VER='{stamp}'", s2, flags=re.M)
    if s2 != s: open(f, 'w', encoding='utf-8').write(s2); n += 1
print('Version', stamp, '–', n, 'Seiten aktualisiert')
