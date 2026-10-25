#!/usr/bin/env python3
"""
publish_day.py - render one daily report page, update reports.json, and push to GitHub Pages.

USAGE
    python3 tools/publish_day.py CONTENT.json [--date YYYY-MM-DD] [--no-push]

    --date     defaults to "today" in America/New_York.
    --no-push  render + update files only (no git commit/push).

Idempotent: re-running for the same date overwrites that day's page and its reports.json entry.
The content file is copied to content/<date>.json, and ALL day pages are re-rendered from
content/*.json so prev/next links stay correct everywhere.

CONTENT JSON SCHEMA  (every {"en","zh"} pair is required; text is plain text, blank line = new paragraph)
{
  "title":   {"en": "Short headline for the day", "zh": "当天的简短标题"},
  "intro":   {"en": "Optional one-line intro",    "zh": "可选的一句话导语"},          # optional
  "ai_news": {
      "title":       {"en": "...", "zh": "..."},
      "body":        {"en": "Plain-words explanation", "zh": "通俗解释"},
      "why":         {"en": "Why it matters",          "zh": "为什么重要"},
      "source_url":  "https://...",
      "source_name": "OpenAI"                       # optional, shown as link text
  },
  "blog_pick": {
      "title":       {"en": "...", "zh": "..."},
      "body":        {"en": "Teaser: what you'll learn", "zh": "看点"},
      "source_url":  "https://...",
      "source_name": "Bartosz Ciechanowski"         # optional
  },
  "learn": {
      "title":       {"en": "...", "zh": "..."},
      "body":        {"en": "Simple explanation", "zh": "简单解释"},
      "source_url":  "https://...",
      "source_name": "Wikipedia"                    # optional
  }
}
reports.json entries: {"date": "YYYY-MM-DD", "title_en": ..., "title_zh": ...}, sorted by date.
"""
import argparse, datetime, html, json, os, re, shutil, subprocess, sys, time
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS = os.path.join(ROOT, "days")
CONTENT = os.path.join(ROOT, "content")
REPORTS = os.path.join(ROOT, "reports.json")
SITE = "https://absurdwall.github.io/daily/"

SECTIONS = [
    ("ai_news",   {"en": "AI news",         "zh": "AI 新闻"}),
    ("blog_pick", {"en": "Blog pick",       "zh": "好文推荐"}),
    ("learn",     {"en": "Learn something", "zh": "涨知识"}),
]
UI = {
    "why":    {"en": "Why it matters",   "zh": "为什么重要"},
    "source": {"en": "Source",           "zh": "来源"},
    "read":   {"en": "Read it",          "zh": "去阅读"},
    "back":   {"en": "← Calendar",       "zh": "← 日历"},
    "prev":   {"en": "← Previous day",   "zh": "← 前一天"},
    "next":   {"en": "Next day →",       "zh": "后一天 →"},
}

def die(msg):
    print("ERROR:", msg, file=sys.stderr); sys.exit(1)

def pair(obj, path, required=True):
    if obj is None:
        if required: die(f"missing {path}")
        return None
    if not isinstance(obj, dict) or not str(obj.get("en", "")).strip() or not str(obj.get("zh", "")).strip():
        die(f"{path} must be an object with non-empty 'en' and 'zh'")
    return obj

def validate(c):
    pair(c.get("title"), "title")
    if c.get("intro") is not None: pair(c["intro"], "intro")
    for key, _ in SECTIONS:
        s = c.get(key)
        if not isinstance(s, dict): die(f"missing section {key}")
        pair(s.get("title"), f"{key}.title"); pair(s.get("body"), f"{key}.body")
        if key == "ai_news": pair(s.get("why"), "ai_news.why")
        u = s.get("source_url", "")
        if not re.match(r"^https?://", str(u)): die(f"{key}.source_url must be an http(s) URL")

def paras(text):
    parts = [p.strip() for p in re.split(r"\n\s*\n", str(text)) if p.strip()]
    return "".join(f"<p>{html.escape(p).replace(chr(10), '<br>')}</p>" for p in parts)

def bi(p, tag="span", block=False):
    """Bilingual element pair. block=True renders paragraphs."""
    if block:
        return (f'<div data-lang="en">{paras(p["en"])}</div>'
                f'<div data-lang="zh" hidden>{paras(p["zh"])}</div>')
    return (f'<{tag} data-lang="en">{html.escape(p["en"])}</{tag}>'
            f'<{tag} data-lang="zh" hidden>{html.escape(p["zh"])}</{tag}>')

