/**
 * Renders every live-preview surface (the sticky desktop panel, the mobile
 * summary bar, and the enlarged "review" step) from the current state.
 * Any element carrying the matching `data-jd-preview-*` attribute anywhere
 * in the root is updated — this lets the same state drive several
 * presentational copies without the controller knowing about layout.
 *
 * Pure DOM updates, batched per render() call to avoid layout thrashing.
 */

import { qsa, formatMoney } from './jd-utils.js';
import { resolveSelection, computeBreakdown, computeDeliveryDays } from './jd-pricing.js';

export class JdPreview {
  constructor(root, config) {
    this.root = root;
    this.config = config;
  }

  render(state) {
    const selection = resolveSelection(state, this.config);
    const breakdown = computeBreakdown(state, this.config);
    const deliveryDays = computeDeliveryDays(state, this.config);

    this._renderImages(selection);
    this._renderEngraving(state);
    this._renderPrice(breakdown);
    this._renderLists(breakdown);
    this._renderDelivery(deliveryDays);
  }

  _renderImages(selection) {
    const src = selection.material?.previewImage || selection.jewelryType?.image || this.config.placeholderImage;
    if (!src) return;

    qsa('[data-jd-preview-stage]', this.root).forEach((stage) => {
      const img = stage.querySelector('[data-jd-preview-image]');
      if (!img || img.src === src) return;
      stage.dataset.loading = 'true';
      const swap = () => {
        img.src = src;
        stage.dataset.loading = 'false';
      };
      if (img.decode) {
        const probe = new Image();
        probe.src = src;
        probe.decode().then(swap).catch(swap);
      } else {
        swap();
      }
    });
  }

  _renderEngraving(state) {
    const text = state.engraving?.enabled ? state.engraving.text.trim() : '';
    qsa('[data-jd-preview-engraving]', this.root).forEach((el) => {
      el.textContent = text ? `„${text}“` : '';
      el.hidden = !text;
    });
  }

  _renderPrice(breakdown) {
    const priceText = formatMoney(breakdown.totalCents, this.config.currencyFormat);
    qsa('[data-jd-price]', this.root).forEach((el) => {
      el.textContent = priceText;
    });

    const hasSavings = breakdown.savingsCents > 0;
    qsa('[data-jd-preview-compare]', this.root).forEach((el) => {
      el.hidden = !hasSavings;
      if (hasSavings) el.textContent = formatMoney(breakdown.compareAtCents, this.config.currencyFormat);
    });
    qsa('[data-jd-preview-savings]', this.root).forEach((el) => {
      el.hidden = !hasSavings;
      if (hasSavings) {
        const template = this.config.i18n?.savings || 'You save {{ amount }}';
        el.textContent = template.replace(
          /\{\{\s*amount\s*\}\}/,
          formatMoney(breakdown.savingsCents, this.config.currencyFormat),
        );
      }
    });
  }

  _renderLists(breakdown) {
    qsa('[data-jd-preview-list]', this.root).forEach((listEl) => {
      const showPrices = listEl.dataset.jdPreviewList !== 'compact';
      this._fillList(listEl, breakdown, showPrices);
    });
  }

  _fillList(listEl, breakdown, showPrices) {
    listEl.textContent = '';
    if (breakdown.lines.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'jd-preview__row';
      empty.textContent = this.config.i18n?.noSelection || 'No selection yet.';
      listEl.appendChild(empty);
      return;
    }
    breakdown.lines.forEach((line) => {
      const row = document.createElement('div');
      row.className = 'jd-preview__row';
      const dt = document.createElement('dt');
      dt.textContent = line.label;
      row.appendChild(dt);
      if (showPrices) {
        const dd = document.createElement('dd');
        dd.textContent =
          line.amountCents > 0
            ? formatMoney(line.amountCents, this.config.currencyFormat)
            : this.config.i18n?.included || 'included';
        row.appendChild(dd);
      }
      listEl.appendChild(row);
    });
  }

  _renderDelivery(deliveryDays) {
    qsa('[data-jd-delivery-days]', this.root).forEach((el) => {
      el.textContent = deliveryDays;
    });
  }
}
