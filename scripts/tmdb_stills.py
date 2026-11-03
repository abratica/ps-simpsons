#!/usr/bin/env python3
"""Fill each episode's "tmdbStill" from the TMDB API.

Usage:
  TMDB_API_KEY=xxxx python3 scripts/tmdb_stills.py s01e01        # one or more episodes
  TMDB_API_KEY=xxxx python3 scripts/tmdb_stills.py --all         # every file in episodes/
  Add --force to overwrite a value that's already set.

Auth: set TMDB_API_KEY (the v3 "API Key") or TMDB_READ_TOKEN (the "API Read Access Token").
Both are on https://www.themoviedb.org/settings/api. Never commit either one.

The script only edits the "tmdbStill" line, so the rest of the file's formatting is untouched.
The app builds the image URL itself (https://image.tmdb.org/t/p/<size><still_path>).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

SERIES_ID = 456  # The Simpsons on TMDB
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP_DIR = os.path.join(ROOT, "episodes")


def tmdb_get(path):
    key = os.environ.get("TMDB_API_KEY")
    token = os.environ.get("TMDB_READ_TOKEN")
    if not key and not token:
        sys.exit("Set TMDB_API_KEY or TMDB_READ_TOKEN first.")
    url = "https://api.themoviedb.org/3" + path
    headers = {"Accept": "application/json", "User-Agent": "ps-simpsons-stills"}
    if token:
        headers["Authorization"] = "Bearer " + token
    else:
        url += "?" + urllib.parse.urlencode({"api_key": key})
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def set_still(path, still_path):
    text = open(path, encoding="utf-8").read()
    value = json.dumps(still_path)
    if re.search(r'^  "tmdbStill": .*?,$', text, re.M):
        new = re.sub(r'^  "tmdbStill": .*?,$', '  "tmdbStill": ' + value + ",", text, count=1, flags=re.M)
    else:
        new, n = re.subn(r'^(  "still": .*?,)$', r'\1\n  "tmdbStill": ' + value.replace("\\", "\\\\") + ",",
                         text, count=1, flags=re.M)
        if n != 1:
            raise ValueError('no top-level "still" line to anchor on')
    json.loads(new)  # refuse to write a broken file
    open(path, "w", encoding="utf-8").write(new)


def main(argv):
    force = "--force" in argv
    ids = [a for a in argv if not a.startswith("--")]
    if "--all" in argv:
        ids = sorted(f[:-5] for f in os.listdir(EP_DIR) if re.fullmatch(r"s\d{2}e\d{2}\.json", f))
    if not ids:
        sys.exit(__doc__)
    failed = 0
    for ep_id in ids:
        path = os.path.join(EP_DIR, ep_id + ".json")
        try:
            ep = json.load(open(path, encoding="utf-8"))
            if ep.get("tmdbStill") and not force:
                print(f"{ep_id}: already set ({ep['tmdbStill']}), skipping")
                continue
            data = tmdb_get(f"/tv/{SERIES_ID}/season/{ep['season']}/episode/{ep['episode']}")
            still = data.get("still_path")
            if not still:
                print(f"{ep_id}: TMDB has no still for this episode")
                continue
            set_still(path, still)
            print(f"{ep_id}: {still}  (TMDB title: {data.get('name')})")
        except (OSError, ValueError, urllib.error.URLError) as e:
            failed += 1
            print(f"{ep_id}: failed: {e}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
