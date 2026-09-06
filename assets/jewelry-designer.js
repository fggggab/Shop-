/**
 * Entry point for the Premium DIY Jewelry Designer.
 *
 * Loaded as `<script type="module">` from sections/diy-jewelry-designer.liquid.
 * Finds every `[data-jewelry-designer]` root on the page (normally just one)
 * and boots an independent, self-contained instance for each — no globals,
 * no shared state between instances.
 */

import { qs, qsa, debounce, announce, trapArrowNav } from './jd-utils.js';
import { JdStore } from './jd-store.js';
import { JdSteps } from './jd-steps.js';
import { JdPreview } from './jd-preview.js';
import { isStepComplete, resolveSelection } from './jd-pricing.js';
import { addBundleToCart } from './jd-cart.js';

const STEP_IDS = ['jewelryType', 'material', 'beads', 'charm', 'size', 'engraving', 'preview', 'summary'];
const ENGRAVING_MAX_CHARS_DEFAULT = 20;

function readConfig(root) {
  const script = qs('script[data-jd-config]', root);
  if (!script) return null;
  try {
    return JSON.parse(script.textContent);
  } catch (err) {
    console.error('[jewelry-designer] invalid config JSON', err);
    return null;
  }
}

function showToast(root, message) {
  const toast = qs('[data-jd-toast]', root);
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.visible = 'true';
  clearTimeout(toast._jdTimer);
  toast._jdTimer = setTimeout(() => {
    toast.dataset.visible = 'false';
  }, 3200);
}

function wireSingleSelect(root, store, optionName, { toggle = false } = {}) {
  qsa(`[data-jd-option="${optionName}"]`, root).forEach((card) => {
    card.addEventListener('click', () => {
      const value = card.dataset.jdValue;
      const state = store.getState();
      const isSelected = state[optionName] === value;
      const next = toggle && isSelected ? null : value;
      store.update({ [optionName]: next });
    });
  });
}

function renderSelectCards(root, optionName, selectedValue) {
  qsa(`[data-jd-option="${optionName}"]`, root).forEach((card) => {
    const pressed = card.dataset.jdValue === selectedValue;
    card.setAttribute('aria-pressed', String(pressed));
  });
}

function wireBeads(root, store) {
  qsa('[data-jd-bead-inc]', root).forEach((btn) => {
    btn.addEventListener('click', () => store.toggleBead(btn.dataset.jdBeadInc, 1));
  });
  qsa('[data-jd-bead-dec]', root).forEach((btn) => {
    btn.addEventListener('click', () => store.toggleBead(btn.dataset.jdBeadDec, -1));
  });
}

function renderBeads(root, beads) {
  qsa('[data-jd-option="bead"]', root).forEach((card) => {
    const id = card.dataset.jdValue;
    const entry = beads.find((b) => b.id === id);
    const qty = entry ? entry.qty : 0;
    card.dataset.qty = String(qty);
    const qtyEl = qs('[data-jd-bead-qty-value]', card);
    if (qtyEl) qtyEl.textContent = String(qty);
    const decBtn = qs('[data-jd-bead-dec]', card);
    if (decBtn) decBtn.disabled = qty === 0;
  });
}

function wireEngraving(root, store, maxChars) {
  const toggle = qs('[data-jd-engrave-toggle]', root);
  const textInput = qs('[data-jd-engrave-text]', root);
  const hint = qs('[data-jd-engrave-hint]', root);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const state = store.getState();
      store.update({ engraving: { ...state.engraving, enabled: !state.engraving.enabled } });
    });
  }

  if (textInput) {
    const commit = debounce((value) => {
      const state = store.getState();
      store.update({ engraving: { ...state.engraving, text: value.slice(0, maxChars) } }, { silent: false });
    }, 250);

    textInput.addEventListener('input', (event) => {
      const value = event.target.value.slice(0, maxChars);
      if (value !== event.target.value) event.target.value = value;
      if (hint) {
        const countEl = qs('[data-jd-engrave-count]', hint);
        if (countEl) countEl.textContent = String(value.length);
        hint.dataset.over = String(value.length >= maxChars);
      }
      commit(value);
    });
  }
}

function renderEngraving(root, engraving, maxChars) {
  const toggle = qs('[data-jd-engrave-toggle]', root);
  const textWrap = qs('[data-jd-engrave-text-wrap]', root);
  const textInput = qs('[data-jd-engrave-text]', root);
  const hint = qs('[data-jd-engrave-hint]', root);

  if (toggle) toggle.setAttribute('aria-checked', String(engraving.enabled));
  if (textWrap) textWrap.hidden = !engraving.enabled;
  if (textInput && textInput.value !== engraving.text) textInput.value = engraving.text;
  if (hint) {
    const countEl = qs('[data-jd-engrave-count]', hint);
    if (countEl) countEl.textContent = String(engraving.text.length);
    hint.dataset.over = String(engraving.text.length >= maxChars);
  }
}

