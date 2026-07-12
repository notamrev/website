import { escapeHtml } from "./util.js";
import { buildSkillsGraph } from "./graph-data.js";

function safeJsonForScriptTag(value) {
  // Prevent a project/language name that happens to contain "</script>"
  // from breaking out of the inline JSON <script> block.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function renderHome(resume, projects) {
  const githubLink = resume.links.find((link) => link.label === "GitHub");
  const skillsGraph = buildSkillsGraph(projects ?? [], githubLink?.url);

  const graphSection = skillsGraph.nodes.length
    ? `<section class="section">
      <h2>GitHub Activity</h2>
      <canvas id="skills-graph" width="680" height="320"></canvas>
      <script type="application/json" id="skills-graph-data">${safeJsonForScriptTag(skillsGraph)}</script>
      <p class="graph-legend">
        <span class="legend-dot legend-root"></span> GitHub
        <span class="legend-dot legend-category"></span> Category
        <span class="legend-dot legend-language"></span> Language
        <span class="legend-dot legend-project"></span> Project
      </p>
      <script src="graph.js" defer></script>
    </section>`
    : "";

  return `<h2>${escapeHtml(resume.name)}</h2>
    <p class="summary">${escapeHtml(resume.summary)}</p>

    ${graphSection}`;
}
