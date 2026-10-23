// The idea landing page (#/i/<id>): hero, actions, the write-up, documents, comments,
// and a sidebar with progress, team and facts.
import { DETAIL_SECTIONS, STATUS, STATUSES } from "../config.js";
import { t } from "../i18n/index.js";
import { esc, formatDate, timeAgo } from "../utils.js";
import { avatarHTML } from "./avatar.js";
import { commentsHTML, reactionBarHTML } from "./post-card.js";

export function ideaPageHTML(i) {
  // Devpost-style project page: white header, picture and story in the main column, team first in the sidebar
  return `
  <div data-post="${i.id}">
    ${heroHTML(i)}
    <div class="landing-body">
      <div class="landing-wrap">
        <div class="landing-grid">
          <div class="landing-main">
            ${i.img ? `<div class="project-media"><img src="${esc(i.img)}" alt=""></div>` : ""}
            ${actionStripHTML(i)}
            ${detailsHTML(i)}
            ${documentsHTML(i)}
            ${commentsCardHTML(i)}
          </div>
          <aside class="landing-side">
            ${teamCardHTML(i)}
            ${progressCardHTML(i)}
            ${aboutCardHTML(i)}
          </aside>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- hero

function heroHTML(i) {
  const status = STATUS[i.status] || STATUS.new;
  const ownerButtons = i.mine ? `
      <div class="hero-owner">
        <button class="hero-btn" data-edit="${i.id}">✏️ ${t("editTitle")}</button>
        <button class="hero-btn" data-edit-details>📄 ${t("editDetails")}</button>
        <button class="hero-btn icon" data-delete="${i.id}" title="${esc(t("deleteIdea"))}" aria-label="${esc(t("deleteIdea"))}">🗑</button>
      </div>` : "";
  const meta = [i.position, i.dept].filter(Boolean).join(" · ");
  return `
    <section class="landing-hero cover-${+i.cover || 1}">
      <div class="landing-wrap">
        <div class="hero-top">
          <button class="hero-back" data-go-feed>${t("back")}</button>
          ${ownerButtons}
        </div>
        <div class="hero-grid no-image">
          <div class="hero-text">
            <div class="hero-badges">
              <span class="hero-pill">${t(i.type === "hack" ? "taglineHack" : "taglineProc")}</span>
              <span class="hero-pill s-${status.k}"><span class="dot"></span>${t(status.label)}</span>
            </div>
            <h1>${esc(i.title)}</h1>
            ${i.desc ? `<p class="hero-lead">${esc(i.desc)}</p>` : ""}
            <div class="hero-author">
              ${avatarHTML(i.author, i.authorAvatar, "", i.authorId)}
              <div>
                <div class="name link" data-profile="${i.authorId}">${esc(i.author)}</div>
                <div class="meta">${esc(meta ? `${meta} · ` : "")}${timeAgo(i.t)}${i.edited ? ` · ${t("edited")}` : ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

/** Reactions and comment count, plus a shortcut to the join form when joining is open. */
function actionStripHTML(i) {
  const canJoin = !i.mine && i.status === "confirmed" && !["pending", "accepted"].includes(i.myRequest?.status);
  return `
    <div class="action-strip">
      ${reactionBarHTML(i)}
      ${canJoin ? `<button class="btn-primary" data-focus-join>🙋 ${t("joinTeam")}</button>` : ""}
    </div>`;
}

// ---------------------------------------------------------------- main column

function card(title, body, { action = "", cls = "" } = {}) {
  return `
    <section class="l-card ${cls}">
      <div class="l-head"><h2>${title}</h2>${action}</div>
      ${body}
    </section>`;
}

function detailsHTML(i) {
  const details = i.details || {};
  const filled = DETAIL_SECTIONS.filter(([key]) => details[key]);
  if (!filled.length) {
    if (!i.mine) return card(`📄 ${t("details")}`, `<p class="muted">${t("noDetails")}</p>`);
    return `
      <section class="l-card details-empty">
        <div class="big">📄</div>
        <h2>${t("addDetails")}</h2>
        <p>${t("addDetailsHint")}</p>
        <button class="btn-primary" data-edit-details>＋ ${t("addDetails")}</button>
      </section>`;
  }
  const story = filled.map(([key, label, icon]) => `
      <div class="story-part">
        <h3><span class="story-icon">${icon}</span>${t(label)}</h3>
        <p>${esc(details[key])}</p>
      </div>`).join("");
  return card(`📄 ${t("details")}`, `<div class="story">${story}</div>`, { cls: "story-card" });
}

function documentsHTML(i) {
  if (!i.links?.length) return "";
  const items = i.links.map(link => `
      <li><a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">
        <span class="doc-icon">📎</span>
        <span class="doc-text"><span class="lt">${esc(link.title)}</span><span class="lu">${esc(hostOf(link.url))}</span></span>
        <span class="doc-open">↗</span>
      </a></li>`).join("");
  return card(`📎 ${t("links")}`, `<ul class="links">${items}</ul>`);
}

function hostOf(url) {
  try { return new URL(url).host; } catch { return ""; }
}

function commentsCardHTML(i) {
  return card(`💬 ${t("commentsTitle")} · ${i.comments.length}`, commentsHTML(i, { showAll: true }), { cls: "comments-card" });
}

// ---------------------------------------------------------------- sidebar

/** New → Confirmed → In progress → Done as a vertical timeline, plus the moves this person may make. */
function progressCardHTML(i) {
  const current = STATUSES.findIndex(s => s.k === i.status);
  const steps = STATUSES.map((s, n) => {
    const state = n < current ? "past" : n === current ? "now" : "";
    return `
      <li class="${state}">
        <span class="dot">${n < current ? "✓" : n + 1}</span>
        <span class="lbl">${t(s.label)}${n === current ? `<small>${t("currentStage")}</small>` : ""}</span>
      </li>`;
  }).join("");
  const options = i.statusOptions || [];
  const actions = options.length ? `
      <div class="status-actions">
        <span>${t("changeStatus")}</span>
        ${options.map(s => `<button class="btn-soft sm s-${s}" data-set-status="${s}"><span class="dot"></span>${t(STATUS[s].label)}</button>`).join("")}
      </div>` : "";
  return card(`📍 ${t("progress")}`, `<ol class="timeline">${steps}</ol>${actions}`);
}

function teamCardHTML(i) {
  const members = [
    { userId: i.authorId, name: i.author, avatar: i.authorAvatar, role: t("author") },
    ...(i.team || []).map(m => ({ ...m, role: m.position || m.dept || "" })),
  ];
  const list = `<div class="team">${members.map(m => `
      <div class="member">
        ${avatarHTML(m.name, m.avatar, "sm", m.userId)}
        <div><div class="name link" data-profile="${m.userId}">${esc(m.name)}</div><div class="meta">${esc(m.role)}</div></div>
      </div>`).join("")}</div>`;
  return card(`👥 ${t("team")} · ${members.length}`, list + (i.mine ? requestsHTML(i) : joinHTML(i)), { cls: "team-card" });
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
        <div class="request-who">
          ${avatarHTML(r.name, r.avatar, "sm", r.userId)}
          <div>
            <div class="name link" data-profile="${r.userId}">${esc(r.name)}</div>
            <div class="meta">${esc([r.position, r.dept].filter(Boolean).join(" · "))}</div>
          </div>
        </div>
        ${r.message ? `<div class="msg">${esc(r.message)}</div>` : ""}
        <div class="btns">
          <button class="btn-primary sm" data-answer="accepted" data-user="${r.userId}">${t("accept")}</button>
          <button class="btn-ghost sm" data-answer="declined" data-user="${r.userId}">${t("decline")}</button>
        </div>
      </div>`).join("")}
    </div>`;
}

function aboutCardHTML(i) {
  const rows = [
    [t("type"), t(i.type === "hack" ? "hackIdea" : "procIdea")],
    [t("posted"), formatDate(i.t)],
  ].map(([label, value]) => `<div class="fact"><span>${label}</span><b>${esc(value)}</b></div>`).join("");
  const tags = i.tags.length
    ? `<div class="fact-tags">${i.tags.map(tag => `<button class="tag-chip" data-tag="${esc(tag)}">#${esc(tag)}</button>`).join("")}</div>` : "";
  return card(`ℹ️ ${t("aboutIdea")}`, rows + tags);
}
