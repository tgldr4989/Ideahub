// Derived lists and numbers, computed from state.
import { state } from "./state.js";

export const totalReactions = idea => Object.values(idea.r).reduce((a, b) => a + b, 0);

/** Most reacted first (ties: newest first), or simply newest first. */
export const byTop = top => top
  ? (a, b) => totalReactions(b) - totalReactions(a) || b.t - a.t
  : (a, b) => b.t - a.t;

export const topRanking = () => [...state.ideas].sort(byTop(true));

/** Ideas matching the menu filter and search (any status). */
function filteredIdeas() {
  const { filter, query } = state;
  const q = query.toLowerCase();
  return state.ideas.filter(i => {
    if (filter === "hack" || filter === "proc") { if (i.type !== filter) return false; }
    else if (filter === "mine") { if (!i.mine) return false; }
    else if (filter.startsWith("#")) {
      if (!i.tags.some(tag => tag.toLowerCase() === filter.slice(1).toLowerCase())) return false;
    }
    return !q || `${i.title} ${i.desc} ${i.author} ${i.tags.join(" ")}`.toLowerCase().includes(q);
  });
}

/** Ideas for the feed after the menu filter, search, status tab and sort. */
export function feedIdeas() {
  const { statusFilter, sort } = state;
  return filteredIdeas()
    .filter(i => statusFilter === "all" || i.status === statusFilter)
    .sort(byTop(sort === "top"));
}

/** How many ideas each status tab would show, given the menu filter and search. */
export function statusCounts() {
  const counts = { all: 0, new: 0, confirmed: 0, in_progress: 0, done: 0 };
  for (const i of filteredIdeas()) {
    counts.all++;
    counts[i.status]++;
  }
  return counts;
}

/** Ideas by the person on the profile page, most reacted first. */
export const profileIdeas = () =>
  state.ideas.filter(i => state.profile && i.authorId === state.profile.id).sort(byTop(true));

export function feedCounts() {
  const { ideas } = state;
  return {
    all: ideas.length,
    hack: ideas.filter(i => i.type === "hack").length,
    proc: ideas.filter(i => i.type === "proc").length,
    mine: ideas.filter(i => i.mine).length,
  };
}
