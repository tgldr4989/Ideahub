// Drawing the page from state: the idea list (feed or profile), side panels, header avatar.
import { CATEGORIES } from "../config.js";
import { avatarHTML } from "../components/avatar.js";
import { emptyStateHTML, postCardHTML } from "../components/post-card.js";
import { profileCardHTML } from "../components/profile-card.js";
import { closePicker } from "../features/reaction-picker.js";
import { t } from "../i18n/index.js";
import { feedCounts, feedIdeas, profileIdeas, topRanking, totalReactions } from "../selectors.js";
import { state } from "../state.js";
import { $, $$, esc } from "../utils.js";

/** Redraw the visible list. With `animate`, cards that changed place slide to their new spot. */
export function render(animate = false) {
  closePicker();
  const onFeed = state.view === "feed";
  const container = onFeed ? $("#feed") : $("#profileFeed");
  const before = animate ? cardPositions(container) : {};

  if (!onFeed) renderProfileHeader();
  const list = onFeed ? feedIdeas() : profileIdeas();
  container.innerHTML = list.length ? list.map(postCardHTML).join("") : emptyStateHTML();

  if (animate) slideFrom(container, before);
  renderSide();
}

/** Redraw one card in place (after a reaction or comment) without touching the rest. */
export function redrawCard(idea, { pop = false } = {}) {
  const card = document.querySelector(`[data-post="${idea.id}"]`);
  if (!card) return;
  card.outerHTML = postCardHTML(idea);
  if (pop) document.querySelector(`[data-post="${idea.id}"] .act.mine`)?.classList.add("pop");
}

export function renderSide() {
  const top = topRanking().filter(i => totalReactions(i) > 0).slice(0, 5);
  $("#leader").innerHTML = top.length
    ? top.map((i, n) => `<li><span class="n">${n + 1}</span><span class="t">${esc(i.title)}</span><span class="c">${totalReactions(i)}</span></li>`).join("")
    : `<li class="none">${t("noReactionsYet")}</li>`;
  $("#statIdeas").textContent = state.ideas.length;
  $("#statReacts").textContent = state.ideas.reduce((sum, i) => sum + totalReactions(i), 0);
  $("#statPeople").textContent = new Set(state.ideas.map(i => i.authorId)).size;
  const counts = feedCounts();
  $$("[data-count]").forEach(el => { el.textContent = counts[el.dataset.count]; });
}

export function renderCategories() {
  $("#stories").innerHTML = CATEGORIES.map(c => `
    <button class="story ${state.filter.toLowerCase() === c.k.toLowerCase() ? "active" : ""}" data-filter="${c.k}">
      <div class="story-ring"><div class="story-inner">${c.e}</div></div><span>${t(c.label)}</span>
    </button>`).join("");
}

export function renderFeedTitle() {
  const { filter } = state;
  const cat = CATEGORIES.find(c => c.k.toLowerCase() === filter.toLowerCase());
  let title;
  if (filter === "all") title = t("titleAll");
  else if (filter === "mine") title = t("titleMine");
  else if (filter.startsWith("#")) title = cat ? `#${t(cat.label)}` : filter;
  else title = t("titleCat", { label: t(cat.label) });
  $("#feedTitle").textContent = title;
}

/** Left menu: highlight the active filter (nothing while on a profile). */
export function renderNav() {
  $$("#nav a").forEach(a => a.classList.toggle("active", state.view === "feed" && a.dataset.filter === state.filter));
}

export function renderMe() {
  $("#meBtn").innerHTML = avatarHTML(state.me.name, state.me.avatar, "sm");
}

function renderProfileHeader() {
  const p = state.profile;
  $("#profileCard").innerHTML = p ? profileCardHTML(p) : "";
  $("#profileIdeasTitle").textContent = !p ? "" : p.me ? t("yourIdeas") : t("theirIdeas", { name: p.name });
}

function cardPositions(container) {
  const positions = {};
  container.querySelectorAll(".post").forEach(el => { positions[el.dataset.post] = el.getBoundingClientRect().top; });
  return positions;
}

function slideFrom(container, before) {
  container.querySelectorAll(".post").forEach(el => {
    const prev = before[el.dataset.post];
    if (prev == null) return;
    const dy = prev - el.getBoundingClientRect().top;
    if (dy) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
  });
}
