// HTML for an idea card: header, cover, reaction bar, text and comments.
import { COMMENTS_PREVIEW, REACTION, REACTIONS } from "../config.js";
import { t } from "../i18n/index.js";
import { topRanking, totalReactions } from "../selectors.js";
import { state } from "../state.js";
import { esc, timeAgo } from "../utils.js";
import { avatarHTML } from "./avatar.js";

const ICON_EDIT = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>`;
const ICON_DELETE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
const ICON_SMILE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.3 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="3"/></svg>`;
const ICON_COMMENT = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12Z"/></svg>`;

export function postCardHTML(idea) {
  return `
  <article class="post" data-post="${idea.id}">
    ${headerHTML(idea)}
    ${coverHTML(idea)}
    ${reactionBarHTML(idea)}
    <div class="post-body">${bodyHTML(idea)}</div>
    ${commentsHTML(idea)}
  </article>`;
}

function headerHTML(i) {
  const meta = [i.position, i.dept || "Coremind"].filter(Boolean).join(" · ");
  const edited = i.edited ? ` · ${t("edited")}` : "";
  const ownerButtons = i.mine ? `
      <button class="del edit" data-edit="${i.id}" title="${esc(t("editIdea"))}" aria-label="${esc(t("editIdea"))}">${ICON_EDIT}</button>
      <button class="del" data-delete="${i.id}" title="${esc(t("deleteIdea"))}" aria-label="${esc(t("deleteIdea"))}">${ICON_DELETE}</button>` : "";
  return `
    <div class="post-head">
      ${avatarHTML(i.author, i.authorAvatar, "", i.authorId)}
      <div class="who">
        <div class="name link" data-profile="${i.authorId}">${esc(i.author)}</div>
        <div class="meta">${esc(meta)} · ${timeAgo(i.t)}${edited}</div>
      </div>
      <span class="pill ${i.type}">${t(i.type === "hack" ? "pillHack" : "pillProc")}</span>${ownerButtons}
    </div>`;
}

function coverHTML(i) {
  const rank = rankBadgeHTML(i);
  if (i.img) return `<div class="media">${rank}<img src="${esc(i.img)}" alt="" loading="lazy"></div>`;
  return `
    <div class="media">${rank}
      <div class="text-cover cover-${+i.cover || 1}">
        <div class="q">“</div><h2>${esc(i.title)}</h2>
        <div class="tagline">${t(i.type === "hack" ? "taglineHack" : "taglineProc")}</div>
      </div>
    </div>`;
}

/** 👑 🥈 🥉 on the three most reacted ideas, in the "Top" feed only. */
function rankBadgeHTML(i) {
  if (state.view !== "feed" || state.sort !== "top" || totalReactions(i) === 0) return "";
  const pos = topRanking().indexOf(i) + 1;
  if (pos < 1 || pos > 3) return "";
  return `<div class="rank ${pos === 1 ? "gold" : ""}">${["👑", "🥈", "🥉"][pos - 1]} ${t("rank", { n: pos })}</div>`;
}

function reactionBarHTML(i) {
  const mine = i.myReaction && REACTION[i.myReaction];
  const reactButton = mine
    ? `<button class="act mine" data-react-main="${i.id}"><span class="e">${mine.e}</span><span class="lbl">${t(mine.label)}</span></button>`
    : `<button class="act" data-react-main="${i.id}">${ICON_SMILE}<span class="lbl">${t("react")}</span></button>`;
  const picker = REACTIONS.map(r =>
    `<button class="${i.myReaction === r.k ? "on" : ""}" data-pick="${r.k}" data-id="${i.id}" data-label="${esc(t(r.label))}" aria-label="${esc(t(r.label))}">${r.e}</button>`).join("");

  const reactions = totalReactions(i), comments = i.comments.length;
  const totals = [
    reactions ? t("nReactions", { n: reactions }) : "",
    comments ? `<button data-expand="${i.id}">${t("nComments", { n: comments })}</button>` : "",
  ].filter(Boolean).join(" · ");

  // only the emojis people actually used, most used first
  const used = REACTIONS.filter(r => i.r[r.k] > 0).sort((a, b) => i.r[b.k] - i.r[a.k]);
  const chips = used.length ? `<div class="chips">${used.map(r =>
    `<button class="chip ${i.myReaction === r.k ? "on" : ""}" data-react="${r.k}" data-id="${i.id}" title="${esc(t(r.label))}"><span class="e">${r.e}</span>${i.r[r.k]}</button>`).join("")}</div>` : "";

  return `
    <div class="actions">
      <div class="react-wrap">${reactButton}<div class="picker">${picker}</div></div>
      <button class="act" data-focus-comment="${i.id}">${ICON_COMMENT}<span class="lbl">${t("comment")}</span></button>
      <span class="totals">${totals}</span>
    </div>${chips}`;
}

function bodyHTML(i) {
  const title = i.img ? `<h3>${esc(i.title)}</h3>` : "";   // text-only ideas show the title on the cover
  const desc = i.desc ? `<p>${esc(i.desc)}</p>` : "";
  const tags = i.tags.length
    ? `<div class="tags">${i.tags.map(tag => `<button data-tag="${esc(tag)}">#${esc(tag)}</button>`).join("")}</div>` : "";
  return title + desc + tags;
}

function commentsHTML(i) {
  const all = i.comments;
  const open = state.expanded.has(i.id);
  const shown = open ? all : all.slice(-COMMENTS_PREVIEW);
  const toggle = all.length > COMMENTS_PREVIEW
    ? `<button class="view-all" data-expand="${i.id}">${open ? t("showLess") : t("viewAll", { n: all.length })}</button>` : "";
  const me = state.me;
  return `
    <div class="comments">
      ${toggle}${shown.map(c => commentHTML(i, c)).join("")}
      <form class="comment-form" data-comment-form="${i.id}">
        ${me ? avatarHTML(me.name, me.avatar, "xs") : ""}
        <input class="comment-input" data-comment-input="${i.id}" maxlength="500" placeholder="${esc(t("addComment"))}" value="${esc(state.drafts[i.id] || "")}">
        <button class="send" type="submit">${t("send")}</button>
      </form>
    </div>`;
}

function commentHTML(idea, c) {
  const del = c.mine ? ` · <button data-del-comment="${c.id}" data-id="${idea.id}">${t("deleteComment")}</button>` : "";
  return `
    <div class="comment">
      ${avatarHTML(c.name, c.avatar, "xs", c.userId)}
      <div class="c-body">
        <div class="bubble"><span class="c-name link" data-profile="${c.userId}">${esc(c.name)}</span>${esc(c.body)}</div>
        <div class="c-meta">${timeAgo(c.t)}${del}</div>
      </div>
    </div>`;
}

export function emptyStateHTML() {
  const shareButton = label => `<button class="btn-primary" data-open-new><span class="plus">＋</span> ${t(label)}</button>`;
  if (state.view === "profile") {
    return `<div class="empty"><b>${t("noIdeasProfile")}</b>${state.profile?.me ? shareButton("shareIdea") : ""}</div>`;
  }
  if (state.query) return `<div class="empty"><b>${t("noMatch", { q: esc(state.query) })}</b>${t("tryOther")}</div>`;
  if (state.filter === "mine") return `<div class="empty"><b>${t("noMine")}</b>${t("noMineSub")}<br>${shareButton("shareIdea")}</div>`;
  return `<div class="empty"><b>${t("noIdeas")}</b>${t("beFirstShare")}<br>${shareButton("newIdea")}</div>`;
}
