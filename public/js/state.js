// Everything the page shows comes from this one object.
export const state = {
  me: null,             // signed-in person, from /api/me
  ideas: [],            // all ideas as the API returns them
  snapshot: "",         // last /api/ideas payload, to skip redraws when nothing changed
  filter: "all",        // all | hack | proc | mine | #tag
  sort: "top",          // top | new
  query: "",            // search box
  view: "feed",         // feed | profile
  profile: null,        // person shown on the profile page
  expanded: new Set(),  // ideas showing all their comments
  drafts: {},           // unsent comment text per idea
  reorderTimer: null,   // pending re-rank after a reaction
};

export const findIdea = id => state.ideas.find(i => i.id === id);
