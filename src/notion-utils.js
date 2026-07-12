import fs from "node:fs";

export function loadEnvIfPresent(envFilePath) {
  if (fs.existsSync(envFilePath)) {
    process.loadEnvFile(envFilePath);
  }
}

export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function plainTextFrom(richTextArray) {
  return (richTextArray || []).map((t) => t.plain_text).join("");
}

// Finds a database property by trying candidate names first (case-insensitive),
// then optionally falling back to the first property matching `type` — a
// database's exact property names aren't guaranteed, so this keeps the script
// working even if the user names things slightly differently.
// Type-based fallback is only safe for types that are effectively unique per
// database (title, date, multi_select); it's deliberately NOT used for
// rich_text lookups (Summary, Slug, Location), since a database commonly has
// several rich_text properties and guessing wrong silently mixes up values.
export function findProperty(properties, candidates, type, { fallbackToType = true } = {}) {
  const entries = Object.entries(properties);
  for (const name of candidates) {
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match && (!type || match[1].type === type)) return match;
  }
  if (type && fallbackToType) {
    return entries.find(([, config]) => config.type === type);
  }
  return undefined;
}

// Resolves a database_id (as copied from a Notion URL) to its data source id
// and property schema. Notion's 2025-09 API split databases into one-or-more
// "data sources" — queries/property lookups go through the data source, not
// the database itself.
export async function getDataSourceAndProperties(notion, databaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = database.data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error("Database has no data sources");
  }
  const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
  return { dataSourceId, properties: dataSource.properties };
}

// Builds a `Status = Published` filter matching whichever property type
// (Notion's built-in "status" type, or a plain "select") the database uses.
export function buildPublishedFilter(statusProp) {
  if (!statusProp) return undefined;
  const [propName, propConfig] = statusProp;
  if (propConfig.type === "status") {
    return { property: propName, status: { equals: "Published" } };
  }
  if (propConfig.type === "select") {
    return { property: propName, select: { equals: "Published" } };
  }
  return undefined;
}
