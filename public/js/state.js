// Everything the page shows comes from this one object.
export const state = {
  me: null,             // signed-in person, from /api/me
  ideas: [],            // all ideas as the API returns them
  snapshot: "",         // last /api/ideas payload, to skip redraws when nothing changed
  filter: "all",        // all | hack | proc | mine | #tag
  statusFilter: "all",  // all | new | confirmed | in_progress | done
  sort: "top",          // top | new
  query: "",            // search box
  view: "feed",         // feed | profile | idea
  profile: null,        // person shown on the profile page
  idea: null,           // idea shown on the idea page (the same object as its entry in `ideas`)
  expanded: new Set(),  // ideas showing all their comments
  drafts: {},           // unsent comment text per idea
  reorderTimer: null,   // pending re-rank after a reaction
};

export const findIdea = id => state.ideas.find(i => i.id === id);

// Fields only the idea page loads (GET /api/ideas/<id>); the list doesn't carry them.
const DETAIL_KEYS = ["details", "links", "team", "myRequest", "requests", "statusOptions"];

/**
 * Show `detail` on the idea page. It is merged into the idea's list entry, so reacting or
 * commenting on the page updates the feed card too.
 */
export function applyIdeaDetail(detail) {
  const entry = findIdea(detail.id);
  state.idea = entry ? Object.assign(entry, detail) : detail;
}

/** After the list reloads, point the idea page at the fresh entry and keep its page-only fields. */
export function relinkIdeaDetail() {
  if (!state.idea) return;
  const entry = findIdea(state.idea.id);
  if (!entry || entry === state.idea) return;
  for (const key of DETAIL_KEYS) entry[key] = state.idea[key];
  state.idea = entry;
}
