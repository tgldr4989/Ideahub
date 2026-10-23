// Loading and deleting ideas.
import { api } from "../api.js";
import { t } from "../i18n/index.js";
import { loadProfile } from "../router.js";
import { findIdea, state } from "../state.js";
import { toast } from "../ui/toast.js";
import { render } from "../views/render.js";

/** Fetch all ideas; redraws only when something changed (or when `force` is set). */
export async function loadIdeas({ animate = false, force = false } = {}) {
  const { ideas } = await api.listIdeas();
  const snapshot = JSON.stringify(ideas);
  if (snapshot === state.snapshot && !force) return;
  state.snapshot = snapshot;
  state.ideas = ideas;
  render(animate);
}

export async function deleteIdea(ideaId) {
  const idea = findIdea(ideaId);
  if (!idea || !confirm(t("confirmDelete", { title: idea.title }))) return;
  try {
    await api.deleteIdea(ideaId);
    state.ideas = state.ideas.filter(i => i !== idea);
    if (state.view === "profile") await loadProfile(state.profile.id);
    render(true);
    toast(t("deleted"));
  } catch (err) {
    toast(err.message);
  }
}
