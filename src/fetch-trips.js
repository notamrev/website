import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadEnvIfPresent,
  slugify,
  plainTextFrom,
  findProperty,
  getDataSourceAndProperties,
  buildPublishedFilter,
} from "./notion-utils.js";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUTPUT_FILE = path.join(ROOT, "data", "trips.json");
const IMAGE_DIR = path.join(ROOT, "data", "trip-images");
// Content images use this placeholder instead of a real base path, since
// fetch-trips.js has no idea how deep a trip's page will end up in dist/ —
// the template layer substitutes the real "../" (or "") prefix at render time.
const ASSET_BASE_PLACEHOLDER = "__ASSET_BASE__";

loadEnvIfPresent(path.join(ROOT, ".env"));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_TRIPS_DATABASE_ID = process.env.NOTION_TRIPS_DATABASE_ID;

function warn(message) {
  console.warn(`[fetch-trips] ${message}`);
}

function writeOutput(entries) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2) + "\n");
}

function extensionFromUrlOrContentType(url, contentType) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
  if (match) return match[1].toLowerCase();
  const byType = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  return byType[contentType] || "jpg";
}

// Notion's image block URLs are signed and expire after ~1hr, so they can't
// be embedded directly. This downloads each image once into data/trip-images/
// (skipping ones already downloaded from a prior run) and rewrites the
// markdown to point at the local copy instead.
async function downloadAndRewriteImages(markdown, slug) {
  const imageDir = path.join(IMAGE_DIR, slug);
  const urlPattern = /!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g;
  const matches = [...markdown.matchAll(urlPattern)];
  if (!matches.length) return { markdown, coverImage: null };

  fs.mkdirSync(imageDir, { recursive: true });
  let rewritten = markdown;
  let coverImage = null;

  for (let i = 0; i < matches.length; i++) {
    const [full, alt, url] = matches[i];
    const index = i + 1;
    const existing = fs.readdirSync(imageDir).find((f) => f.startsWith(`${index}.`));
    let filename = existing;

    if (!filename) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          warn(`Failed to download image ${index} for "${slug}" (HTTP ${response.status}), skipping it.`);
          continue;
        }
        const ext = extensionFromUrlOrContentType(url, response.headers.get("content-type"));
        filename = `${index}.${ext}`;
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(path.join(imageDir, filename), buffer);
      } catch (error) {
        warn(`Error downloading image ${index} for "${slug}" (${error.message}), skipping it.`);
        continue;
      }
    }

    const localPath = `assets/trips/${slug}/${filename}`;
    rewritten = rewritten.replace(full, `![${alt}](${ASSET_BASE_PLACEHOLDER}${localPath})`);
    if (!coverImage) coverImage = localPath;
  }

  return { markdown: rewritten, coverImage };
}

async function main() {
  if (!NOTION_TOKEN || !NOTION_TRIPS_DATABASE_ID) {
    warn(
      "NOTION_TOKEN or NOTION_TRIPS_DATABASE_ID not set — skipping trips sync, leaving existing data/trips.json untouched."
    );
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
    return;
  }

  const notion = new Client({ auth: NOTION_TOKEN });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  try {
    const { dataSourceId, properties } = await getDataSourceAndProperties(notion, NOTION_TRIPS_DATABASE_ID);

    const titleProp = findProperty(properties, ["Title", "Name"], "title");
    const statusProp = findProperty(properties, ["Status"]);
    const typeProp = findProperty(properties, ["Type"], "select");
    const dateProp = findProperty(properties, ["Date"], "date");
    const locationProp = findProperty(properties, ["Location"], "rich_text", { fallbackToType: false });
    const summaryProp = findProperty(properties, ["Summary"], "rich_text", { fallbackToType: false });
    const slugProp = findProperty(properties, ["Slug"], "rich_text", { fallbackToType: false });

    const filter = buildPublishedFilter(statusProp);
    const sorts = dateProp ? [{ property: dateProp[0], direction: "descending" }] : undefined;

    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
    });

    const entries = [];
    for (const page of response.results) {
      if (!("properties" in page)) continue;
      const props = page.properties;

      const title = titleProp ? plainTextFrom(props[titleProp[0]]?.title) : "Untitled";
      const date = dateProp ? props[dateProp[0]]?.date?.start ?? page.created_time : page.created_time;
      const type = typeProp ? props[typeProp[0]]?.select?.name ?? "Trip" : "Trip";
      const location = locationProp ? plainTextFrom(props[locationProp[0]]?.rich_text) : "";
      const summary = summaryProp ? plainTextFrom(props[summaryProp[0]]?.rich_text) : "";
      const slugRaw = slugProp ? plainTextFrom(props[slugProp[0]]?.rich_text) : "";
      const slug = slugify(slugRaw) || slugify(title) || page.id;

      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const { parent: rawMarkdown } = n2m.toMarkdownString(mdBlocks);
      const { markdown, coverImage } = await downloadAndRewriteImages(rawMarkdown || "", slug);
      const contentHtml = marked.parse(markdown || "");

      entries.push({ id: page.id, slug, title, type, date, location, summary, coverImage, contentHtml });
    }

    writeOutput(entries);
    console.log(`[fetch-trips] Synced ${entries.length} trip${entries.length === 1 ? "" : "s"}.`);
  } catch (error) {
    warn(
      `Failed to sync trips (${error.message}). Leaving existing data/trips.json untouched. ` +
        "Check NOTION_TOKEN and that the database is shared with your integration — see README.md."
    );
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
  }
}

await main();
