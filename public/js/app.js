// Start-up, sign-out and background refresh.
import { api } from "./api.js";
import { POLL_MS } from "./config.js";
import { isTyping } from "./features/comments.js";
import { loadIdeas } from "./features/ideas.js";
import { changeLanguage } from "./features/language.js";
import { isPickerOpen } from "./features/reaction-picker.js";
import { showSignIn } from "./features/signin.js";
import { getLang, t } from "./i18n/index.js";
import { loadProfile, route } from "./router.js";
import { state } from "./state.js";
import { toast } from "./ui/toast.js";
import { $ } from "./utils.js";
import { renderMe } from "./views/render.js";

export async function boot() {
  try {
    const { user, emailDomain } = await api.me();
    if (emailDomain) $("#sEmail").placeholder = `you@${emailDomain}`;
    if (user) startApp(user);
    else showSignIn();
  } catch {
    toast(t("cantReach"));
  }
}

export async function startApp(user) {
  state.me = user;
  $("#signin").hidden = true;
  try {
    state.me = (await api.me()).user || user;   // full profile: photo and language
  } catch { /* keep what the sign-in returned */ }

  if (state.me.lang && state.me.lang !== getLang()) changeLanguage(state.me.lang, { save: false });
  else if (!state.me.lang) api.setLanguage(getLang()).catch(() => {});   // first visit: remember this device's choice

  renderMe();
  try {
    await loadIdeas({ force: true });
  } catch (err) {
    toast(err.message);
  }
  route();
}

export async function signOut() {
  await api.logout().catch(() => {});
  location.hash = "";
  location.reload();
}

export function startLiveRefresh() {
  setInterval(refresh, POLL_MS);
  document.addEventListener("visibilitychange", refresh);
}

async function refresh() {
  // don't redraw under someone who is typing, has the emoji row open, or just reacted
  if (!state.me || document.hidden || state.reorderTimer || isTyping() || isPickerOpen()) return;
  try {
    const onProfile = state.view === "profile" && state.profile;
    if (onProfile) await loadProfile(state.profile.id);
    await loadIdeas({ animate: true, force: Boolean(onProfile) });
  } catch { /* try again on the next tick */ }
}
