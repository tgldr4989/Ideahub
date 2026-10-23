// Switching between Mongolian and English.
import { api } from "../api.js";
import { setLang } from "../i18n/index.js";
import { state } from "../state.js";
import { applyStaticText } from "../ui/static-text.js";
import { render, renderFeedTitle } from "../views/render.js";
import { refreshIdeaFormText } from "./idea-form.js";
import { translateSignIn } from "./signin.js";

/** Redraw every piece of text in the current language. */
export function applyLanguage() {
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
