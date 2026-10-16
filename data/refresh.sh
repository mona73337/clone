#!/usr/bin/env bash
# Refreshes the bundled catalog snapshot from public GitHub data (git only — no API token needed):
#   • star counts from EvanLi/Github-Ranking (daily top-100 lists per language)
#   • stars/licences/releases from awesome-selfhosted/awesome-selfhosted-data
#   • for every twin repo: default branch, last commit, recent tags, fastlane icon/screenshot paths
# Then rebuilds app/src/main/assets/www/data/catalog.json.
set -euo pipefail
cd "$(dirname "$0")"
C=.cache; mkdir -p "$C" raw
P=${PARALLEL:-8}

echo "› ranking data"
if [ ! -d "$C/ranking" ]; then git clone -q --depth 1 --filter=blob:none --no-checkout https://github.com/EvanLi/Github-Ranking "$C/ranking"; fi
git -C "$C/ranking" fetch -q --depth 1 origin HEAD && git -C "$C/ranking" reset -q --soft FETCH_HEAD
latest=$(git -C "$C/ranking" ls-tree --name-only HEAD Data/ | sort | tail -1)
d0=$(basename "$latest" .csv | sed 's/github-ranking-//')
for n in 0 7 30; do
  d=$(date -d "$d0 -$n days" +%F); f="Data/github-ranking-$d.csv"
  git -C "$C/ranking" checkout HEAD -- "$f" 2>/dev/null && cp "$C/ranking/$f" raw/ || echo "  (no ranking file for $d)"
done
ls raw/github-ranking-*.csv | head -n -3 | xargs -r rm -f 2>/dev/null || true

echo "› awesome-selfhosted-data"
rm -rf "$C/ash" && git clone -q --depth 1 https://github.com/awesome-selfhosted/awesome-selfhosted-data "$C/ash"

echo "› twin repositories"
python3 -c "
import catalog_src as c
print('\n'.join(sorted({t[0] for a in c.APPS for t in a[5]})))" > "$C/repos.txt"
: > "$C/status.txt"; : > raw/probe.jsonl; : > raw/tags.tsv
probe() {
  r="$1"; d="$C/clones/${r//\//__}"; rm -rf "$d"; mkdir -p "$d"
  head=$(timeout 30 git ls-remote --symref "https://github.com/$r" HEAD 2>/dev/null | awk '/^ref:/{sub("refs/heads/","",$2); print $2}')
  [ -z "$head" ] && { echo "FAIL $r" >> "$C/status.txt"; return; }
  echo "OK $r $head" >> "$C/status.txt"
  ( cd "$d" && git init -q . && git remote add origin "https://github.com/$r" \
    && timeout 120 git fetch -q --depth 1 --filter=blob:none origin HEAD \
    && files=$(git ls-tree -r --name-only FETCH_HEAD | grep -E '^fastlane/metadata/android/en-US/images/' | head -40 | tr '\n' '|') \
    && python3 -c "import json,sys; print(json.dumps({'repo':sys.argv[1],'head':sys.argv[2],'sha':sys.argv[3],'files':[f for f in sys.argv[4].split('|') if f],'tag':'','tagdate':''}))" \
         "$r" "$(git log -1 --format=%cI FETCH_HEAD)" "$(git rev-parse FETCH_HEAD)" "$files" >> "$OLDPWD/raw/probe.jsonl" \
    && timeout 150 git fetch -q --depth 1 --filter=tree:0 --no-tags origin '+refs/tags/*:refs/tags/*' 2>/dev/null; \
    printf '%s\t%s\n' "$r" "$(git for-each-ref --sort=-creatordate --count=12 --format='%(refname:short)|%(creatordate:iso-strict)' refs/tags | tr '\n' ';')" >> "$OLDPWD/raw/tags.tsv" ) || true
  rm -rf "$d"
}
export -f probe; export C
xargs -P "$P" -I{} bash -c 'probe {}' < "$C/repos.txt"
grep -c '^OK' "$C/status.txt" | sed 's/^/  reachable repos: /'
grep '^FAIL' "$C/status.txt" || true

echo "› catalog"
python3 build_catalog.py
