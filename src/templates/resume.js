import { escapeHtml } from "./util.js";

export function renderResume(resume) {
  const contactLinks = [
    resume.email ? `<a href="mailto:${escapeHtml(resume.email)}">${escapeHtml(resume.email)}</a>` : "",
    ...resume.links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`),
    resume.resumeUrl ? `<a href="${escapeHtml(resume.resumeUrl)}">Resume (PDF)</a>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  const skillsHtml = resume.skills
    .map(
      (group) =>
        `<dt>${escapeHtml(group.category)}</dt>\n      <dd>${group.items.map(escapeHtml).join(", ")}</dd>`
    )
    .join("\n      ");

  const experienceHtml = resume.experience
    .map(
      (job) => `<div class="job">
        <div class="job-header">
          <span class="title-line">${escapeHtml(job.title)} — ${escapeHtml(job.company)}, ${escapeHtml(job.location)}</span>
          <span class="dates">${escapeHtml(job.dates)}</span>
        </div>
        <p>${escapeHtml(job.summary)}</p>
        <details>
          <summary>Full details</summary>
          <ul>
            ${job.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("\n            ")}
          </ul>
        </details>
      </div>`
    )
    .join("\n      ");

  const projectsHtml = resume.projects
    .map((project) => `<li><strong>${escapeHtml(project.name)}</strong> — ${escapeHtml(project.description)}</li>`)
    .join("\n      ");

  const educationHtml = resume.education
    .map(
      (edu) => `<li><strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.school)}<br>
      <span class="dates">${escapeHtml(edu.detail)}</span></li>`
    )
    .join("\n      ");

  const awardsHtml = (resume.additional?.awards ?? []).map((a) => `<li>${escapeHtml(a)}</li>`).join("\n      ");
  const publicationsHtml = (resume.additional?.publications ?? [])
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("\n      ");

  return `<h2>Resume</h2>
    <p class="contact-links">
    ${contactLinks}
    </p>

    <section class="section">
      <h2>Work Experience</h2>
      ${experienceHtml}
    </section>

    <section class="section">
      <h2>Projects</h2>
      <ul>
      ${projectsHtml}
      </ul>
    </section>

    <section class="section">
      <h2>Education</h2>
      <ul>
      ${educationHtml}
      </ul>
    </section>

    <section class="section">
      <h2>Skills</h2>
      <dl class="skills-list">
      ${skillsHtml}
      </dl>
    </section>

    <section class="section">
      <h2>Additional Information</h2>
      <p><strong>Awards</strong></p>
      <ul>
      ${awardsHtml}
      </ul>
      <p><strong>Publications</strong></p>
      <ul>
      ${publicationsHtml}
      </ul>
    </section>`;
}
