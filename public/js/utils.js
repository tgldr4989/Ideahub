// Small DOM and formatting helpers.
import { AVATAR_COLORS } from "./config.js";
import { getLang, t } from "./i18n/index.js";

export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = value => String(value ?? "").replace(/[&<>"']/g, c => HTML_ESCAPES[c]);

export const initials = name =>
  name.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();

export const colorFor = name =>
  AVATAR_COLORS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

export function timeAgo(ts) {
  const minutes = Math.round((Date.now() - ts) / 60000);
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("mAgo", { n: minutes });
  const hours = Math.round(minutes / 60);
  return hours < 24 ? t("hAgo", { n: hours }) : t("dAgo", { n: Math.round(hours / 24) });
}

export function formatDate(ts) {
  return new Date(ts).toLocaleDateString(getLang() === "mn" ? "mn-MN" : "en-US",
    { year: "numeric", month: "long", day: "numeric" });
}

/** Shrink a photo in the browser before upload (JPEG). `square` centre-crops, for profile photos. */
export function resizeImage(file, maxPx, square = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (square) {
        const side = Math.min(sw, sh);
        sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side;
      }
      const scale = Math.min(1, maxPx / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw * scale);
      canvas.height = Math.round(sh * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";   // transparent PNGs get a white background in JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t("badImage"))); };
    img.src = url;
  });
}
