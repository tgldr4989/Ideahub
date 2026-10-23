// Page-wide event delegation: one listener per event type; data-* attributes pick the action.
import { signOut } from "./app.js";
import { deleteComment, focusCommentBox, postComment, rememberDraft, toggleComments } from "./features/comments.js";
import { setFilter, setQuery, setSort, setStatusFilter } from "./features/feed-controls.js";
import { closeIdeaForm, openIdeaForm } from "./features/idea-form.js";
import {
  answerJoin, cancelJoin, changeStatus, closeDetailsEditor, openDetailsEditor, sendJoinRequest,
} from "./features/idea-page.js";
import { deleteIdea } from "./features/ideas.js";
import { changeLanguage } from "./features/language.js";
import { closeProfileEditor, openProfileEditor } from "./features/profile-editor.js";
import { closePicker, isPickerOpen } from "./features/reaction-picker.js";
import { onReactButton, react } from "./features/reactions.js";
import { goToFeed, openIdea, openProfile } from "./router.js";
import { findIdea } from "./state.js";
import { $ } from "./utils.js";
import { render } from "./views/render.js";

const id = (el, key) => Number(el.dataset[key]);
const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

// [selector, handler(matchedElement, event)] — checked in order, first match wins.
const CLICK_ACTIONS = [
  // reactions
  ["[data-pick]",          el => react(id(el, "id"), el.dataset.pick)],
  ["[data-react-main]",    el => onReactButton(el)],
  ["[data-react]",         el => react(id(el, "id"), el.dataset.react)],
  // comments
  ["[data-expand]",        el => toggleComments(id(el, "expand"))],
  ["[data-focus-comment]", el => focusCommentBox(el.dataset.focusComment)],
  ["[data-del-comment]",   el => deleteComment(id(el, "delComment"), id(el, "id"))],
  // own ideas
  ["[data-delete]",        el => deleteIdea(id(el, "delete"))],
  ["[data-edit]",          el => openIdeaForm(findIdea(id(el, "edit")))],
  // idea page
  ["[data-open-idea]",     el => openIdea(id(el, "openIdea"))],
  ["[data-set-status]",    el => changeStatus(el.dataset.setStatus)],
  ["[data-edit-details]",  () => openDetailsEditor()],
  ["[data-cancel-join]",   el => cancelJoin(el.dataset.cancelJoin)],
  ["[data-answer]",        el => answerJoin(id(el, "user"), el.dataset.answer)],
  // profile
  ["[data-profile]",       (el, e) => { e.preventDefault(); openProfile(el.dataset.profile); }],
  ["[data-go-feed]",       () => goToFeed()],
  ["[data-edit-profile]",  () => openProfileEditor()],
  ["[data-sign-out]",      () => signOut()],
  ["[data-lang]",          el => changeLanguage(el.dataset.lang)],
  // feed controls
  ["[data-tag]",           el => { setFilter(`#${el.dataset.tag}`); scrollToTop(); }],
  ["[data-filter]",        (el, e) => { e.preventDefault(); setFilter(el.dataset.filter); }],
  ["[data-status-filter]", el => setStatusFilter(el.dataset.statusFilter)],
  ["[data-sort]",          el => { setSort(el.dataset.sort); render(true); }],
  ["[data-sort-link]",     (el, e) => { e.preventDefault(); setSort("top"); setFilter("all"); scrollToTop(); }],
  // dialogs
  ["[data-open-new]",      () => openIdeaForm()],
  ["[data-close]",         () => closeIdeaForm()],
  ["[data-close-profile]", () => closeProfileEditor()],
  ["[data-close-details]", () => closeDetailsEditor()],
];

function onClick(e) {
  const target = e.target;
  if (isPickerOpen() && !target.closest(".react-wrap")) closePicker();
  for (const [selector, handler] of CLICK_ACTIONS) {
    const el = target.closest(selector);
    if (el) {
      handler(el, e);
      return;
    }
  }
  // a click on the dimmed backdrop closes its dialog
  if (target === $("#scrim")) closeIdeaForm();
  else if (target === $("#profileScrim")) closeProfileEditor();
  else if (target === $("#detailsScrim")) closeDetailsEditor();
}

// Forms drawn inside cards; the dialogs' forms have their own handlers.
function onSubmit(e) {
  const comment = e.target.closest("[data-comment-form]");
  const join = e.target.closest("[data-join-form]");
  if (!comment && !join) return;
  e.preventDefault();
  if (comment) postComment(id(comment, "commentForm"), comment);
  else sendJoinRequest(join);
}

function onKeydown(e) {
  if (e.key !== "Escape") return;
  closeIdeaForm();
  closeProfileEditor();
  closeDetailsEditor();
  closePicker();
}

export function initEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("input", e => {
    if (e.target.matches("[data-comment-input]")) rememberDraft(e.target);
  });
  $("#q").addEventListener("input", e => setQuery(e.target.value));
}
