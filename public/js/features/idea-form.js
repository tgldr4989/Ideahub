// The "New idea" / "Edit idea" form.
import { api } from "../api.js";
import { IMAGE_MAX_PX } from "../config.js";
import { t } from "../i18n/index.js";
import { state } from "../state.js";
import { toast } from "../ui/toast.js";
import { $, $$, esc, resizeImage } from "../utils.js";
import { render } from "../views/render.js";
import { setFilter, setSort } from "./feed-controls.js";

const form = {
  type: "hack",
  newImage: null,        // data URL chosen in this form
  editing: null,         // the idea being edited; null for a new idea
  existingImage: null,   // URL of the edited idea's current image
  imageRemoved: false,   // the edited idea's image was removed
};

/** Open empty for a new idea, or filled in with `idea` to edit it. */
export function openIdeaForm(idea) {
  if (idea || form.editing) resetForm();   // switching between a new idea and an edit starts clean
  if (idea) {
    form.editing = idea;
    setType(idea.type);
    $("#fTitle").value = idea.title;
    $("#fDesc").value = idea.desc;
    $("#fTags").value = idea.tags.join(", ");
    $("#tCount").textContent = idea.title.length;
    $("#submitBtn").disabled = false;
    form.existingImage = idea.img;
    showImage();
  }
  refreshIdeaFormText();
  $("#scrim").classList.add("open");
  setTimeout(() => $("#fTitle").focus(), 50);
}

/** A new-idea draft is kept for next time; an unsaved edit is dropped. */
export function closeIdeaForm() {
  $("#scrim").classList.remove("open");
  if (form.editing) resetForm();
}

/** Text that depends on the mode and language (the rest is data-i18n). */
export function refreshIdeaFormText() {
  $("#formTitle").textContent = t(form.editing ? "editTitle" : "newTitle");
  $("#submitBtn").textContent = t(form.editing ? "saveChanges" : "postIdea");
  showImage();
}

export function initIdeaForm() {
  $$(".type-opt").forEach(b => b.addEventListener("click", () => setType(b.dataset.type)));
  $("#fTitle").addEventListener("input", e => {
    $("#tCount").textContent = e.target.value.length;
    $("#submitBtn").disabled = !e.target.value.trim();
  });
  $("#drop").addEventListener("click", e => {
    if (e.target.id === "rmImg") { e.stopPropagation(); clearImage(); }
    else $("#fImg").click();
  });
  $("#fImg").addEventListener("change", e => setImage(e.target.files[0]));
  $("#drop").addEventListener("dragover", e => e.preventDefault());
  $("#drop").addEventListener("drop", e => { e.preventDefault(); setImage(e.dataTransfer.files[0]); });
  $("#form").addEventListener("submit", submit);
}

function setType(type) {
  form.type = type;
  $$(".type-opt").forEach(x => x.classList.toggle("on", x.dataset.type === type));
}

function resetForm() {
  Object.assign(form, { editing: null, existingImage: null, imageRemoved: false });
  $("#form").reset();
  clearImage();
  setType("hack");
  $("#tCount").textContent = 0;
  $("#fErr").textContent = "";
  $("#submitBtn").disabled = true;
}

function showImage() {
  const src = form.newImage || (!form.imageRemoved && form.existingImage);
  $("#drop").innerHTML = src
    ? `<img src="${esc(src)}" alt=""><span class="rm" id="rmImg">${t("remove")}</span>`
    : t("dropEmpty");
}

async function setImage(file) {
  if (!file) return;
  try {
    form.newImage = await resizeImage(file, IMAGE_MAX_PX);
    showImage();
  } catch (err) {
    toast(err.message);
  }
}

function clearImage() {
  form.newImage = null;
  $("#fImg").value = "";
  if (form.existingImage) form.imageRemoved = true;
  showImage();
}

async function submit(e) {
  e.preventDefault();
  const title = $("#fTitle").value.trim();
  if (!title) return;
  const button = $("#submitBtn");
  button.disabled = true;
  button.textContent = t(form.editing ? "saving" : "posting");
  $("#fErr").textContent = "";

  const body = {
    type: form.type,
    title,
    desc: $("#fDesc").value,
    tags: $("#fTags").value.split(",").map(s => s.trim().replace(/^#/, "")).filter(Boolean),
  };
  try {
    if (form.editing) await saveEdit(body);
    else await createIdea(body);
  } catch (err) {
    $("#fErr").textContent = err.message;
  } finally {
    button.textContent = t(form.editing ? "saveChanges" : "postIdea");
    button.disabled = !$("#fTitle").value.trim();
  }
}

async function createIdea(body) {
  const { idea } = await api.createIdea({ ...body, image: form.newImage });
  state.ideas.unshift(idea);
  resetForm();
  closeIdeaForm();
  setSort("new");
  setFilter("all");
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast(t("toastLive"));
}

async function saveEdit(body) {
  if (form.newImage) body.image = form.newImage;
  else if (form.imageRemoved) body.image = null;   // otherwise the server keeps the image
  const { idea } = await api.updateIdea(form.editing.id, body);
  const at = state.ideas.findIndex(i => i.id === idea.id);
  if (at >= 0) state.ideas[at] = idea;
  closeIdeaForm();
  render();
  toast(t("updated"));
}
