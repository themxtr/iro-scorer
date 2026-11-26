const THEME_STORAGE_KEY = "roboGTheme";

function applyTheme(theme, savePreference) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = selectedTheme;

  if (savePreference) localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);

  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    const targetTheme = selectedTheme === "dark" ? "light" : "dark";
    button.textContent = `${targetTheme === "dark" ? "Dark" : "Light"} mode`;
    button.setAttribute("aria-label", `Switch to ${targetTheme} theme`);
    button.setAttribute("aria-pressed", String(selectedTheme === "dark"));
  });

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = selectedTheme === "dark" ? "#081b30" : "#f3f6fb";
}

export function initThemeToggle() {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light", false);

  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(nextTheme, true);
    });
  });

  window.addEventListener("storage", event => {
    if (event.key === THEME_STORAGE_KEY) applyTheme(event.newValue || "light", false);
  });
}
