// Sign-in screen. The submit handler is the Active Directory sign-in from feature/ad-login-docker,
// moved here unchanged from index.html.
import { request as api } from "../api.js";
import { startApp } from "../app.js";
import { t } from "../i18n/index.js";
import { state } from "../state.js";
import { $ } from "../utils.js";

export function showSignIn() {
  state.me = null;
  $("#signin").hidden = false;
  setTimeout(() => $("#sEmail").focus(), 50);
}

export function initSignIn() {
  $("#signinForm").addEventListener("submit", async e => {
    e.preventDefault();
    $("#sErr").textContent = "";
    $("#sBtn").disabled = true;
    try {
      const { user } = await api("POST", "/api/login", {
        email: $("#sEmail").value, password: $("#sPass").value,
      });
      $("#sPass").value = "";
      startApp(user);
    } catch (err) {
      $("#sErr").textContent = err.message;
    } finally {
      $("#sBtn").disabled = false;
    }
  });
}

/** The sign-in markup has no data-i18n attributes, so its text is set here. */
export function translateSignIn() {
  const formEl = $("#signinForm");
  const [intro, hint] = formEl.querySelectorAll("p");
  const [emailLabel, passwordLabel] = formEl.querySelectorAll("label");
  $("#signin h1").textContent = t("welcome");
  intro.textContent = t("signinIntro");
  hint.textContent = t("pwHint");
  setLabelText(emailLabel, t("workEmail"));
  setLabelText(passwordLabel, t("password"));
  $("#sBtn").textContent = t("continue");
}

/** Labels wrap their input; replace only the text in front of it. */
function setLabelText(label, text) {
  const node = [...label.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (node) node.textContent = text;
  else label.prepend(text);
}
