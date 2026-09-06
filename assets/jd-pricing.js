/**
 * Pure pricing calculations. Takes the current state plus the read-only
 * config data rendered server-side by Liquid (see jd-config JSON block in
 * sections/diy-jewelry-designer.liquid) and returns a price breakdown.
 *
 * Every function here is side-effect free so it can be unit tested and
 * reused by both the live preview and the cart submission step.
 */

function findById(list, id) {
  return (list || []).find((item) => item.id === id) || null;
}

export function resolveSelection(state, config) {
  const jewelryType = findById(config.jewelryTypes, state.jewelryType);
  const material = findById(config.materials, state.material);
  const size = findById(config.sizes, state.size);
  const charm = findById(config.charms, state.charm);
  const beads = (state.beads || [])
    .map((entry) => ({ ...entry, data: findById(config.beads, entry.id) }))
    .filter((entry) => entry.data && entry.qty > 0);

  return { jewelryType, material, size, charm, beads };
}

export function computeBreakdown(state, config) {
  const { jewelryType, material, size, charm, beads } = resolveSelection(state, config);
  const lines = [];

  if (jewelryType) {
    lines.push({
      key: 'jewelryType',
      label: jewelryType.name,
      amountCents: jewelryType.basePriceCents || 0,
    });
  }

  if (material && material.priceModifierCents) {
    lines.push({
      key: 'material',
      label: material.name,
      amountCents: material.priceModifierCents,
    });
  }

  beads.forEach((bead) => {
    lines.push({
      key: `bead:${bead.id}`,
      label: `${bead.data.name} × ${bead.qty}`,
      amountCents: (bead.data.priceCents || 0) * bead.qty,
    });
  });

  if (charm) {
    lines.push({
      key: 'charm',
      label: charm.name,
      amountCents: charm.priceCents || 0,
    });
  }

  if (size && size.priceModifierCents) {
    lines.push({
      key: 'size',
      label: size.label,
      amountCents: size.priceModifierCents,
    });
  }

  if (state.engraving && state.engraving.enabled && state.engraving.text.trim()) {
    lines.push({
      key: 'engraving',
      label: config.engraving?.label || 'Gravur',
      amountCents: config.engraving?.priceCents || 0,
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const compareAtCents = config.compareAtCents || 0;
  // Only ever show "you save" once a piece is actually configured — comparing
  // an empty €0 in-progress total against compareAtCents would be misleading.
  const savingsCents = totalCents > 0 && compareAtCents > totalCents ? compareAtCents - totalCents : 0;

  return {
    lines,
    totalCents,
    compareAtCents,
    savingsCents,
  };
}

export function computeDeliveryDays(state, config) {
  const base = config.delivery?.standardDays || '7–10';
  const extra = state.engraving?.enabled ? config.delivery?.engravingExtraDays || 0 : 0;
  if (!extra) return base;
  const [min, max] = String(base)
    .replace(/[^0-9–-]/g, '')
    .split(/[–-]/)
    .map(Number);
  if (Number.isFinite(min) && Number.isFinite(max)) {
    return `${min + extra}–${max + extra}`;
  }
  return base;
}

export function isStepComplete(stepId, state) {
  switch (stepId) {
    case 'jewelryType':
      return Boolean(state.jewelryType);
    case 'material':
      return Boolean(state.material);
    case 'beads':
      return true; // optional step
    case 'charm':
      return true; // optional step
    case 'size':
      return Boolean(state.size);
    case 'engraving':
      return !state.engraving?.enabled || state.engraving.text.trim().length > 0;
    case 'preview':
    case 'summary':
      return true;
    default:
      return true;
  }
}
