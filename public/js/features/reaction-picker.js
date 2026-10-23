// The emoji row that pops up over a post's React button.
import { CAN_HOVER } from "../config.js";

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 300;

let openWrap = null;
let timer = null;

export const isPickerOpen = () => openWrap !== null;

export function openPicker(wrap) {
  closePicker();
  wrap.classList.add("open");
  openWrap = wrap;
}

export function closePicker() {
  clearTimeout(timer);
  openWrap?.classList.remove("open");
  openWrap = null;
}

export function togglePicker(wrap) {
  if (wrap === openWrap) closePicker();
  else openPicker(wrap);
}

/** On devices with a mouse, hovering the React button opens the row; leaving it closes it. */
export function initPickerHover() {
  if (!CAN_HOVER) return;
  document.addEventListener("mouseover", e => {
    const wrap = e.target.closest(".react-wrap");
    clearTimeout(timer);
    if (wrap && wrap !== openWrap) timer = setTimeout(() => openPicker(wrap), OPEN_DELAY_MS);
    else if (!wrap && openWrap) timer = setTimeout(closePicker, CLOSE_DELAY_MS);
  });
}
