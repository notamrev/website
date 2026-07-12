import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUTPUT_FILE = path.join(ROOT, "data", "projects.json");
const GITHUB_USERNAME = "notamrev";
// Only repos tagged with this GitHub topic show up on the Projects page —
// being public isn't enough on its own. Add the topic via a repo's page on
// GitHub: "..." menu / gear icon next to "About" -> Topics.
const PORTFOLIO_TOPIC = "portfolio";

function warn(message) {
  console.warn(`[fetch-github] ${message}`);
}

function writeOutput(repos) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(repos, null, 2) + "\n");
}

async function main() {
  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "notamrev-portfolio-site-build",
        Accept: "application/vnd.github+json",
      },
    });
  } catch (error) {
    warn(`Network error fetching GitHub repos (${error.message}). Leaving existing data/projects.json untouched.`);
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
    return;
  }

  if (!response.ok) {
    const resetHeader = response.headers.get("x-ratelimit-reset");
    const resetInfo = resetHeader
      ? ` Rate limit resets at ${new Date(Number(resetHeader) * 1000).toISOString()}.`
      : "";
    warn(
      `GitHub API returned ${response.status} ${response.statusText}.${resetInfo} Leaving existing data/projects.json untouched.`
    );
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
    return;
  }

  const repos = await response.json();

  const projects = repos
    .filter((repo) => !repo.fork && (repo.topics ?? []).includes(PORTFOLIO_TOPIC))
    .map((repo) => ({
      name: repo.name,
      description: repo.description ?? "",
      language: repo.language ?? "",
      url: repo.html_url,
      stars: repo.stargazers_count,
      updatedAt: repo.pushed_at,
    }))
    .sort((a, b) => b.stars - a.stars || new Date(b.updatedAt) - new Date(a.updatedAt));

  writeOutput(projects);
  const untaggedCount = repos.filter((r) => !r.fork).length - projects.length;
  console.log(
    `[fetch-github] Synced ${projects.length} project${projects.length === 1 ? "" : "s"} for ${GITHUB_USERNAME} ` +
      `(tagged "${PORTFOLIO_TOPIC}"). ${untaggedCount} other public repo${untaggedCount === 1 ? "" : "s"} skipped — add the "${PORTFOLIO_TOPIC}" topic on GitHub to feature them.`
  );
}

await main();
