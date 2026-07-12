import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUTPUT_FILE = path.join(ROOT, "data", "projects.json");
const GITHUB_USERNAME = "notamrev";

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
    .filter((repo) => !repo.fork)
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
  console.log(`[fetch-github] Synced ${projects.length} project${projects.length === 1 ? "" : "s"} for ${GITHUB_USERNAME}.`);
}

await main();
