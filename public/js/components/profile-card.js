// HTML for the card at the top of a profile page.
import { getLang, t } from "../i18n/index.js";
import { esc } from "../utils.js";
import { avatarHTML } from "./avatar.js";

const LANGUAGE_OPTIONS = [["mn", "Монгол"], ["en", "English"]];

export function profileCardHTML(p) {
  const meta = [p.position, p.dept].filter(Boolean).join(" · ");
  const bio = p.bio
    ? `<p class="p-bio">${esc(p.bio)}</p>`
    : p.me ? `<p class="p-bio empty">${t("addBio")}</p>` : "";
  const ownerButtons = p.me ? `
      <div class="profile-btns">
        <button class="btn-soft" data-edit-profile>✏️ ${t("editProfile")}</button>
        <button class="btn-ghost" data-sign-out>${t("signOut")}</button>
      </div>` : "";
  const language = p.me ? `
      <div class="lang-row">
        <span>🌐 ${t("language")}</span>
        <div class="seg">${LANGUAGE_OPTIONS.map(([code, name]) =>
          `<button class="${getLang() === code ? "active" : ""}" data-lang="${code}">${name}</button>`).join("")}</div>
      </div>` : "";

  return `
    <section class="profile-card">
      <div class="profile-cover"></div>
      <div class="profile-main">
        <div class="profile-top">${avatarHTML(p.name, p.avatar, "xl")}${ownerButtons}</div>
        <h2>${esc(p.name)}</h2>
        ${meta ? `<div class="p-meta">${esc(meta)}</div>` : ""}
        <div class="p-email">${esc(p.email)}</div>
        ${bio}
        <div class="p-stats">
          <div><b>${p.stats.ideas}</b><small>${t("pIdeas")}</small></div>
          <div><b>${p.stats.reactions}</b><small>${t("pReacts")}</small></div>
          <div><b>${p.stats.comments}</b><small>${t("pComments")}</small></div>
        </div>
        ${language}
      </div>
    </section>`;
}
