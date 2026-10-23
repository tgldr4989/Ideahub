// HTML for the idea page (#/i/<id>): status, write-up, documents, team and comments.
import { DETAIL_SECTIONS, STATUS, STATUSES } from "../config.js";
import { t } from "../i18n/index.js";
import { esc } from "../utils.js";
import { avatarHTML } from "./avatar.js";
import { commentsHTML, coverHTML, headerHTML, reactionBarHTML, tagsHTML } from "./post-card.js";

export function ideaPageHTML(i) {
  return `
  <article class="post idea-page" data-post="${i.id}">
    ${headerHTML(i)}
    ${i.img ? coverHTML(i, { link: false }) : ""}
    <div class="idea-main">
      <h1>${esc(i.title)}</h1>
      ${i.desc ? `<p class="lead">${esc(i.desc)}</p>` : ""}
      ${tagsHTML(i)}
    </div>
    ${statusHTML(i)}
    ${reactionBarHTML(i)}
    ${detailsHTML(i)}
    ${linksHTML(i)}
    ${teamHTML(i)}
    ${section(`💬 ${t("commentsTitle")}`, "", "")}
    ${commentsHTML(i, { showAll: true })}
  </article>`;
}

function section(title, action, body, cls = "") {
  return `
    <section class="idea-section ${cls}">
      <div class="sec-head"><h3>${title}</h3>${action}</div>
      ${body}
    </section>`;
}

/** New → Confirmed → In progress → Done, plus the moves this person may make. */
function statusHTML(i) {
  const current = STATUSES.findIndex(s => s.k === i.status);
  const parts = [];
  STATUSES.forEach((s, n) => {
    if (n > 0) parts.push(`<div class="bar ${n <= current ? "past" : ""}"></div>`);
    const state = n < current ? "past" : n === current ? "now" : "";
    parts.push(`<div class="step ${state}"><span class="dot">${n < current ? "✓" : n + 1}</span><span class="lbl">${t(s.label)}</span></div>`);
  });
  const options = i.statusOptions || [];
  const actions = options.length ? `
      <div class="status-actions">
        <span>${t("changeStatus")}</span>
        ${options.map(s => `<button class="btn-soft sm s-${s}" data-set-status="${s}"><span class="dot"></span>${t(STATUS[s].label)}</button>`).join("")}
      </div>` : "";
  return `<section class="idea-section"><div class="stepper">${parts.join("")}</div>${actions}</section>`;
}

function detailsHTML(i) {
  const details = i.details || {};
  const filled = DETAIL_SECTIONS.filter(([key]) => details[key]);
  const hasAny = filled.length > 0 || (i.links || []).length > 0;
  const action = i.mine
    ? `<button class="btn-soft sm" data-edit-details>${hasAny ? `✏️ ${t("editDetails")}` : `＋ ${t("addDetails")}`}</button>` : "";
  const body = filled.length
    ? filled.map(([key, label, icon]) => `<div class="detail"><h4>${icon} ${t(label)}</h4><p>${esc(details[key])}</p></div>`).join("")
    : `<p class="muted">${t(i.mine ? "addDetailsHint" : "noDetails")}</p>`;
  return section(`📄 ${t("details")}`, action, body);
}

function linksHTML(i) {
  if (!i.links?.length) return "";
  const items = i.links.map(link => `
      <li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
        <span>🔗</span><span class="lt">${esc(link.title)}</span><span class="lu">${esc(hostOf(link.url))}</span>
      </a></li>`).join("");
  return section(`📎 ${t("links")}`, "", `<ul class="links">${items}</ul>`);
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return ""; }
}

function teamHTML(i) {
  const members = [
    { userId: i.authorId, name: i.author, avatar: i.authorAvatar, role: t("author") },
    ...(i.team || []).map(m => ({ ...m, role: m.position || m.dept || "" })),
  ];
  const list = `<div class="team">${members.map(m => `
      <div class="member">
        ${avatarHTML(m.name, m.avatar, "sm", m.userId)}
        <div><div class="name link" data-profile="${m.userId}">${esc(m.name)}</div><div class="meta">${esc(m.role)}</div></div>
      </div>`).join("")}</div>`;
  return section(`👥 ${t("team")} · ${members.length}`, "", list + (i.mine ? requestsHTML(i) : joinHTML(i)));
}

/** What a colleague sees: join form, their pending request, or their membership. */
function joinHTML(i) {
  const request = i.myRequest;
  if (request?.status === "accepted") {
    return `<div class="join-box ok"><span>✅ ${t("youAreMember")}</span><button class="btn-ghost sm" data-cancel-join="leave">${t("leaveTeam")}</button></div>`;
  }
  if (request?.status === "pending") {
    return `<div class="join-box"><span>⏳ ${t("requestSent", { name: esc(i.author) })}</span><button class="btn-ghost sm" data-cancel-join="cancel">${t("cancelRequest")}</button></div>`;
  }
  if (i.status !== "confirmed") return `<p class="muted">${t("joinOnlyConfirmed")}</p>`;
  const declined = request?.status === "declined" ? `<p class="muted">${t("requestDeclined")}</p>` : "";
  return `${declined}
    <form class="join-form" data-join-form="${i.id}">
      <textarea class="textarea short" name="message" maxlength="300" placeholder="${esc(t("joinMessagePh"))}"></textarea>
      <button class="btn-primary" type="submit">🙋 ${t("joinTeam")}</button>
    </form>`;
}

/** What the author sees: pending requests to accept or decline. */
function requestsHTML(i) {
  const pending = (i.requests || []).filter(r => r.status === "pending");
  if (!pending.length) return `<p class="muted">${t("noRequests")}</p>`;
  return `
    <div class="requests-title">${t("requests")} · ${pending.length}</div>
    <div class="requests">${pending.map(r => `
      <div class="request">
        ${avatarHTML(r.name, r.avatar, "sm", r.userId)}
        <div class="who">
          <div class="name link" data-profile="${r.userId}">${esc(r.name)}</div>
          <div class="meta">${esc([r.position, r.dept].filter(Boolean).join(" · "))}</div>
          ${r.message ? `<div class="msg">${esc(r.message)}</div>` : ""}
        </div>
        <div class="btns">
          <button class="btn-primary sm" data-answer="accepted" data-user="${r.userId}">${t("accept")}</button>
          <button class="btn-ghost sm" data-answer="declined" data-user="${r.userId}">${t("decline")}</button>
        </div>
      </div>`).join("")}
    </div>`;
}
