import { applyI18n, setLanguage, t } from "./i18n.js";
import { qs } from "./core.js";
import { toast } from "./helper.js";

export function initSettingsPage() {
  const form = qs("#settings-form");
  if (!form) return;

  applyI18n(form);
  qs("#dashboard-language")?.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    toast(t("settingsSaved"));
  });
}