def render(date, c, prev_d, next_d):
    d = datetime.date.fromisoformat(date)
    date_pair = {"en": d.strftime("%A, %B ") + str(d.day) + d.strftime(", %Y"),
                 "zh": f"{d.year}年{d.month}月{d.day}日 星期" + "一二三四五六日"[d.weekday()]}
    cards = []
    for key, label in SECTIONS:
        s = c[key]
        url = html.escape(s["source_url"], quote=True)
        name = html.escape(s.get("source_name") or re.sub(r"^https?://(www\.)?", "", s["source_url"]).split("/")[0])
        why = ""
        if key == "ai_news":
            why = f'<div class="why"><strong>{bi(UI["why"])}</strong>{bi(s["why"], block=True)}</div>'
        cards.append(f'''
  <section class="card" id="{key}">
    <span class="tag">{bi(label)}</span>
    <h2><a href="{url}" target="_blank" rel="noopener">{bi(s["title"])}</a></h2>
    {bi(s["body"], block=True)}
    {why}
    <p class="src">{bi(UI["source"])}: <a href="{url}" target="_blank" rel="noopener">{name} ↗</a></p>
  </section>''')
    nav_prev = (f'<a href="{prev_d}.html">{bi(UI["prev"])}</a>' if prev_d
                else f'<span class="disabled">{bi(UI["prev"])}</span>')
    nav_next = (f'<a href="{next_d}.html">{bi(UI["next"])}</a>' if next_d
                else f'<span class="disabled">{bi(UI["next"])}</span>')
    intro = f'<div class="sub">{bi(c["intro"], block=True)}</div>' if c.get("intro") else ""
    title_text = html.escape(f'{date} · {c["title"]["en"]}')
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title_text}</title>
<link rel="stylesheet" href="../style.css">
<script src="../lang.js"></script>
</head>
<body>
<div class="wrap">
  <header class="top">
    <a class="brand" href="../index.html">{bi(UI["back"])}</a>
    <button class="lang-toggle" type="button">中文</button>
  </header>
  <p class="sub" style="margin:0">{bi(date_pair)}</p>
  <h1>{bi(c["title"])}</h1>
  {intro}
{"".join(cards)}
  <nav class="daynav">{nav_prev}<a href="../index.html">{bi({"en": "Calendar", "zh": "日历"})}</a>{nav_next}</nav>
  <footer>absurdwall.github.io/daily</footer>
</div>
</body>
</html>
'''

def git(*args, check=True):
    print("+ git", " ".join(args))
    return subprocess.run(["git", "-C", ROOT, *args], check=check, text=True, capture_output=False)

def main():
    ap = argparse.ArgumentParser(description="Publish a daily report page.")
    ap.add_argument("content")
    ap.add_argument("--date", default=datetime.datetime.now(ZoneInfo("America/New_York")).date().isoformat())
    ap.add_argument("--no-push", action="store_true")
    a = ap.parse_args()
    try:
        datetime.date.fromisoformat(a.date)
    except ValueError:
        die("--date must be YYYY-MM-DD")
    with open(a.content, encoding="utf-8") as f:
        c = json.load(f)
    validate(c)

    os.makedirs(DAYS, exist_ok=True); os.makedirs(CONTENT, exist_ok=True)
    if not a.no_push:
        git("pull", "--rebase", "--autostash", "origin", "main", check=False)
    dst = os.path.join(CONTENT, f"{a.date}.json")
    if os.path.abspath(a.content) != os.path.abspath(dst):
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(c, f, ensure_ascii=False, indent=2); f.write("\n")

    # reports.json upsert
    reports = []
    if os.path.exists(REPORTS):
        try:
            with open(REPORTS, encoding="utf-8") as f: reports = json.load(f)
        except Exception:
            reports = []
    reports = [r for r in reports if r.get("date") != a.date]
    reports.append({"date": a.date, "title_en": c["title"]["en"], "title_zh": c["title"]["zh"]})
    # keep only entries that have content (or an existing page)
    reports = [r for r in reports if os.path.exists(os.path.join(CONTENT, r["date"] + ".json"))
               or os.path.exists(os.path.join(DAYS, r["date"] + ".html"))]
    reports.sort(key=lambda r: r["date"])
    with open(REPORTS, "w", encoding="utf-8") as f:
        json.dump(reports, f, ensure_ascii=False, indent=2); f.write("\n")

    # re-render every day that has content, so prev/next links are consistent
    dates = [r["date"] for r in reports]
    for i, dd in enumerate(dates):
        cp = os.path.join(CONTENT, dd + ".json")
        if not os.path.exists(cp): continue
        with open(cp, encoding="utf-8") as f: cc = json.load(f)
        page = render(dd, cc, dates[i-1] if i > 0 else None, dates[i+1] if i + 1 < len(dates) else None)
        with open(os.path.join(DAYS, dd + ".html"), "w", encoding="utf-8") as f: f.write(page)
    print(f"Rendered days/{a.date}.html ({len(dates)} day(s) total)")

    if a.no_push:
        return
    git("add", "-A")
    if subprocess.run(["git", "-C", ROOT, "diff", "--cached", "--quiet"]).returncode == 0:
        print("Nothing changed; nothing to commit.")
    else:
        git("commit", "-m", f"Daily report {a.date}")
    for attempt in range(4):
        if subprocess.run(["git", "-C", ROOT, "push", "origin", "HEAD:main"]).returncode == 0:
            print(f"Published: {SITE}days/{a.date}.html")
            return
        time.sleep(3 * (attempt + 1))
        git("pull", "--rebase", "origin", "main", check=False)
    die("git push failed after retries")

if __name__ == "__main__":
    main()
