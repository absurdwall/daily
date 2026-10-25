# Tim's Daily · 每日一学

A tiny static site (GitHub Pages, no build step) with one bilingual (EN / 中文) learning report per day.

Live: https://absurdwall.github.io/daily/

## Structure

```
index.html          calendar of all reports (reads reports.json), latest-report link
reports.json        [{date: "YYYY-MM-DD", title_en, title_zh}, ...] sorted by date
days/YYYY-MM-DD.html   one generated page per day
content/YYYY-MM-DD.json source content for each day (pages are rendered from these)
style.css           shared styles (light/dark, mobile friendly)
lang.js             shared EN/中文 toggle; choice saved in localStorage ("daily-lang")
tools/publish_day.py   generator + publisher
.nojekyll           serve files as-is
```

Bilingual text is rendered as sibling elements with `data-lang="en"` / `data-lang="zh"`;
`lang.js` hides the inactive language without reloading.

## Publishing a day

```
python3 tools/publish_day.py path/to/content.json --date 2026-10-24
```

- `--date` defaults to today in America/New_York; `--no-push` skips git.
- Idempotent: re-running a date overwrites that page and its reports.json entry.
- Copies the content into `content/<date>.json`, re-renders all day pages (keeps prev/next links right),
  then `git pull --rebase`, commit, and push to `main`.

## Content JSON schema

Every `{en, zh}` pair is required. Plain text; a blank line starts a new paragraph.

```json
{
  "title":   {"en": "Headline", "zh": "标题"},
  "intro":   {"en": "Optional intro", "zh": "可选导语"},
  "ai_news": {"title": {"en":"","zh":""}, "body": {"en":"","zh":""}, "why": {"en":"","zh":""},
              "source_url": "https://...", "source_name": "optional"},
  "blog_pick": {"title": {"en":"","zh":""}, "body": {"en":"","zh":""},
                "source_url": "https://...", "source_name": "optional"},
  "learn":   {"title": {"en":"","zh":""}, "body": {"en":"","zh":""},
              "source_url": "https://...", "source_name": "optional"}
}
```
