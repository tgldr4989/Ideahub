// Actions on the idea page: status changes, the details editor and join requests.
import { api } from "../api.js";
import { MAX_LINKS } from "../config.js";
import { t } from "../i18n/index.js";
import { applyIdeaDetail, state } from "../state.js";
import { toast } from "../ui/toast.js";
import { $, $$, esc } from "../utils.js";
import { render } from "../views/render.js";

const DETAIL_FIELDS = ["problem", "solution", "impact", "resources"];

/** Run an idea-page API call, then show the idea it returns. */
async function update(call, successText) {
  try {
    const { idea } = await call();
    applyIdeaDetail(idea);
    render();
    if (successText) toast(t(successText));
    return true;
  } catch (err) {
    toast(err.message);
    return false;
  }
}

// ---------------------------------------------------------------- status

export function changeStatus(status) {
  return update(() => api.setStatus(state.idea.id, status), "statusChanged");
}

// ---------------------------------------------------------------- join requests

export async function sendJoinRequest(form) {
  const button = form.querySelector("button");
  button.disabled = true;
  const ok = await update(() => api.requestJoin(state.idea.id, form.message.value), "joinSent");
  if (!ok) button.disabled = false;
}

/** `kind` is "cancel" (pending request) or "leave" (already on the team). */
export function cancelJoin(kind) {
  if (kind === "leave" && !confirm(t("confirmLeave"))) return;
  return update(() => api.leaveOrCancelJoin(state.idea.id));
}

export function answerJoin(userId, decision) {
  return update(() => api.answerJoin(state.idea.id, userId, decision));
}

// ---------------------------------------------------------------- details editor

export function openDetailsEditor() {
  const idea = state.idea;
  for (const key of DETAIL_FIELDS) $(`#d-${key}`).value = idea.details?.[key] || "";
  $("#linkRows").innerHTML = "";
  const links = idea.links?.length ? idea.links : [{ title: "", url: "" }];
  links.forEach(addLinkRow);
  $("#dErr").textContent = "";
  $("#detailsScrim").classList.add("open");
}

export function closeDetailsEditor() {
  $("#detailsScrim").classList.remove("open");
}

export function initDetailsEditor() {
  $("#addLink").addEventListener("click", () => {
    if ($$("#linkRows .link-row").length < MAX_LINKS) addLinkRow();
  });
  $("#linkRows").addEventListener("click", e => {
    if (e.target.closest("[data-remove-link]")) e.target.closest(".link-row").remove();
  });
  $("#detailsForm").addEventListener("submit", saveDetails);
}

function addLinkRow(link = { title: "", url: "" }) {
  const row = document.createElement("div");
  row.className = "link-row";
  row.innerHTML = `
    <input class="input" data-link-title maxlength="100" placeholder="${esc(t("linkTitlePh"))}" value="${esc(link.title)}">
    <input class="input" data-link-url type="url" maxlength="500" placeholder="https://…" value="${esc(link.url)}">
    <button type="button" class="del" data-remove-link aria-label="${esc(t("remove"))}">×</button>`;
  $("#linkRows").append(row);
}

async function saveDetails(e) {
  e.preventDefault();
  const button = $("#dSave");
  button.disabled = true;
  button.textContent = t("saving");
  $("#dErr").textContent = "";

  const body = Object.fromEntries(DETAIL_FIELDS.map(key => [key, $(`#d-${key}`).value]));
  body.links = $$("#linkRows .link-row")
    .map(row => ({ title: row.querySelector("[data-link-title]").value.trim(), url: row.querySelector("[data-link-url]").value.trim() }))
    .filter(link => link.url);
  try {
    const { idea } = await api.saveDetails(state.idea.id, body);
    applyIdeaDetail(idea);
    closeDetailsEditor();
    render();
    toast(t("detailsSaved"));
  } catch (err) {
    $("#dErr").textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = t("save");
  }
}
