// Entry point: wire everything up, then load the signed-in person (or show sign-in).
import { setUnauthorizedHandler } from "./api.js";
import { boot, startLiveRefresh } from "./app.js";
import { initEvents } from "./events.js";
import { initIdeaForm } from "./features/idea-form.js";
import { initDetailsEditor } from "./features/idea-page.js";
import { applyLanguage } from "./features/language.js";
import { initProfileEditor } from "./features/profile-editor.js";
import { initPickerHover } from "./features/reaction-picker.js";
import { initSignIn, showSignIn } from "./features/signin.js";
import { initRouter } from "./router.js";
import { startCountdown } from "./ui/countdown.js";

setUnauthorizedHandler(showSignIn);
initRouter();
initEvents();
initPickerHover();
initIdeaForm();
initDetailsEditor();
initProfileEditor();
initSignIn();
applyLanguage();
startCountdown();
startLiveRefresh();
boot();
