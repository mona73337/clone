#!/usr/bin/env python3
"""Merge the curated catalog with GitHub snapshot stats -> app assets catalog.json.

Sources (all fetched over git from public GitHub repos, see README):
  raw/github-ranking-*.csv      EvanLi/Github-Ranking daily top-100 lists (stars, forks, language)
  .cache/ash (or raw/ash_subset.json)  awesome-selfhosted-data metadata (stars, license, latest release)
  raw/probe.jsonl               HEAD commit date + fastlane asset paths per repo
  raw/tags.tsv                  most recent tags by creation date per repo
"""
import csv, json, os, re, sys, glob
import yaml
from catalog_src import APPS, CATS, ORDER

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'app', 'src', 'main', 'assets', 'www', 'data', 'catalog.json')
import datetime as _dt

def _rank_days():
    days = sorted(f[len('github-ranking-'):-4] for f in os.listdir(os.path.join(HERE, 'raw')) if f.startswith('github-ranking-'))
    latest = days[-1]
    d0 = _dt.date.fromisoformat(latest)
    def near(n):
        want = (d0 - _dt.timedelta(days=n)).isoformat()
        older = [d for d in days if d <= want]
        return older[-1] if older else None
    return latest, near(7), near(30)

SNAPSHOT, _WEEK, _MONTH = _rank_days()

def load_rank(day):
    p = os.path.join(HERE, 'raw', f'github-ranking-{day}.csv')
    d = {}
    if not os.path.exists(p): return d
    for r in csv.DictReader(open(p)):
        k = r['repo_url'].split('github.com/')[1].lower()
        d[k] = r
    return d

rank_now, rank_w, rank_m = load_rank(SNAPSHOT), load_rank(_WEEK) if _WEEK else {}, load_rank(_MONTH) if _MONTH else {}

ash = {}
ash_dir = os.path.join(HERE, '.cache', 'ash', 'software')
cache = os.path.join(HERE, 'raw', 'ash_subset.json')
if os.path.isdir(ash_dir):
    for f in glob.glob(os.path.join(ash_dir, '*.yml')):
        y = yaml.safe_load(open(f))
        u = (y.get('source_code_url') or '').rstrip('/')
        if 'github.com/' in u:
            ash[u.split('github.com/')[1].lower()] = y
probe = {json.loads(l)['repo'].lower(): json.loads(l) for l in open(os.path.join(HERE, 'raw', 'probe.jsonl'))}
tags = {}
for line in open(os.path.join(HERE, 'raw', 'tags.tsv')):
    repo, _, rest = line.rstrip('\n').partition('\t')
    tags[repo.lower()] = [t.split('|') for t in rest.split(';') if '|' in t]

PRE = re.compile(r'(alpha|beta|rc\d*|-rc|nightly|dev|snapshot|canary|preview|test|pre\b|unstable)', re.I)
NOISE = re.compile(r'^(@|chart-|nightly|latest|api\d|lluis-|support-|visual-|windows-|ios-|mac|tuta-|remoteaccess|f-droid$|fdroid|wear-|locker-|desktop-|web-|auth-)', re.I)

needed = set()
for a in APPS:
    for t in a[5]: needed.add(t[0].lower())
json.dump({k: v for k, v in ash.items() if k in needed}, open(cache, 'w'), default=str, indent=0) if ash else None
if not ash and os.path.exists(cache):
    ash = json.load(open(cache))

OVERRIDE = {  # hand-checked against the tag lists in raw/tags.tsv
  'danny-avila/librechat': ('v0.8.8', '2026-09-30'),
  'tutao/tutanota': ('361.261006.0', '2026-10-06'),
  'lawnchairlauncher/lawnchair': ('v15.0.0-beta3.0', '2026-04-11'),
  'uazo/cromite': ('v153.0.8010.37', '2026-09-14'),
  'libreoffice/core': ('26.2.7.1', '2026-10-12'),
  'streetwriters/notesnook': ('3.4.14', '2026-10-08'),
  'organicmaps/organicmaps': ('2026.09.29', '2026-09-29'),
  'lobehub/lobehub': ('v2.2.19', '2026-10-07'),
  'toeverything/affine': ('v0.27.4', '2026-08-17'),
  'firefly-iii/firefly-iii': ('v6.7.9', '2026-10-11'),
  'crackededed/xtra': None, 'osmandapp/osmand': None, 'librelingo/librelingo': None,
}

