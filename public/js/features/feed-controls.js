// Feed filter (left menu, tags), sort tabs and search.
import { goToFeed } from "../router.js";
import { state } from "../state.js";
import { $$ } from "../utils.js";
import { render, renderFeedTitle, renderNav } from "../views/render.js";

export function setFilter(filter) {
  state.filter = filter;
  renderNav();
  renderFeedTitle();
  if (state.view !== "feed") goToFeed();   // the route change redraws
  else render();
}

export function setStatusFilter(status) {
  state.statusFilter = status;
  render();
}

export function setSort(sort) {
  state.sort = sort;
  $$("#sortTabs button").forEach(b => b.classList.toggle("active", b.dataset.sort === sort));
}

export function setQuery(query) {
  state.query = query.trim();
  if (state.view !== "feed") goToFeed();
  else render();
}
