// Comments under an idea.
import { api } from "../api.js";
import { t } from "../i18n/index.js";
import { findIdea, state } from "../state.js";
import { toast } from "../ui/toast.js";
import { redrawCard } from "../views/render.js";

/** True while someone types a comment or a search, so background refreshes don't redraw under them. */
export const isTyping = () => document.activeElement?.matches?.(".comment-input, #q") ?? false;

export async function postComment(ideaId, form) {
  const input = form.querySelector(".comment-input");
  const body = input.value.trim();
  if (!body) return;
  input.disabled = true;
  try {
    const { comment } = await api.addComment(ideaId, body);
    delete state.drafts[ideaId];
    const idea = findIdea(ideaId);
    if (idea) {
      idea.comments.push(comment);
      redrawCard(idea);
      focusCommentBox(ideaId);
    }
    if (state.view === "profile" && state.profile?.me) state.profile.stats.comments++;
  } catch (err) {
    input.disabled = false;
    toast(err.message);
  }
}

export async function deleteComment(commentId, ideaId) {
  if (!confirm(t("confirmDeleteComment"))) return;
  try {
    await api.deleteComment(commentId);
    const idea = findIdea(ideaId);
    if (idea) {
      idea.comments = idea.comments.filter(c => c.id !== commentId);
      redrawCard(idea);
    }
  } catch (err) {
    toast(err.message);
  }
}

/** "View all N comments" / "Show fewer comments". */
export function toggleComments(ideaId) {
  if (state.expanded.has(ideaId)) state.expanded.delete(ideaId);
  else state.expanded.add(ideaId);
  const idea = findIdea(ideaId);
  if (idea) redrawCard(idea);
}

export function focusCommentBox(ideaId) {
  document.querySelector(`[data-comment-input="${ideaId}"]`)?.focus();
}

/** Keep unsent text, so a redraw of the card doesn't lose it. */
export function rememberDraft(input) {
  state.drafts[input.dataset.commentInput] = input.value;
}
