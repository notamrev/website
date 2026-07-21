import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderLayout } from "./templates/layout.js";
import { renderHome } from "./templates/home.js";
import { renderResume } from "./templates/resume.js";
import { renderNewsletterIndex, renderNewsletterPost } from "./templates/newsletter.js";
import { renderProjects } from "./templates/projects.js";
import { renderTripsIndex, renderTripPost } from "./templates/trips.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = path.join(ROOT, "data");
const DIST_DIR = path.join(ROOT, "dist");
const PUBLIC_DIR = path.join(ROOT, "public");

function readJson(filePath, { required = false } = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (required) {
      throw new Error(`Required data file missing or invalid: ${filePath} (${error.message})`);
    }
    console.warn(`[build] Could not read ${filePath} (${error.message}) — treating as empty.`);
    return [];
  }
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function main() {
  const resume = readJson(path.join(DATA_DIR, "resume.json"), { required: true });
  const newsletterPosts = readJson(path.join(DATA_DIR, "newsletter.json"));
  const projects = readJson(path.join(DATA_DIR, "projects.json"));
  const trips = readJson(path.join(DATA_DIR, "trips.json"));

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Home
  writeFile(
    path.join(DIST_DIR, "index.html"),
    renderLayout({
      title: resume.name,
      base: "",
      activeNav: "home",
      bodyHtml: renderHome(resume, projects),
      name: resume.name,
    })
  );

  // Newsletter index + individual posts
  writeFile(
    path.join(DIST_DIR, "newsletter", "index.html"),
    renderLayout({
      title: `Newsletter — ${resume.name}`,
      base: "../",
      activeNav: "newsletter",
      bodyHtml: renderNewsletterIndex(newsletterPosts),
      name: resume.name,
    })
  );
  for (const post of newsletterPosts) {
    writeFile(
      path.join(DIST_DIR, "newsletter", `${post.slug}.html`),
      renderLayout({
        title: `${post.title} — Newsletter — ${resume.name}`,
        base: "../",
        activeNav: "newsletter",
        bodyHtml: renderNewsletterPost(post),
        name: resume.name,
      })
    );
  }

  // Projects
  writeFile(
    path.join(DIST_DIR, "projects", "index.html"),
    renderLayout({
      title: `Projects — ${resume.name}`,
      base: "../",
      activeNav: "projects",
      bodyHtml: renderProjects(projects),
      name: resume.name,
    })
  );

  // About Me (recruiter-facing: links, overview, skills, experience)
  writeFile(
    path.join(DIST_DIR, "resume", "index.html"),
    renderLayout({
      title: `About Me — ${resume.name}`,
      base: "../",
      activeNav: "about",
      bodyHtml: renderResume(resume),
      name: resume.name,
    })
  );

  // Trips index + individual posts
  writeFile(
    path.join(DIST_DIR, "trips", "index.html"),
    renderLayout({
      title: `Trips — ${resume.name}`,
      base: "../",
      activeNav: "trips",
      bodyHtml: renderTripsIndex(trips, "../"),
      name: resume.name,
    })
  );
  for (const trip of trips) {
    writeFile(
      path.join(DIST_DIR, "trips", `${trip.slug}.html`),
      renderLayout({
        title: `${trip.title} — Trips — ${resume.name}`,
        base: "../",
        activeNav: "trips",
        bodyHtml: renderTripPost(trip, "../"),
        name: resume.name,
      })
    );
  }

  // Static assets
  fs.copyFileSync(path.join(PUBLIC_DIR, "styles.css"), path.join(DIST_DIR, "styles.css"));
  fs.copyFileSync(path.join(PUBLIC_DIR, "graph.js"), path.join(DIST_DIR, "graph.js"));
  fs.copyFileSync(path.join(PUBLIC_DIR, "theme.js"), path.join(DIST_DIR, "theme.js"));
  fs.copyFileSync(path.join(PUBLIC_DIR, "favicon.svg"), path.join(DIST_DIR, "favicon.svg"));
  const resumeFilesSource = path.join(PUBLIC_DIR, "resume");
  if (fs.existsSync(resumeFilesSource)) {
    fs.cpSync(resumeFilesSource, path.join(DIST_DIR, "resume"), { recursive: true });
  }
  const tripImagesSource = path.join(DATA_DIR, "trip-images");
  if (fs.existsSync(tripImagesSource)) {
    fs.cpSync(tripImagesSource, path.join(DIST_DIR, "assets", "trips"), { recursive: true });
  }

  console.log(
    `[build] Wrote dist/index.html, dist/newsletter/index.html (+${newsletterPosts.length} posts), ` +
      `dist/trips/index.html (+${trips.length} trips), dist/projects/index.html, dist/resume/index.html.`
  );
}

main();
