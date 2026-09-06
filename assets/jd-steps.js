/**
 * Step navigation controller: shows/hides step panels, drives the progress
 * bar, gates forward navigation on step completion, and manages focus so
 * the flow stays fully keyboard- and screen-reader-accessible.
 */

import { qs, qsa, focusHeading, announce } from './jd-utils.js';

export class JdSteps {
  /**
   * @param {HTMLElement} root
   * @param {string[]} stepIds ordered list of step ids
   * @param {(stepId: string) => boolean} isComplete
   */
  constructor(root, stepIds, isComplete) {
    this.root = root;
    this.stepIds = stepIds;
    this.isComplete = isComplete;
    this.current = 0;
    this.maxReached = 0;

    this.panels = stepIds.map((id) => qs(`[data-jd-step="${id}"]`, root));
    this.progressItems = qsa('[data-jd-progress-item]', root);
    this.prevBtn = qs('[data-jd-prev]', root);
    this.nextBtn = qs('[data-jd-next]', root);
    this.liveRegion = qs('[data-jd-live-region]', root);

    this.progressItems.forEach((item) => {
      const btn = qs('[data-jd-progress-step]', item);
      btn.addEventListener('click', () => {
        const index = Number(item.dataset.jdProgressItem);
        if (index <= this.maxReached) this.goTo(index, { focus: true });
      });
    });

    if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prev());
    if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.next());
  }

  goTo(index, { focus = false } = {}) {
    if (index < 0 || index >= this.stepIds.length) return;
    this.current = index;
    this.maxReached = Math.max(this.maxReached, index);
    this._render();
    if (focus) focusHeading(this.panels[index]);
    this.root.dispatchEvent(new CustomEvent('jd:step-change', { detail: { index, stepId: this.stepIds[index] } }));
  }

  next() {
    const stepId = this.stepIds[this.current];
    if (!this.isComplete(stepId)) {
      announce(this.liveRegion, `Bitte vervollständige „${this._stepLabel(this.current)}“, bevor du fortfährst.`);
      return;
    }
    if (this.current < this.stepIds.length - 1) this.goTo(this.current + 1, { focus: true });
  }

  prev() {
    if (this.current > 0) this.goTo(this.current - 1, { focus: true });
  }

  refresh() {
    this._render();
  }

  _stepLabel(index) {
    const item = this.progressItems[index];
    const label = item?.querySelector('[data-jd-progress-label]');
    return label?.textContent?.trim() || this.stepIds[index];
  }

  _render() {
    this.panels.forEach((panel, index) => {
      if (!panel) return;
      panel.hidden = index !== this.current;
    });

    this.progressItems.forEach((item, index) => {
      const stepId = this.stepIds[index];
      const complete = this.isComplete(stepId);
      let state = 'upcoming';
      if (index === this.current) state = 'current';
      else if (index < this.current || (index <= this.maxReached && complete)) state = 'done';
      item.dataset.state = state;

      const btn = qs('[data-jd-progress-step]', item);
      const clickable = index <= this.maxReached;
      btn.dataset.clickable = String(clickable);
      btn.setAttribute('aria-current', index === this.current ? 'step' : 'false');
      btn.disabled = !clickable;
    });

    if (this.prevBtn) this.prevBtn.disabled = this.current === 0;
    if (this.nextBtn) {
      const isLast = this.current === this.stepIds.length - 1;
      this.nextBtn.hidden = isLast;
    }
  }
}
