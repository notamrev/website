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
const OUTPUT_FILE = path.join(ROOT, "data", "newsletter.json");

loadEnvIfPresent(path.join(ROOT, ".env"));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

function warn(message) {
  console.warn(`[fetch-notion] ${message}`);
}

function writeOutput(entries) {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2) + "\n");
}

async function main() {
  if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
    warn(
      "NOTION_TOKEN or NOTION_DATABASE_ID not set — skipping Notion sync, leaving existing data/newsletter.json untouched."
    );
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
    return;
  }

  const notion = new Client({ auth: NOTION_TOKEN });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  try {
    const { dataSourceId, properties } = await getDataSourceAndProperties(notion, NOTION_DATABASE_ID);

    const titleProp = findProperty(properties, ["Title", "Name"], "title");
    const statusProp = findProperty(properties, ["Status"]);
    const dateProp = findProperty(properties, ["Date"], "date");
    const tagsProp = findProperty(properties, ["Tags"], "multi_select");
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
      const tags = tagsProp ? (props[tagsProp[0]]?.multi_select ?? []).map((t) => t.name) : [];
      const summary = summaryProp ? plainTextFrom(props[summaryProp[0]]?.rich_text) : "";
      const slugRaw = slugProp ? plainTextFrom(props[slugProp[0]]?.rich_text) : "";
      const slug = slugify(slugRaw) || slugify(title) || page.id;

      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const { parent: markdown } = n2m.toMarkdownString(mdBlocks);
      const contentHtml = marked.parse(markdown || "");

      entries.push({ id: page.id, slug, title, date, tags, summary, contentHtml });
    }

    writeOutput(entries);
    console.log(`[fetch-notion] Synced ${entries.length} newsletter entr${entries.length === 1 ? "y" : "ies"}.`);
  } catch (error) {
    warn(
      `Failed to sync Notion content (${error.message}). Leaving existing data/newsletter.json untouched. ` +
        "Check NOTION_TOKEN and that the database is shared with your integration — see README.md."
    );
    if (!fs.existsSync(OUTPUT_FILE)) writeOutput([]);
  }
}

await main();
