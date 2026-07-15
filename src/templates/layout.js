import { escapeHtml } from "./util.js";

const NAV_ITEMS = [
  { key: "home", label: "Home", href: "index.html" },
  { key: "newsletter", label: "Newsletter", href: "newsletter/index.html" },
  { key: "trips", label: "Trips", href: "trips/index.html" },
  { key: "projects", label: "Projects", href: "projects/index.html" },
  { key: "about", label: "About Me", href: "resume/index.html" },
];

// `base` is the relative path back to the dist/ root: "" for root-level
// pages (index.html), "../" for anything one directory deep (newsletter/*,
// trips/*, projects/index.html, resume/index.html). All internal links are
// built from it so the same template works regardless of where the page
// ends up on disk.
export function renderLayout({ title, base, activeNav, bodyHtml, name }) {
  const navHtml = NAV_ITEMS.map((item) => {
    const current = item.key === activeNav ? ' aria-current="page"' : "";
    return `<a href="${base}${item.href}"${current}>${escapeHtml(item.label)}</a>`;
  }).join(" ·\n      ");

  const isHome = activeNav === "home";
  const footerName = isHome ? "" : `${escapeHtml(name)} · `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="${base}favicon.svg">
  <link rel="stylesheet" href="${base}styles.css">
  <script>
    (function () {
      var saved = localStorage.getItem("theme");
      var theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
    })();
  </script>
</head>
<body>
  <header class="site-header">
    <nav class="site-nav">
      ${navHtml} ·
      <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false">dark</button>
    </nav>
  </header>
  <main>
${bodyHtml}
  </main>
  <footer class="site-footer">
    ${footerName}Built with node and my notion databases.
  </footer>
  <script src="${base}theme.js" defer></script>
</body>
</html>
`;
}
