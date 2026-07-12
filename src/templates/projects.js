import { escapeHtml, formatDate } from "./util.js";

export function renderProjects(projects) {
  if (!projects.length) {
    return `<h2>Projects</h2>
    <p class="empty-state">No projects to show yet — check back soon.</p>`;
  }

  const items = projects
    .map(
      (project) => `<li>
        <h3><a href="${escapeHtml(project.url)}">${escapeHtml(project.name)}</a></h3>
        ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
        <div class="project-meta">${[
          project.language ? escapeHtml(project.language) : "",
          `${project.stars ?? 0} star${project.stars === 1 ? "" : "s"}`,
          project.updatedAt ? `updated ${formatDate(project.updatedAt)}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}</div>
      </li>`
    )
    .join("\n      ");

  return `<h2>Projects</h2>
    <ul class="project-list">
      ${items}
    </ul>`;
}
