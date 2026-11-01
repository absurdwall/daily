#!/usr/bin/env python3
"""
publish_day.py - render one rich, bilingual daily report page, update reports.json, push to GitHub Pages.

USAGE
    python3 tools/publish_day.py CONTENT.json [--date YYYY-MM-DD] [--no-push] [--no-pull]

    --date     defaults to "today" in America/New_York.
    --no-push  render + update files only (no git commit/push).
Idempotent: re-running a date overwrites that day's page and reports.json entry. The content file is
copied to content/<date>.json and ALL day pages are re-rendered from content/*.json (keeps prev/next right).

MEDIA lives in assets/<date>/ (commit it; never hotlink). All media "src"/"poster"/"script" values below are
file names RELATIVE TO assets/<date>/ and must exist there, or the script refuses to publish.

CONTENT JSON SCHEMA  ({"en","zh"} pairs = bilingual text; plain text, blank line = new paragraph)
{
  "title": {"en","zh"},                      # required, the day's headline
  "intro": {"en","zh"},                      # optional lede
  "ai_news" | "blog_pick" | "learn": {        # all three sections required
    "title": {"en","zh"},                    # required
    "body":  {"en","zh"},                    # required
    "why":   {"en","zh"},                    # required for ai_news, optional elsewhere ("Why it matters")
    "source_url": "https://...",             # required, the real source page
    "source_name": "Name",                   # optional
    "hero":  {"src": "ai_news-hero.webp", "alt": {"en","zh"}, "caption": {"en","zh"},
              "generated": true,             # true -> labelled "AI-generated illustration"
              "credit": "Who", "credit_url": "https://..."},   # credit required if not generated
    "points": [{"big": "11 days", "text": {"en","zh"}}],       # optional key-fact cards ("big" optional, may be {"en","zh"})
    "widget": {"script": "ai_news.js", "title": {"en","zh"}, "hint": {"en","zh"}},
              # script calls DailyWidget.register("<section key>", function(el, ctx){...}); see site.js
    "gallery": {"title": {"en","zh"}, "wide": false,
                "items": [{"src": "x.webp", "caption": {"en","zh"}, "credit": "Who", "credit_url": "https://..."}]},
              # borrowed visuals: credit + credit_url REQUIRED on every item
    "video": {"src": "clip.mp4", "poster": "clip.webp", "caption": {"en","zh"},
              "generated": true, "credit": "...", "credit_url": "..."}   # autoplay muted loop, <5 MB
  }
}
reports.json entries: {"date","title_en","title_zh","thumb","thumbs":[...]} sorted by date.
"""
import argparse, datetime, html, json, os, re, subprocess, sys, time
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DAYS, CONTENT, ASSETS = (os.path.join(ROOT, d) for d in ("days", "content", "assets"))
REPORTS = os.path.join(ROOT, "reports.json")
SITE = "https://absurdwall.github.io/daily/"
FONTS = ('<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2214%22 fill=%22%234f46e5%22/%3E%3C/svg%3E">'
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600..900&family=Inter:wght@400..800&display=swap" rel="stylesheet">')
SECTIONS = [
    ("ai_news",   {"en": "AI news",         "zh": "AI 新闻"}),
    ("blog_pick", {"en": "Blog pick",       "zh": "好文推荐"}),
    ("learn",     {"en": "Learn something", "zh": "涨知识"}),
]
UI = {
    "why": {"en": "Why it matters", "zh": "为什么重要"},
    "read": {"en": "Read the original", "zh": "阅读原文"},
    "gen": {"en": "AI-generated illustration", "zh": "AI 生成插图"},
    "genv": {"en": "AI-generated clip", "zh": "AI 生成短片"},
    "from": {"en": "From the source", "zh": "来自原文"},
    "play": {"en": "Interactive · play with it", "zh": "互动 · 动手试试"},
    "back": {"en": "Calendar", "zh": "日历"},
    "prev": {"en": "← Previous day", "zh": "← 前一天"},
    "next": {"en": "Next day →", "zh": "后一天 →"},
    "credit": {"en": "Credit", "zh": "来源"},
}
WARN = []

def die(msg):
    print("ERROR:", msg, file=sys.stderr); sys.exit(1)

def pair(obj, path, required=True):
    if obj is None:
        if required: die(f"missing {path}")
        return None
    if not isinstance(obj, dict) or not str(obj.get("en", "")).strip() or not str(obj.get("zh", "")).strip():
        die(f"{path} must be an object with non-empty 'en' and 'zh'")
    return obj

def asset(date, name, path, max_kb=None):
    if not name or "/" in name.strip("./") and name.startswith(("http:", "https:")):
        die(f"{path}: must be a local file name in assets/{date}/ (no hotlinking)")
    if re.match(r"^https?:", name): die(f"{path}: hotlinking not allowed, download into assets/{date}/")
    p = os.path.join(ASSETS, date, name)
    if not os.path.isfile(p): die(f"{path}: file not found: assets/{date}/{name}")
    kb = os.path.getsize(p) / 1024
    if max_kb and kb > max_kb: WARN.append(f"{path}: assets/{date}/{name} is {kb:.0f} KB (> {max_kb} KB)")
    return f"../assets/{date}/{name}"

def validate(c, date):
    pair(c.get("title"), "title")
    if c.get("intro") is not None: pair(c["intro"], "intro")
    for key, _ in SECTIONS:
        s = c.get(key)
        if not isinstance(s, dict): die(f"missing section {key}")
        pair(s.get("title"), f"{key}.title"); pair(s.get("body"), f"{key}.body")
        pair(s.get("why"), f"{key}.why", required=(key == "ai_news"))
        if not re.match(r"^https?://", str(s.get("source_url", ""))): die(f"{key}.source_url must be an http(s) URL")
        h = s.get("hero")
        if h:
            asset(date, h.get("src"), f"{key}.hero.src", 500)
            if not h.get("generated") and not (h.get("credit") and h.get("credit_url")):
                die(f"{key}.hero: borrowed image needs credit + credit_url")
        for i, p in enumerate(s.get("points") or []): pair(p.get("text"), f"{key}.points[{i}].text")
        w = s.get("widget")
        if w:
            asset(date, w.get("script"), f"{key}.widget.script", 200); pair(w.get("title"), f"{key}.widget.title")
        g = s.get("gallery")
        if g:
            for i, it in enumerate(g.get("items") or []):
                asset(date, it.get("src"), f"{key}.gallery[{i}].src", 400)
                pair(it.get("caption"), f"{key}.gallery[{i}].caption")
                if not it.get("generated") and not (it.get("credit") and it.get("credit_url")):
                    die(f"{key}.gallery[{i}]: borrowed visual needs credit + credit_url")
        v = s.get("video")
        if v:
            asset(date, v.get("src"), f"{key}.video.src", 5000)
            if v.get("poster"): asset(date, v["poster"], f"{key}.video.poster", 300)

E = html.escape
def paras(text):
    parts = [p.strip() for p in re.split(r"\n\s*\n", str(text)) if p.strip()]
    return "".join(f"<p>{E(p).replace(chr(10), '<br>')}</p>" for p in parts)

def bi(p, tag="span", block=False):
    if isinstance(p, str): p = {"en": p, "zh": p}
    if block:
        return f'<div data-lang="en">{paras(p["en"])}</div><div data-lang="zh">{paras(p["zh"])}</div>'
    if p["en"] == p["zh"]: return f"<{tag}>{E(p['en'])}</{tag}>"
    return f'<{tag} data-lang="en">{E(p["en"])}</{tag}><{tag} data-lang="zh">{E(p["zh"])}</{tag}>'

def credit_html(o):
    if o.get("generated"): return ""
    return f' · {bi(UI["credit"])}: <a href="{E(o["credit_url"], quote=True)}" target="_blank" rel="noopener">{E(o["credit"])}</a>'

def section_html(date, idx, key, label, s):
    url = E(s["source_url"], quote=True)
    name = E(s.get("source_name") or re.sub(r"^https?://(www\.)?", "", s["source_url"]).split("/")[0])
    out = [f'<section class="section s-{key}" id="{key}"><div class="wrap">']
    out.append(f'<div class="sec-head reveal"><span class="sec-num">0{idx}</span><span class="sec-tag">{bi(label)}</span></div>')
    out.append(f'<h2 class="sec-title reveal"><a href="{url}" target="_blank" rel="noopener">{bi(s["title"])}</a></h2>')
    h = s.get("hero")
    if h:
        alt = E(h.get("alt", {}).get("en", "") if isinstance(h.get("alt"), dict) else "", quote=True)
        badge = f'<span class="badge">{bi(UI["gen"])}</span>' if h.get("generated") else ""
        cap = bi(h["caption"]) if h.get("caption") else ""
        out.append(f'<figure class="hero-fig reveal"><img src="{asset(date, h["src"], "hero")}" alt="{alt}" loading="{"eager" if idx == 1 else "lazy"}" decoding="async">'
                   f'<figcaption>{badge}{cap}{credit_html(h)}</figcaption></figure>')
    out.append('<div class="narrow">')
    out.append(f'<div class="body reveal">{bi(s["body"], block=True)}</div>')
    if s.get("why"):
        out.append(f'<div class="why reveal"><h4>{bi(UI["why"])}</h4>{bi(s["why"], block=True)}</div>')
    out.append('</div>')
    if s.get("points"):
        cards = "".join(f'<div class="point">{"<b>" + bi(p["big"]) + "</b>" if p.get("big") else ""}{bi(p["text"])}</div>' for p in s["points"])
        out.append(f'<div class="points reveal">{cards}</div>')
    w = s.get("widget")
    if w:
        hint = f'<span class="hint">{bi(w["hint"])}</span>' if w.get("hint") else ""
        out.append(f'<div class="widget-card reveal"><div class="widget-head"><span class="pulse"></span><div><div class="sec-tag" style="font-size:.68rem">{bi(UI["play"])}</div>'
                   f'<h3>{bi(w["title"])}</h3></div>{hint}</div><div class="widget" data-widget="{key}"></div></div>')
    v = s.get("video")
    if v:
        poster = f' poster="{asset(date, v["poster"], "poster")}"' if v.get("poster") else ""
        badge = f'<span class="badge">{bi(UI["genv"])}</span>' if v.get("generated") else ""
        out.append(f'<figure class="video-fig reveal"><video src="{asset(date, v["src"], "video")}"{poster} muted loop playsinline preload="metadata" data-autoplay></video>'
                   f'<figcaption class="fig-cap">{badge}{bi(v["caption"]) if v.get("caption") else ""}{credit_html(v)}</figcaption></figure>')
    g = s.get("gallery")
    if g and g.get("items"):
        title = bi(g["title"]) if g.get("title") else bi(UI["from"])
        figs = "".join(f'<figure><img src="{asset(date, it["src"], "g")}" alt="{E(it["caption"]["en"], quote=True)}" loading="lazy" decoding="async">'
                       f'<figcaption class="fig-cap">{bi(it["caption"])}{credit_html(it)}</figcaption></figure>' for it in g["items"])
        out.append(f'<div class="gal-title reveal">{title}</div><div class="gallery{" wide" if g.get("wide") else ""} reveal">{figs}</div>')
    out.append(f'<div class="reveal" style="margin-top:26px"><a class="source-btn" href="{url}" target="_blank" rel="noopener">{bi(UI["read"])} <small>{name}</small> ↗</a></div>')
    out.append('<div class="divider"></div></div></section>')
    return "\n".join(out)

def render(date, c, prev_d, next_d):
    validate(c, date)
    d = datetime.date.fromisoformat(date)
    date_pair = {"en": d.strftime("%A, %B ") + str(d.day) + d.strftime(", %Y"),
                 "zh": f"{d.year}年{d.month}月{d.day}日 · 星期" + "一二三四五六日"[d.weekday()]}
    toc = []
    for i, (key, label) in enumerate(SECTIONS, 1):
        s = c[key]; h = s.get("hero")
        img = f'<img src="{asset(date, h["src"], "hero")}" alt="" loading="eager">' if h else ""
        toc.append(f'<a href="#{key}" style="--sec:var(--{["indigo","amber","coral"][i-1]})">{img}<div class="meta"><div class="num">0{i} · {bi(label)}</div><div class="ttl">{bi(s["title"])}</div></div></a>')
    secs = "\n".join(section_html(date, i, k, l, c[k]) for i, (k, l) in enumerate(SECTIONS, 1))
    scripts = "".join(f'<script src="{asset(date, c[k]["widget"]["script"], "w")}" defer></script>' for k, _ in SECTIONS if c[k].get("widget"))
    nav_prev = f'<a href="{prev_d}.html">{bi(UI["prev"])}</a>' if prev_d else f'<span class="disabled">{bi(UI["prev"])}</span>'
    nav_next = f'<a class="r" href="{next_d}.html">{bi(UI["next"])}</a>' if next_d else f'<span class="disabled r">{bi(UI["next"])}</span>'
    intro = f'<div class="lede reveal">{bi(c["intro"], block=True)}</div>' if c.get("intro") else ""
    og = c["ai_news"].get("hero", {}).get("src")
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(date + " · " + c["title"]["en"])}</title>
<meta name="description" content="{E(c["title"]["en"], quote=True)}">
{f'<meta property="og:image" content="{SITE}assets/{date}/{og}">' if og else ""}
{FONTS}
<link rel="stylesheet" href="../style.css">
<script src="../lang.js"></script>
<script src="../site.js" defer></script>
{scripts}
</head>
<body>
<header class="topbar"><div class="wrap">
  <a class="brand" href="../index.html"><span class="dot"></span>{bi(UI["back"])}</a>
  <button class="lang-toggle" type="button">EN / 中文</button>
