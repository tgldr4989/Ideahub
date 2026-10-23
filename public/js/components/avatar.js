import { colorFor, esc, initials } from "../utils.js";

/**
 * Round avatar: the photo if there is one, else coloured initials.
 * With a userId it becomes a button that opens that person's profile.
 */
export function avatarHTML(name, photo, size = "", userId = null) {
  const inner = photo
    ? `<img src="${esc(photo)}" alt="">`
    : `<b style="background:${colorFor(name)}">${esc(initials(name))}</b>`;
  return userId != null
    ? `<button class="avatar ${size}" data-profile="${userId}" title="${esc(name)}">${inner}</button>`
    : `<div class="avatar ${size}">${inner}</div>`;
}
