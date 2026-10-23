// Fixed page text: elements marked data-i18n (text) or data-i18n-ph (placeholder).
import { t } from "../i18n/index.js";
import { $$ } from "../utils.js";

export function applyStaticText() {
  $$("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}
