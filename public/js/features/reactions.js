// Reacting to an idea: updates the card at once, then saves; one reaction per person per idea.
import { api } from "../api.js";
import { CAN_HOVER, QUICK_REACTION, REORDER_DELAY_MS } from "../config.js";
import { findIdea, state } from "../state.js";
import { toast } from "../ui/toast.js";
import { redrawCard, render, renderSide } from "../views/render.js";
import { isTyping } from "./comments.js";
import { closePicker, togglePicker } from "./reaction-picker.js";

const saving = {};   // ideaId -> promise chain, so quick clicks reach the server in order

/** Choosing the reaction you already have removes it; any other replaces it. */
export function react(ideaId, kind) {
  const idea = findIdea(ideaId);
  if (!idea) return;
  closePicker();
  const previous = idea.myReaction || null;
  const next = previous === kind ? null : kind;

  applyReaction(idea, previous, next);
  redrawCard(idea, { pop: !!next });
  renderSide();
  scheduleReorder();

  saving[ideaId] = (saving[ideaId] || Promise.resolve()).then(async () => {
    try {
      const res = await api.react(ideaId, next);
      // only the latest click decides what's shown; take the server's counts
      if (idea.myReaction === next && JSON.stringify(res.r) !== JSON.stringify(idea.r)) {
        idea.r = res.r;
        redrawCard(idea);
        renderSide();
      }
    } catch (err) {
      if (idea.myReaction === next) {
        applyReaction(idea, next, previous);
        redrawCard(idea);
        renderSide();
      }
      toast(err.message);
    }
  });
}

/** React button: with a mouse a click gives a quick 💡 (or undoes yours); on touch it opens the emoji row. */
export function onReactButton(button) {
  const ideaId = Number(button.dataset.reactMain);
  if (!CAN_HOVER) {
    togglePicker(button.closest(".react-wrap"));
    return;
  }
  react(ideaId, findIdea(ideaId)?.myReaction || QUICK_REACTION);
}

function applyReaction(idea, from, to) {
  if (from) {
    idea.r[from] = Math.max(0, (idea.r[from] || 0) - 1);
    if (!idea.r[from]) delete idea.r[from];
  }
  if (to) idea.r[to] = (idea.r[to] || 0) + 1;
  idea.myReaction = to;
}

/** Re-rank shortly after a reaction, so the card doesn't jump away from under the cursor. */
function scheduleReorder() {
  clearTimeout(state.reorderTimer);
  state.reorderTimer = setTimeout(() => {
    state.reorderTimer = null;
    if (!isTyping()) render(true);
  }, REORDER_DELAY_MS);
}
