// Derived lists and numbers, computed from state.
import { state } from "./state.js";

export const totalReactions = idea => Object.values(idea.r).reduce((a, b) => a + b, 0);

/** Most reacted first (ties: newest first), or simply newest first. */
export const byTop = top => top
  ? (a, b) => totalReactions(b) - totalReactions(a) || b.t - a.t
  : (a, b) => b.t - a.t;

export const topRanking = () => [...state.ideas].sort(byTop(true));

/** Ideas for the feed after the category filter, search and sort. */
export function feedIdeas() {
  const { filter, query, sort } = state;
  let list = state.ideas.filter(i => {
    if (filter === "hack" || filter === "proc") return i.type === filter;
    if (filter === "mine") return i.mine;
    if (filter.startsWith("#")) return i.tags.some(tag => tag.toLowerCase() === filter.slice(1).toLowerCase());
    return true;
  });
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(i => `${i.title} ${i.desc} ${i.author} ${i.tags.join(" ")}`.toLowerCase().includes(q));
  }
  return list.sort(byTop(sort === "top"));
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
