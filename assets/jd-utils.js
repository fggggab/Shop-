/**
 * Shared helpers for the jewelry designer. No dependencies, no globals.
 */

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function formatMoney(cents, format) {
  const amount = (cents / 100).toFixed(2);
  if (!format) return `€${amount}`;
  return format.replace(/\{\{\s*amount\s*\}\}/, amount);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `jd-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Minimal focus trap + restore for step transitions (not a modal trap,
 * just moves focus to the new step heading so screen readers announce it).
 */
export function focusHeading(stepEl) {
  const heading = stepEl.querySelector('[data-jd-step-heading]');
  if (!heading) return;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  heading.focus({ preventScroll: false });
}

export function announce(liveRegion, message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

export function trapArrowNav(root, selector) {
  root.addEventListener('keydown', (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const items = qsa(selector, root);
    const currentIndex = items.indexOf(document.activeElement);
    if (currentIndex === -1) return;
    event.preventDefault();
    const dir = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + dir + items.length) % items.length;
    items[nextIndex].focus();
  });
}
