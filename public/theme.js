(function () {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  function updateLabel() {
    const isDark = document.documentElement.dataset.theme === "dark";
    btn.textContent = isDark ? "light" : "dark";
    btn.setAttribute("aria-pressed", String(isDark));
  }

  updateLabel();

  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    updateLabel();
  });
})();
