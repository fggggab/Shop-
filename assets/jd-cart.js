/**
 * Shopify Ajax Cart API integration. Adds the fully configured piece of
 * jewelry as a group of line items (base product variant + one variant per
 * bead/charm/engraving fee), tied together with a shared `_bundle_id`
 * property so the cart/order display can group them visually.
 *
 * No page reload: uses /cart/add.js and dispatches a `cart:refresh` custom
 * event that any cart-drawer implementation in the theme can listen for.
 */

import { resolveSelection } from './jd-pricing.js';

function variantForOptions(jewelryType, materialId, sizeId) {
  if (!jewelryType || !jewelryType.variantMap) return null;
  return jewelryType.variantMap[`${materialId || ''}|${sizeId || ''}`] || null;
}

export function buildCartItems(state, config) {
  const selection = resolveSelection(state, config);
  const items = [];
  const bundleId = state.bundleId;

  const baseVariantId = variantForOptions(selection.jewelryType, state.material, state.size);
  if (baseVariantId) {
    items.push({
      id: baseVariantId,
      quantity: 1,
      properties: {
        _bundle_id: bundleId,
        Material: selection.material?.name || '',
        Größe: selection.size?.label || '',
      },
    });
  }

  selection.beads.forEach((bead) => {
    if (!bead.data?.variantId) return;
    items.push({
      id: bead.data.variantId,
      quantity: bead.qty,
      properties: {
        _bundle_id: bundleId,
        Komponente: `Perle · ${bead.data.name}`,
      },
    });
  });

  if (selection.charm?.variantId) {
    items.push({
      id: selection.charm.variantId,
      quantity: 1,
      properties: {
        _bundle_id: bundleId,
        Komponente: `Anhänger · ${selection.charm.name}`,
      },
    });
  }

  if (state.engraving?.enabled && state.engraving.text.trim() && config.engraving?.variantId) {
    items.push({
      id: config.engraving.variantId,
      quantity: 1,
      properties: {
        _bundle_id: bundleId,
        Gravur: state.engraving.text.trim(),
      },
    });
  }

  return items;
}

export async function addBundleToCart(state, config) {
  const items = buildCartItems(state, config);
  if (items.length === 0) {
    return { ok: false, error: 'empty' };
  }

  const response = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.description || body.message || 'unknown' };
  }

  const body = await response.json();
  document.dispatchEvent(new CustomEvent('cart:refresh', { detail: body }));
  document.dispatchEvent(new CustomEvent('cart:build', { detail: body }));
  return { ok: true, data: body };
}
