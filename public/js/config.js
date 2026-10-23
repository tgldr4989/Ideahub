// App-wide constants.

// Hackathon submission deadline shown in the countdown — set the real date/time here.
export const HACKATHON_DEADLINE = "2026-11-20T18:00:00+08:00";

export const POLL_MS = 15000;          // how often the feed refreshes
export const COMMENTS_PREVIEW = 2;     // comments shown under a post before "View all"
export const REORDER_DELAY_MS = 900;   // wait before re-ranking after a reaction, so the card doesn't jump away

export const REACTIONS = [
  { k: "bulb",   e: "💡", label: "reactBulb" },
  { k: "fire",   e: "🔥", label: "reactFire" },
  { k: "rocket", e: "🚀", label: "reactRocket" },
  { k: "clap",   e: "👏", label: "reactClap" },
  { k: "heart",  e: "❤️", label: "reactHeart" },
];
export const REACTION = Object.fromEntries(REACTIONS.map(r => [r.k, r]));
export const QUICK_REACTION = "bulb";  // what a plain click on "React" gives

export const AVATAR_COLORS = ["#2f3fe0", "#7a2be2", "#1aa9d6", "#0f9a78", "#4b2fd6", "#d6378a", "#e0812f"];

export const IMAGE_MAX_PX = 1600;      // post images are shrunk to this before upload
export const AVATAR_PX = 320;          // profile photos are cropped square to this

export const CAN_HOVER = matchMedia("(hover: hover)").matches;