</div></header>
<main>
<div class="day-hero"><div class="wrap">
  <span class="eyebrow reveal">{bi(date_pair)}</span>
  <h1 class="display reveal">{bi(c["title"])}</h1>
  {intro}
  <nav class="toc reveal">{"".join(toc)}</nav>
</div></div>
{secs}
<div class="wrap"><nav class="daynav">{nav_prev}<a class="mid" href="../index.html">{bi(UI["back"])}</a>{nav_next}</nav></div>
</main>
<footer>absurdwall.github.io/daily · {bi({"en": "Made with curiosity", "zh": "好奇心出品"})}</footer>
</body>
</html>
'''

def git(*args, check=True):
    print("+ git", " ".join(args))
    return subprocess.run(["git", "-C", ROOT, *args], check=check, text=True)

def main():
    ap = argparse.ArgumentParser(description="Publish a daily report page.")
    ap.add_argument("content")
    ap.add_argument("--date", default=datetime.datetime.now(ZoneInfo("America/New_York")).date().isoformat())
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--no-pull", action="store_true")
    a = ap.parse_args()
    try: datetime.date.fromisoformat(a.date)
    except ValueError: die("--date must be YYYY-MM-DD")
    with open(a.content, encoding="utf-8") as f: c = json.load(f)
    validate(c, a.date)
    os.makedirs(DAYS, exist_ok=True); os.makedirs(CONTENT, exist_ok=True)
    if not a.no_push and not a.no_pull:
        git("pull", "--rebase", "--autostash", "origin", "main", check=False)
    dst = os.path.join(CONTENT, f"{a.date}.json")
    if os.path.abspath(a.content) != os.path.abspath(dst):
        with open(dst, "w", encoding="utf-8") as f: json.dump(c, f, ensure_ascii=False, indent=2); f.write("\n")

    reports = []
    if os.path.exists(REPORTS):
        try:
            with open(REPORTS, encoding="utf-8") as f: reports = json.load(f)
        except Exception: reports = []
    by = {r["date"]: r for r in reports if r.get("date")}
    for fn in os.listdir(CONTENT):          # rebuild entries from content files (source of truth)
        if not fn.endswith(".json"): continue
        dd = fn[:-5]
        with open(os.path.join(CONTENT, fn), encoding="utf-8") as f: cc = json.load(f)
        thumbs = [f"assets/{dd}/{cc[k]['hero']['src']}" for k, _ in SECTIONS if cc.get(k, {}).get("hero")]
        by[dd] = {"date": dd, "title_en": cc["title"]["en"], "title_zh": cc["title"]["zh"],
                  "thumb": thumbs[0] if thumbs else None, "thumbs": thumbs}
    reports = sorted(by.values(), key=lambda r: r["date"])
    with open(REPORTS, "w", encoding="utf-8") as f: json.dump(reports, f, ensure_ascii=False, indent=2); f.write("\n")

    dates = [r["date"] for r in reports]
    for i, dd in enumerate(dates):
        cp = os.path.join(CONTENT, dd + ".json")
        if not os.path.exists(cp): continue
        with open(cp, encoding="utf-8") as f: cc = json.load(f)
        page = render(dd, cc, dates[i-1] if i > 0 else None, dates[i+1] if i + 1 < len(dates) else None)
        with open(os.path.join(DAYS, dd + ".html"), "w", encoding="utf-8") as f: f.write(page)
    for w in sorted(set(WARN)): print("WARNING:", w)
    print(f"Rendered days/{a.date}.html ({len(dates)} day(s) total)")
    if a.no_push: return
    git("add", "-A")
    if subprocess.run(["git", "-C", ROOT, "diff", "--cached", "--quiet"]).returncode == 0:
        print("Nothing changed; nothing to commit.")
    else:
        git("commit", "-q", "-m", f"Daily report {a.date}")
    for attempt in range(4):
        if subprocess.run(["git", "-C", ROOT, "push", "-q", "origin", "HEAD:main"]).returncode == 0:
            print(f"Published: {SITE}days/{a.date}.html"); return
        time.sleep(3 * (attempt + 1))
        git("pull", "--rebase", "origin", "main", check=False)
    die("git push failed after retries")

if __name__ == "__main__":
    main()
