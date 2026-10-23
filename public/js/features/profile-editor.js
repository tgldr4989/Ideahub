// "Edit profile" dialog: photo, display name, position, bio.
import { api } from "../api.js";
import { AVATAR_PX } from "../config.js";
import { avatarHTML } from "../components/avatar.js";
import { t } from "../i18n/index.js";
import { state } from "../state.js";
import { toast } from "../ui/toast.js";
import { $, resizeImage } from "../utils.js";
import { renderMe } from "../views/render.js";
import { loadIdeas } from "./ideas.js";

let photo;   // undefined = unchanged, null = remove, data URL = new photo

export function openProfileEditor() {
  const p = state.profile;
  photo = undefined;
  $("#pName").value = p.displayName || "";
  $("#pName").placeholder = p.signInName || "";
  $("#pNameHint").textContent = t("displayNameHint", { name: p.signInName || "" });
  $("#pPosition").value = p.position || "";
  $("#pBio").value = p.bio || "";
  $("#pBioCount").textContent = $("#pBio").value.length;
  $("#pDept").value = p.dept || "—";
  $("#pEmail").value = p.email;
  $("#pErr").textContent = "";
  showPhoto();
  $("#profileScrim").classList.add("open");
}

export function closeProfileEditor() {
  $("#profileScrim").classList.remove("open");
}

export function initProfileEditor() {
  $("#pPhotoPick").addEventListener("click", () => $("#pPhotoFile").click());
  $("#pPhotoRemove").addEventListener("click", () => { photo = null; showPhoto(); });
  $("#pPhotoFile").addEventListener("change", async e => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      photo = await resizeImage(file, AVATAR_PX, true);
      showPhoto();
    } catch (err) {
      toast(err.message);
    }
  });
  $("#pBio").addEventListener("input", e => { $("#pBioCount").textContent = e.target.value.length; });
  $("#pName").addEventListener("input", () => { if (!$("#pPhotoPreview img")) showPhoto(); });   // initials follow the name
  $("#profileForm").addEventListener("submit", save);
}

function showPhoto() {
  const src = photo === undefined ? state.me.avatar : photo;
  const name = $("#pName").value.trim() || state.profile.signInName || state.me.name;
  $("#pPhotoPreview").innerHTML = avatarHTML(name, src, "xl");
  $("#pPhotoRemove").hidden = !src;
}

async function save(e) {
  e.preventDefault();
  const button = $("#pSave");
  button.disabled = true;
  button.textContent = t("saving");
  $("#pErr").textContent = "";

  const body = { displayName: $("#pName").value, position: $("#pPosition").value, bio: $("#pBio").value };
  if (photo !== undefined) body.avatar = photo;
  try {
    const { user } = await api.updateProfile(body);
    state.profile = user;
    state.me = { ...state.me, name: user.name, position: user.position, avatar: user.avatar };
    renderMe();
    closeProfileEditor();
    await loadIdeas({ force: true });   // names and photos on posts and comments changed
    toast(t("saved"));
  } catch (err) {
    $("#pErr").textContent = err.message;
  } finally {
    button.disabled = false;
    button.textContent = t("save");
  }
}
