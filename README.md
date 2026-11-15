# Rrjeti Agency · website

Plain HTML, CSS and JavaScript. No framework. One small Python build script for the English version and SEO.

```
new/            the website (this folder is what gets published)
  en/           English pages (generated, don't edit by hand)
  assets/       css, js, images
  sitemap.xml, robots.txt, llms.txt, CNAME   (generated / static)
tools/
  build.py      builds English pages + SEO tags + sitemap
  en.json       Albanian → English text
  make_og.py    social share images
source-logos/   original logo files (not published)
.github/workflows/pages.yml   publishes new/ to GitHub Pages
```

## Editing
1. Edit the **Albanian** pages in `new/` (they are the source).
2. Run `python tools/build.py`. It rebuilds every page in `new/en/`, the SEO tags and the sitemap.
   Any new Albanian sentence without an English version is listed at the end: add it to `tools/en.json` and run again.
3. Preview: `python -m http.server 8000 -d new`, then open http://localhost:8000

Numbers and links used by the scripts (WhatsApp, 10% split, Chili House, Formspree, Meta Pixel) are at the top of `new/assets/js/main.js`.

## What's built in
- **SEO:** canonical + hreflang (sq / en / x-default), Open Graph + Twitter cards, JSON-LD (LocalBusiness/ProfessionalService with address, map, phone and offers, WebSite, WebPage, BreadcrumbList, FAQPage, Article for case studies), sitemap with language pairs, robots.txt.
- **GEO (AI answers):** `llms.txt` with the key facts, robots.txt explicitly allows AI crawlers, FAQ and facts in structured data.
- **Speed:** the 3D chrome (three.js) loads only after the page is idle, and never on phones, data saver or reduced motion. Images are WebP and lazy-loaded, maps are lazy iframes, fonts use `display=swap`.

## Publishing (GitHub Pages + rrjetiagency.com)
1. Push this folder to a GitHub repo (public, or private with GitHub Pro). The workflow publishes `new/` on every push to `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**. Custom domain: `rrjetiagency.com`. Tick **Enforce HTTPS** once the certificate is ready.
3. At the domain's DNS (Squarespace Domains):
   - remove the forwarding/redirect to rrjetiagency.onrender.com
   - `A` records for `@`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `CNAME` for `www` → `yllilimited.github.io`
   - **do not touch the Google Workspace MX/TXT records** (email keeps working)
4. Google Search Console: add the domain, submit `https://rrjetiagency.com/sitemap.xml`.
