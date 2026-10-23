// Current language and text lookup.
import en from "./en.js";
import mn, { serverErrors as mnServerErrors } from "./mn.js";

const LOCALES = { en, mn };
const STORAGE_KEY = "ideahub.lang";
const DEFAULT_LANG = "mn";   // Mongolian until someone switches

let current = detectLanguage();
document.documentElement.lang = current;

function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved in LOCALES) return saved;
  } catch { /* storage blocked: use the default */ }
  return DEFAULT_LANG;
}

export const getLang = () => current;

export function setLang(lang) {
  if (!(lang in LOCALES)) return;
  current = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* remembered for this page only */ }
}

/** Text for `key`; `{name}` placeholders come from `vars`, plural keys are functions of `vars.n`. */
export function t(key, vars = {}) {
  const value = LOCALES[current][key] ?? en[key] ?? key;
  if (typeof value === "function") return value(vars.n);
  return value.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function translateServerError(message) {
  return current === "mn" ? mnServerErrors[message] || message : message;
}
