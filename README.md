# Premium DIY Jewelry Designer

A ground-up, Online Store 2.0–native jewelry configurator. Navy/gold/silver
luxury design system, 8-step guided flow, sticky live preview, and a real
Shopify data model (variants, metaobjects, Ajax Cart) — no page reloads, no
external libraries.

This was designed independently for functional/UX inspiration only from
`crystafy.com/pages/diy-designer` — no design, layout, copy, or code was
copied. Everything below is a new implementation.

## What's in this repo

```
assets/
  jewelry-designer.css   Design system + all component styles
  jd-utils.js            Shared helpers (debounce, formatMoney, focus mgmt, a11y)
  jd-store.js             State container: localStorage autosave + undo/redo
  jd-pricing.js           Pure pricing/breakdown calculations
  jd-steps.js             Step navigation + progress bar controller
  jd-preview.js           Live preview rendering (image, price, summary, delivery)
  jd-cart.js              Shopify Ajax Cart API integration
  jewelry-designer.js     Entry point — wires everything together per instance
  base.css                Minimal theme-wide reset
sections/
  diy-jewelry-designer.liquid   The section: layout, config JSON, schema
snippets/
  jd-progress-bar.liquid, jd-step-*.liquid, jd-preview-panel.liquid,
  jd-summary.liquid, jd-icon.liquid
templates/
  page.diy-jewelry-designer.json   Example page template using the section
layout/theme.liquid       Minimal semantic OS 2.0 layout
locales/                  de (default) + en UI strings, plus *.schema.json
config/settings_schema.json
dev-preview/              Standalone browser harness with mock data (NOT
                          part of the Shopify theme — see below)
```

## How it's assembled (Online Store 2.0)

- **Section + blocks**: `jewelry_type`, `material`, and `size` are merchant-
  configurable **blocks** (repeatable in the theme editor) — good for a
  handful of options with per-option settings.
- **Metaobjects**: beads and charms are **metaobject lists** — the right
  fit for catalogs that can grow to dozens of entries with images.
- **Metafields**: none are required by the section itself; the `product`
  setting on each `jewelry_type` block and the `variant` reference field on
  each bead/charm metaobject *are* the dynamic product/variant data source.
- **Templates**: `templates/page.diy-jewelry-designer.json` shows the
  section wired up with example blocks — duplicate/adjust via the theme
  editor.
- **Theme App Extension compatible**: the section only reads
  `section.settings` / `section.blocks` / metaobject data and renders
  standard HTML + a JSON config `<script>` tag consumed by vanilla JS — it
  can be dropped into an app block or a TAE the same way.

## Required setup in Shopify Admin

### 1. Metaobject definitions

Create two metaobject definitions (Settings → Custom data → Metaobjects):

**`bead`**
| Field key | Type              | Notes                          |
|-----------|-------------------|---------------------------------|
| `name`    | Single line text  | Shown in the bead card          |
| `image`   | File reference    | Product photo                   |
| `variant` | Variant reference | Source of truth for price + the id used in `/cart/add.js` |

**`charm`** — identical fields (`name`, `image`, `variant`).

Enable both for use in section settings (`metaobject_list`), and create one
entry per bead/charm, each pointing at a real product variant (inventory,
price, and tax settings all come from that variant natively).

### 2. Jewelry-type products

For each `jewelry_type` block (e.g. "Armband", "Halskette"), pick a Shopify
product whose **variants encode Material × Size** as options — e.g.
Option1 = Material, Option2 = Size. This keeps pricing, inventory, and
variant selection fully native to Shopify.

### 3. Material / Size blocks → variant option values

Each `material` and `size` block has an **"Variantenoptionswert" /
"Variant option value"** setting. It must match, character for character,
the option value on the linked product's variants (e.g. block label
"Gold" ↔ variant option value "Gold"). The section builds a
`variantMap` client-side config from this at render time — get the
strings wrong and that combination simply won't resolve to a variant (the
"Add to cart" step will silently skip the base line item for it, so test
each combination once after setup).

### 4. Engraving fee product (optional)

If engraving carries a surcharge, create a simple single-variant product
(e.g. "Gravur-Service") and select it under the section's **Engraving fee
product** setting. It's added as its own cart line item alongside the
base piece.

### 5. Compare-at price (optional)

Set **Compare-at price** on the section to show a struck-through price and
an automatic "you save X" badge whenever the live total is lower.

## Pricing & cart model

Rather than trying to fake dynamic pricing with cart attributes (which
Shopify's Ajax Cart API can't override), every priced component is a real
Shopify variant:

- The jewelry-type + material + size combination resolves to **one
  variant** of the linked product (native price/inventory/tax).
- Each selected bead, the charm, and the engraving fee are **separate
  variants**, added as additional line items in the same `/cart/add.js`
  call.
- All line items from one "build" share a `_bundle_id` line item property
  (a client-generated UUID) so order/cart displays can visually group them,
  plus human-readable properties (`Material`, `Größe`, `Gravur`, …).

This means the price shown throughout the flow is always a live sum of
real Shopify prices — no separate pricing system to keep in sync, and no
Shopify Function / Plus-only Script required.

## Accessibility & performance notes

- Every interactive control is a real `<button>`/`<input>` with
  `aria-pressed` / `aria-checked` / `aria-current` state, reachable by
  keyboard; arrow keys move focus within each option grid/pill group.
  A step change moves focus to the new step's heading (announced by
  screen readers automatically).
- Colors meet WCAG AA contrast against the navy/white/gold palette.
- Images use `loading="lazy"`, `decoding="async"`, explicit `width`/
  `height` (no layout shift), and `srcset` built from Shopify's image CDN
  (which auto-negotiates WebP/AVIF per browser).
- `<script type="module">` is deferred by default (no render-blocking);
  the CSS is a single small stylesheet scoped to `.jd-root`.
- Text input (engraving) is debounced before it touches state/localStorage
  to avoid excessive writes/reflows.

## Multi-language & Markets

All UI copy is translated via `locales/de.default.json` (default) and
`locales/en.json`, referenced with `{{ 'jewelry_designer.…' | t }}` — add
more `locales/<lang>.json` files the usual Shopify way for additional
languages. Prices are read from Liquid (`variant.price`, already resolved
to the shopper's Market/currency context) at render time, so no separate
currency-conversion logic is needed client-side; only the display format
(`shop.money_format`) is passed to JS.

## Local design QA (`dev-preview/`)

`dev-preview/index.html` is a static harness — **not part of the Shopify
theme** — that loads the same `assets/jewelry-designer.css` and JS modules
against hand-written mock data, so the whole flow (including drag-free
keyboard navigation, undo/redo, autosave, and the add-to-cart call) can be
clicked through in a plain browser without a Shopify storefront. It stubs
`fetch('/cart/add.js')` so "Add to cart" can be exercised without a live
cart. Do not deploy this folder to the theme.
