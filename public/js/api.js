// HTTP client for the Idea Hub API.
import { t, translateServerError } from "./i18n/index.js";

let onUnauthorized = () => {};

/** Called when the server says the session is gone (not for the login call itself). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/** JSON request; throws an Error with a readable (translated) message on failure. */
export async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url !== "/api/login") onUnauthorized();
  if (!res.ok) throw new Error(translateServerError(data.error || t("genericError")));
  return data;
}

export const api = {
  me: () => request("GET", "/api/me"),
  logout: () => request("POST", "/api/logout", {}),
  updateProfile: body => request("PUT", "/api/me", body),
  setLanguage: lang => request("PUT", "/api/me/lang", { lang }),
  getUser: id => request("GET", `/api/users/${id}`),

  listIdeas: () => request("GET", "/api/ideas"),
  createIdea: body => request("POST", "/api/ideas", body),
  updateIdea: (id, body) => request("PUT", `/api/ideas/${id}`, body),
  deleteIdea: id => request("DELETE", `/api/ideas/${id}`),
  react: (id, kind) => request("PUT", `/api/ideas/${id}/reaction`, { kind }),

  addComment: (ideaId, body) => request("POST", `/api/ideas/${ideaId}/comments`, { body }),
  deleteComment: id => request("DELETE", `/api/comments/${id}`),
};
