# TechStore SEO build

Products live in your Google Sheet. Google can't run JavaScript reliably, so `build.js`
turns the sheet into plain HTML pages it can read:

| Output | What it is |
|---|---|
| `index.html` | Home page with the first 24 products already in the HTML |
| `/phones/`, `/laptops/`, ... | One page per category (only categories that have products) |
| `/p/<product-name>/` | One page per product, with Product + Breadcrumb structured data |
| `sitemap.xml`, `robots.txt` | For Google |

## Every time you change the sheet

    node build.js          # needs Node 18+, nothing to install
    git add -A && git commit -m "Rebuild" && git push

Or let GitHub do it: `.github/workflows/build.yml` rebuilds daily and on demand
(Actions tab, then "Run workflow").

Edit **`index.template.html`** (page layout) and **`build.js`** (category text in `CATS`), never the
generated `index.html`, `p/`, or category folders, because those get overwritten.

## Sheet columns
Required: `name, category, brand, spec, price, old_price, image_url, badge`.
Optional: `stock`. Put `out of stock` (or `0`, `no`, `sold out`) to mark an item unavailable.
Categories must match `phones, laptops, audio, accessories, gaming, wearables`.

## Testing locally
Pages use absolute paths (`/style.css`), so open them through a server rather than by double-click:

    node build.js && npx serve .

To test without the live sheet: `CSV_FILE=sample.csv node build.js`

## After the first deploy
1. Google Search Console: submit `https://www.techstoreug.com/sitemap.xml`.
2. Request indexing for the home page and a couple of product pages.
3. Claim / complete your Google Business Profile (Ttowa Mall). This matters most for "near me" searches.
