# Daily playbook (run each morning ~9 AM ET)

1. **Research** (web search, real and current only)
   - AI news from the last 24–48 h; prefer the primary source (lab blog, paper).
   - One great, fun-to-read blog post/explainer with strong visuals.
   - One surprising, *verified* fact/concept (check the math or a second source).
   - Open every link; no 404s. Never invent news, quotes, numbers or links.
2. **Visuals** → `assets/<date>/` (webp ≤ ~400 KB, mp4 ≤ 5 MB)
   - Borrow 1–5 key visuals from each source page (screenshot/crop with headless Chrome via `tools/cdp.js`), and credit each one with `credit` + `credit_url`.
   - Generate one hero image per section (`generated: true`) that explains the idea, not just decorates it.
   - At least one short clip (generated video, `generated: true`) or canvas animation per day.
   - One interactive widget per section (`<section>.js`) that lets Tim *play* with the core idea (simulator, slider, quiz). Bilingual via `ctx.bi`.
3. **Write** `content/<date>.json` (see README): plain-words EN, natural (not stiff) 简体中文; same links in both.
4. **Publish**: `python3 tools/publish_day.py content/<date>.json --date <date>`
5. **Verify**: poll the live day page until 200, then load it headless (cdp.js) at 1366 px and 390 px: no console errors, no 4xx assets, 3 widgets `.ready`, 中文 toggle works.
6. **Send Tim the link** with a one-line teaser per section.

Style: bright & clean — white/near-white backgrounds, lots of space, Fraunces display + Inter text, indigo/amber/coral accents, soft shadows, big visuals, gentle reveal animations.
