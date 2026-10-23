// Switching between Mongolian and English.
import { api } from "../api.js";
import { getLang, setLang } from "../i18n/index.js";
import { state } from "../state.js";
import { applyStaticText } from "../ui/static-text.js";
import { $$ } from "../utils.js";
import { render, renderFeedTitle } from "../views/render.js";
import { refreshIdeaFormText } from "./idea-form.js";
import { translateSignIn } from "./signin.js";

/** Redraw every piece of text in the current language. */
export function applyLanguage() {
  // flag switch in the header: highlight the current language
  $$("#langSwitch [data-lang]").forEach(b => {
    const on = b.dataset.lang === getLang();
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on);
  });
  applyStaticText();
  translateSignIn();
  refreshIdeaFormText();
  renderFeedTitle();
  render();
}

/** `save` stores the choice on the account, so it follows the person to other devices. */
export function changeLanguage(lang, { save = true } = {}) {
  setLang(lang);
  applyLanguage();
  if (save && state.me) api.setLanguage(lang).catch(() => { /* still applied on this device */ });
}