def release_for(repo):
    k = repo.lower()
    if k in OVERRIDE:
        o = OVERRIDE[k]
        return {'tag': o[0], 'date': o[1]} if o else None
    a = ash.get(k)
    if a and a.get('current_release') and not PRE.search(str(a['current_release']['tag'])):
        cr = a['current_release']
        return {'tag': str(cr['tag']), 'date': str(cr['published_at'])[:10]}
    cands = tags.get(k, [])
    good = [t for t in cands if not PRE.search(t[0]) and not NOISE.search(t[0])]
    pick = (good or [t for t in cands if not NOISE.search(t[0])] or [None])[0]
    if not pick: return None
    return {'tag': pick[0], 'date': pick[1][:10]}

def stats(repo):
    k = repo.lower()
    s = {'stars': None, 'forks': None, 'lang': None, 'license': None, 'archived': False, 'pushed': None}
    r = rank_now.get(k)
    if r:
        s['stars'] = int(r['stars']); s['forks'] = int(r['forks']); s['lang'] = r['language'] or None
        w = rank_w.get(k); m = rank_m.get(k)
        if w: s['wk'] = int(r['stars']) - int(w['stars'])
        if m: s['mo'] = int(r['stars']) - int(m['stars'])
    a = ash.get(k)
    if a:
        if s['stars'] is None and a.get('stargazers_count') is not None: s['stars'] = int(a['stargazers_count'])
        lic = a.get('licenses') or []
        if lic: s['license'] = lic[0]
        s['archived'] = bool(a.get('archived'))
        if not s['lang']:
            pl = a.get('platforms') or []
            if pl: s['lang'] = pl[0]
    p = probe.get(k)
    if p:
        s['pushed'] = p['head'][:10]
        files = p['files']
        icon = [f for f in files if re.search(r'/images/icon\.(png|jpe?g|webp)$', f)]
        shots = sorted([f for f in files if '/phoneScreenshots/' in f])[:8]
        feat = [f for f in files if re.search(r'/images/featureGraphic\.(png|jpe?g|webp)$', f)]
        if icon: s['icon'] = icon[0]
        if shots: s['shots'] = shots
        if feat: s['feature'] = feat[0]
        s['branch'] = None
    rel = release_for(repo)
    if rel: s['release'] = rel
    return {k2: v for k2, v in s.items() if v not in (None, False, [])}

# default branches (from ls-remote --symref)
branches = {}
st = os.path.join(HERE, '.cache', 'status.txt')
if os.path.exists(st):
    for line in open(st):
        parts = line.split()
        if parts[0] == 'OK' and len(parts) >= 3: branches[parts[1].lower()] = parts[2]
    json.dump(branches, open(os.path.join(HERE, 'raw', 'branches.json'), 'w'))
else:
    branches = json.load(open(os.path.join(HERE, 'raw', 'branches.json')))

rank = {aid: i + 1 for i, aid in enumerate(ORDER)}
apps = []
for (aid, name, maker, cat, blurb, twins) in APPS:
    tw = []
    for (repo, tname, tagline, kind, perks) in twins:
        t = {'repo': repo, 'name': tname, 'tagline': tagline, 'kind': kind, 'perks': perks}
        t.update(stats(repo))
        b = branches.get(repo.lower())
        if b: t['branch'] = b
        tw.append(t)
    apps.append({'id': aid, 'name': name, 'maker': maker, 'cat': cat, 'blurb': blurb, 'rank': rank[aid], 'twins': tw})
apps.sort(key=lambda a: a['rank'])
out = {'snapshot': SNAPSHOT, 'cats': [{'id': c, 'name': n} for c, n in CATS], 'apps': apps}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
n_tw = sum(len(a['twins']) for a in apps)
n_star = sum(1 for a in apps for t in a['twins'] if 'stars' in t)
n_rel = sum(1 for a in apps for t in a['twins'] if 'release' in t)
print(f'apps={len(apps)} twins={n_tw} with_stars={n_star} with_release={n_rel} -> {os.path.relpath(OUT)} {os.path.getsize(OUT)//1024}KB')