function renderSummaryValues(root, state, config) {
  const selection = resolveSelection(state, config);
  const noSelection = config.i18n?.noSelection || 'No selection yet.';
  const values = {
    jewelryType: selection.jewelryType?.name,
    material: selection.material?.name,
    beads: selection.beads.length
      ? selection.beads.map((b) => `${b.data.name} × ${b.qty}`).join(', ')
      : null,
    charm: selection.charm?.name,
    size: selection.size?.label,
    engraving: state.engraving?.enabled && state.engraving.text.trim() ? `„${state.engraving.text.trim()}“` : null,
  };
  qsa('[data-jd-summary-value]', root).forEach((el) => {
    const key = el.dataset.jdSummaryValue;
    el.textContent = values[key] || noSelection;
  });
}

function wireSummaryEditButtons(root) {
  qsa('[data-jd-summary-edit]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const stepIndex = STEP_IDS.indexOf(btn.dataset.jdSummaryEdit);
      root.dispatchEvent(new CustomEvent('jd:goto-step', { detail: { index: stepIndex } }));
    });
  });
}

function initInstance(root) {
  const config = readConfig(root);
  if (!config) return;

  const maxChars = config.engraving?.maxChars || ENGRAVING_MAX_CHARS_DEFAULT;
  const storageKey = root.dataset.jdStorageKey || 'jd:designer:default';
  const liveRegion = qs('[data-jd-live-region]', root);
  const preview = new JdPreview(root, config);

  const render = (state) => {
    renderSelectCards(root, 'jewelryType', state.jewelryType);
    renderSelectCards(root, 'material', state.material);
    renderSelectCards(root, 'charm', state.charm);
    renderSelectCards(root, 'size', state.size);
    renderBeads(root, state.beads);
    renderEngraving(root, state.engraving, maxChars);
    preview.render(state);
    renderSummaryValues(root, state, config);
    if (steps) steps.refresh();
  };

  const store = new JdStore(storageKey, render);

  const steps = new JdSteps(root, STEP_IDS, (stepId) => isStepComplete(stepId, store.getState()));

  wireSingleSelect(root, store, 'jewelryType');
  wireSingleSelect(root, store, 'material');
  wireSingleSelect(root, store, 'charm', { toggle: true });
  wireSingleSelect(root, store, 'size');
  wireBeads(root, store);
  wireEngraving(root, store, maxChars);
  wireSummaryEditButtons(root);

  ['jewelryType', 'material', 'charm', 'size'].forEach((name) => {
    trapArrowNav(root, `[data-jd-option="${name}"]`);
  });

  root.addEventListener('jd:goto-step', (event) => {
    steps.goTo(event.detail.index, { focus: true });
  });

  const undoBtn = qs('[data-jd-undo]', root);
  const redoBtn = qs('[data-jd-redo]', root);
  const syncHistoryButtons = () => {
    if (undoBtn) undoBtn.disabled = !store.canUndo();
    if (redoBtn) redoBtn.disabled = !store.canRedo();
  };
  if (undoBtn) undoBtn.addEventListener('click', () => { store.undo(); syncHistoryButtons(); });
  if (redoBtn) redoBtn.addEventListener('click', () => { store.redo(); syncHistoryButtons(); });

  const originalRender = render;
  store.onChange = (state) => {
    originalRender(state);
    syncHistoryButtons();
  };

  const addToCartBtn = qs('[data-jd-add-to-cart]', root);
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', async () => {
      // Use aria-disabled + a guard flag rather than the native `disabled`
      // property: disabling a focused button force-blurs it to <body>,
      // which would strand keyboard/screen-reader users mid-submit.
      if (addToCartBtn.dataset.busy === 'true') return;
      addToCartBtn.dataset.busy = 'true';
      addToCartBtn.setAttribute('aria-disabled', 'true');
      const label = qs('[data-jd-add-to-cart-label]', addToCartBtn);
      const originalLabel = label ? label.textContent : '';
      if (label) label.textContent = config.i18n?.adding || 'Wird hinzugefügt …';

      const result = await addBundleToCart(store.getState(), config);

      addToCartBtn.dataset.busy = 'false';
      addToCartBtn.removeAttribute('aria-disabled');
      if (label) label.textContent = originalLabel;

      if (result.ok) {
        showToast(root, config.i18n?.added || 'Zu deinem Warenkorb hinzugefügt.');
        announce(liveRegion, config.i18n?.added || 'Zu deinem Warenkorb hinzugefügt.');
      } else {
        showToast(root, config.i18n?.addFailed || 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
      }
    });
  }

  const primaryCtas = qsa('[data-jd-primary-cta]', root);
  const updatePrimaryCtaLabels = (isSummary) => {
    primaryCtas.forEach((btn) => {
      const label = qs('[data-jd-primary-cta-label]', btn);
      const text = isSummary
        ? config.i18n?.addToCart || 'In den Warenkorb'
        : config.i18n?.continueCta || 'Jetzt gestalten';
      if (label) label.textContent = text;
      else btn.textContent = text;
    });
  };
  primaryCtas.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (STEP_IDS[steps.current] === 'summary') {
        addToCartBtn?.click();
      } else {
        steps.next();
      }
    });
  });

  render(store.getState());
  steps.goTo(store.getState().step || 0);
  syncHistoryButtons();
  updatePrimaryCtaLabels(STEP_IDS[steps.current] === 'summary');

  root.addEventListener('jd:step-change', (event) => {
    store.update({ step: event.detail.index }, { silent: true });
    updatePrimaryCtaLabels(event.detail.stepId === 'summary');
  });
}

function boot() {
  qsa('[data-jewelry-designer]').forEach(initInstance);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
