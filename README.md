# Tim's Daily · 每日一学

Bright, clean, static site (GitHub Pages, no build step). One rich bilingual (EN / 中文) report per day.
Live: https://absurdwall.github.io/daily/

## Structure
```
index.html                calendar home (thumbnail day tiles, latest card, all-reports grid); reads reports.json
reports.json              [{date, title_en, title_zh, thumb, thumbs[]}] (rebuilt from content/ by the script)
days/YYYY-MM-DD.html      generated day pages
content/YYYY-MM-DD.json   source content per day (source of truth)
assets/YYYY-MM-DD/        that day's media + widget scripts (never hotlink)
style.css · lang.js · site.js   shared theme, EN/中文 toggle (localStorage "daily-lang"), reveal/widget runtime
tools/publish_day.py      validate → render → reports.json → git push
tools/cdp.js              headless-Chrome helper for screenshots / console + 404 checks
DAILY_PLAYBOOK.md         how to produce each day
```

## Publish
```
python3 tools/publish_day.py content.json --date YYYY-MM-DD [--no-push]
```
Idempotent; re-renders all days (prev/next). Refuses to publish if a referenced asset is missing or a borrowed visual lacks credit.

## Rich content schema (per section: ai_news, blog_pick, learn)
Bilingual text = `{"en","zh"}`. Media names are relative to `assets/<date>/`.
```json
{
  "title": {"en","zh"}, "intro": {"en","zh"},
  "ai_news": {
    "title": {}, "body": {}, "why": {},                 // why required for ai_news
    "source_url": "https://...", "source_name": "...",
    "hero":   {"src": "x-hero.webp", "generated": true, "alt": {}, "caption": {}},   // or credit+credit_url
    "points": [{"big": "11", "text": {}}],
    "widget": {"script": "ai_news.js", "title": {}, "hint": {}},
    "video":  {"src": "clip.mp4", "poster": "clip.webp", "generated": true, "caption": {}},
    "gallery":{"items": [{"src": "src-1.webp", "caption": {}, "credit": "Who", "credit_url": "https://..."}]}
  }
}
```
Widget script: `DailyWidget.register('<section>', function(el, ctx){ ... })` — `ctx.bi(en,zh)`, `ctx.lang()`, `ctx.onLang(fn)`, `ctx.onVisible(fn)`, `ctx.reduced`. Reusable classes: `.w-row .w-btn(.primary) .w-input .w-label .w-big .w-muted .w-grid2 .w-panel .mono`.
