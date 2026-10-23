// Hash routes: #/ = feed, #/u/<id> = a person's profile.
import { api } from "./api.js";
import { state } from "./state.js";
import { toast } from "./ui/toast.js";
import { $ } from "./utils.js";
import { render, renderNav } from "./views/render.js";

const PROFILE_ROUTE = /^#\/u\/(\d+)$/;

export async function loadProfile(id) {
  state.profile = (await api.getUser(id)).user;
}

export async function route() {
  const match = location.hash.match(PROFILE_ROUTE);
  const next = match ? "profile" : "feed";
  if (match) {
    try {
      await loadProfile(Number(match[1]));
    } catch (err) {
      toast(err.message);
      goToFeed();
      return;
    }
  }
  if (next !== state.view) window.scrollTo({ top: 0 });
  state.view = next;
  $("#feedView").hidden = next !== "feed";
  $("#profileView").hidden = next !== "profile";
  (next === "feed" ? $("#profileFeed") : $("#feed")).innerHTML = "";   // one copy of each card in the page
  renderNav();
  render();
}

/** `id` is a user id, or "me" for the signed-in person. */
export function openProfile(id) {
  const target = id === "me" ? state.me.id : Number(id);
  const hash = `#/u/${target}`;
  if (location.hash === hash) route();
  else location.hash = hash;
}

export function goToFeed() {
  location.hash = "#/";
}

export function initRouter() {
  window.addEventListener("hashchange", () => { if (state.me) route(); });
}
