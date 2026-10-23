// Days / hours / minutes until the hackathon deadline, in the anniversary panel.
import { HACKATHON_DEADLINE } from "../config.js";
import { $$ } from "../utils.js";

export function startCountdown() {
  const deadline = new Date(HACKATHON_DEADLINE).getTime();
  const tick = () => {
    const left = Math.max(0, deadline - Date.now());
    const parts = [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60];
    $$("#countdown b").forEach((el, n) => { el.textContent = String(parts[n]).padStart(2, "0"); });
  };
  tick();
  setInterval(tick, 30e3);
}
