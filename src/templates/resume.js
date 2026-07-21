import { escapeHtml } from "./util.js";

export function renderResume(resume) {
  const contactLinks = [
    resume.email ? `<a href="mailto:${escapeHtml(resume.email)}">${escapeHtml(resume.email)}</a>` : "",
    ...resume.links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`),
  ]
    .filter(Boolean)
    .join("\n    ");

  const resumesHtml = (resume.resumes ?? [])
    .map(
      (r) => `<li>
        <a href="${escapeHtml(r.url)}">${escapeHtml(r.label)} (PDF)</a>
        <p>${escapeHtml(r.blurb)}</p>
      </li>`
    )
    .join("\n      ");

  const experienceHtml = resume.experience
    .map((job) => {
      const narrativeParagraphs = Array.isArray(job.narrative) ? job.narrative : [job.summary];
      const narrativeHtml = narrativeParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n        ");
      return `<div class="job">
        <div class="job-header">
          <span class="title-line">${escapeHtml(job.title)}, ${escapeHtml(job.company)}, ${escapeHtml(job.location)}</span>
          <span class="dates">${escapeHtml(job.dates)}</span>
        </div>
        ${narrativeHtml}
      </div>`;
    })
    .join("\n      ");

  const projectsHtml = resume.projects
    .map((project) => `<li><strong>${escapeHtml(project.name)}</strong>: ${escapeHtml(project.description)}</li>`)
    .join("\n      ");

  const educationHtml = resume.education
    .map(
      (edu) => `<li><strong>${escapeHtml(edu.degree)}</strong>, ${escapeHtml(edu.school)}<br>
      <span class="dates">${escapeHtml(edu.detail)}</span></li>`
    )
    .join("\n      ");

  const awardsHtml = (resume.additional?.awards ?? []).map((a) => `<li>${escapeHtml(a)}</li>`).join("\n      ");
  const publicationsHtml = (resume.additional?.publications ?? [])
    .map((p) => `<li>${escapeHtml(p)}</li>`)
    .join("\n      ");

  return `<h2>About Me</h2>
    <p class="contact-links">
    ${contactLinks}
    </p>

    <section class="section">
      <h2>Overview</h2>
      <p>${escapeHtml(resume.summary)}</p>
    </section>

    <section class="section">
      <h2>Résumés</h2>
      <ul class="resume-links">
      ${resumesHtml}
      </ul>
    </section>

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
