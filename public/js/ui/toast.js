import { $ } from "../utils.js";

let hideTimer;

export function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
