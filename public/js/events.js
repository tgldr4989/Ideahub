// Page-wide event delegation: one listener per event type; data-* attributes pick the action.
import { signOut } from "./app.js";
import { deleteComment, focusCommentBox, postComment, rememberDraft, toggleComments } from "./features/comments.js";
import { setFilter, setQuery, setSort } from "./features/feed-controls.js";
import { closeIdeaForm, openIdeaForm } from "./features/idea-form.js";
import { deleteIdea } from "./features/ideas.js";
import { changeLanguage } from "./features/language.js";
import { closeProfileEditor, openProfileEditor } from "./features/profile-editor.js";
import { closePicker, isPickerOpen } from "./features/reaction-picker.js";
import { onReactButton, react } from "./features/reactions.js";
import { goToFeed, openProfile } from "./router.js";
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
  // profile
  ["[data-profile]",       (el, e) => { e.preventDefault(); openProfile(el.dataset.profile); }],
  ["[data-go-feed]",       () => goToFeed()],
  ["[data-edit-profile]",  () => openProfileEditor()],
  ["[data-sign-out]",      () => signOut()],
  ["[data-lang]",          el => changeLanguage(el.dataset.lang)],
  // feed controls
  ["[data-tag]",           el => { setFilter(`#${el.dataset.tag}`); scrollToTop(); }],
  ["[data-filter]",        (el, e) => { e.preventDefault(); setFilter(el.dataset.filter); }],
  ["[data-sort]",          el => { setSort(el.dataset.sort); render(true); }],
  ["[data-sort-link]",     (el, e) => { e.preventDefault(); setSort("top"); setFilter("all"); scrollToTop(); }],
  // dialogs
  ["[data-open-new]",      () => openIdeaForm()],
  ["[data-close]",         () => closeIdeaForm()],
  ["[data-close-profile]", () => closeProfileEditor()],
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
}

function onSubmit(e) {
  const form = e.target.closest("[data-comment-form]");
  if (!form) return;   // other forms have their own handlers
  e.preventDefault();
  postComment(id(form, "commentForm"), form);
}

function onKeydown(e) {
  if (e.key !== "Escape") return;
  closeIdeaForm();
  closeProfileEditor();
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
