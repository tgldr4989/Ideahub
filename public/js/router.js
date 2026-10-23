// Hash routes: #/ = feed, #/u/<id> = a person's profile, #/i/<id> = an idea's page.
import { api } from "./api.js";
import { applyIdeaDetail, state } from "./state.js";
import { toast } from "./ui/toast.js";
import { $ } from "./utils.js";
import { render, renderNav } from "./views/render.js";

const ROUTES = [
  { view: "profile", pattern: /^#\/u\/(\d+)$/, load: id => loadProfile(id) },
  { view: "idea",    pattern: /^#\/i\/(\d+)$/, load: id => loadIdea(id) },
];
// each view's container; the others are emptied so a card exists only once in the page
const VIEWS = { feed: ["#feedView", "#feed"], profile: ["#profileView", "#profileFeed"], idea: ["#ideaView", "#ideaPage"] };

export async function loadProfile(id) {
  state.profile = (await api.getUser(id)).user;
}

export async function loadIdea(id) {
  applyIdeaDetail((await api.getIdea(id)).idea);
}

export async function route() {
  let next = "feed";
  for (const r of ROUTES) {
    const match = location.hash.match(r.pattern);
    if (!match) continue;
    try {
      await r.load(Number(match[1]));
    } catch (err) {
      toast(err.message);
      goToFeed();
      return;
    }
    next = r.view;
    break;
  }
  if (next !== state.view) window.scrollTo({ top: 0 });
  state.view = next;
  if (next !== "idea") state.idea = null;
  for (const [view, [section, list]] of Object.entries(VIEWS)) {
    $(section).hidden = view !== next;
    if (view !== next) $(list).innerHTML = "";
  }
  renderNav();
  render();
}

/** `id` is a user id, or "me" for the signed-in person. */
export function openProfile(id) {
  navigate(`#/u/${id === "me" ? state.me.id : Number(id)}`);
}

export function openIdea(id) {
  navigate(`#/i/${Number(id)}`);
}

export function goToFeed() {
  location.hash = "#/";
}

function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

export function initRouter() {
  window.addEventListener("hashchange", () => { if (state.me) route(); });
}
