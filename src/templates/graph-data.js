// Maps a GitHub repo's primary language to a coarse skill category. Not
// exhaustive — anything not listed falls into "Other" rather than guessing.
const CATEGORY_RULES = [
  { category: "Backend", languages: ["Java", "Kotlin", "Go", "Python", "C#", "Ruby", "PHP", "Rust", "Scala", "Elixir", "C", "C++"] },
  { category: "Frontend", languages: ["JavaScript", "TypeScript", "HTML", "CSS", "Vue", "Svelte"] },
  { category: "Tooling & Infra", languages: ["Shell", "Dockerfile", "Makefile", "HCL", "Lua", "PowerShell", "Vim Script"] },
];

function categorize(language) {
  if (!language) return "Other";
  const rule = CATEGORY_RULES.find((r) => r.languages.includes(language));
  return rule ? rule.category : "Other";
}

function usernameFromGithubUrl(url) {
  if (!url) return "GitHub";
  const match = url.replace(/\/+$/, "").match(/([^/]+)$/);
  return match ? `@${match[1]}` : "GitHub";
}

// Builds a 4-tier node/edge graph: root (GitHub account) -> category ->
// language -> project. Connecting every category to a single root keeps the
// whole thing as one component under the force simulation, instead of
// several disjoint clusters drifting apart with no way to recenter them.
// Node ids are prefixed by tier so nodes across tiers can never collide.
export function buildSkillsGraph(projects, githubProfileUrl) {
  const nodes = new Map();
  const edges = [];

  function upsertNode(id, label, type, extra) {
    if (!nodes.has(id)) {
      nodes.set(id, { id, label, type, count: 0, ...extra });
    }
    const node = nodes.get(id);
    node.count += 1;
    return node;
  }

  if (!projects.length) {
    return { nodes: [], edges: [] };
  }

  const rootNode = upsertNode("root", usernameFromGithubUrl(githubProfileUrl), "root", {
    url: githubProfileUrl,
  });

  for (const project of projects) {
    const category = categorize(project.language);
    const categoryNode = upsertNode(`cat:${category}`, category, "category");
    edges.push({ source: rootNode.id, target: categoryNode.id });

    const languageLabel = project.language || "Other";
    const languageNode = upsertNode(`lang:${languageLabel}`, languageLabel, "language");
    edges.push({ source: categoryNode.id, target: languageNode.id });

    const projectNode = upsertNode(`proj:${project.name}`, project.name, "project", { url: project.url });
    edges.push({ source: languageNode.id, target: projectNode.id });
  }

  // Dedupe edges (root->category and category->language repeat once per
  // project sharing that category/language).
  const seenEdges = new Set();
  const uniqueEdges = edges.filter((e) => {
    const key = `${e.source}->${e.target}`;
    if (seenEdges.has(key)) return false;
    seenEdges.add(key);
    return true;
  });

  return { nodes: Array.from(nodes.values()), edges: uniqueEdges };
}
