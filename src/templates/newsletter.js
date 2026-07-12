import { escapeHtml, formatDate } from "./util.js";

export function renderNewsletterIndex(posts) {
  if (!posts.length) {
    return `<h2>Newsletter</h2>
    <p class="empty-state">No posts yet — check back soon.</p>`;
  }

  const items = posts
    .map((post) => {
      const tagsHtml = post.tags?.length
        ? `<div>${post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
        : "";
      return `<li>
        <h3><a href="${escapeHtml(post.slug)}.html">${escapeHtml(post.title)}</a></h3>
        <div class="post-meta">${formatDate(post.date)}</div>
        ${post.summary ? `<p>${escapeHtml(post.summary)}</p>` : ""}
        ${tagsHtml}
      </li>`;
    })
    .join("\n      ");

  return `<h2>Newsletter</h2>
    <ul class="post-list">
      ${items}
    </ul>`;
}

export function renderNewsletterPost(post) {
  const tagsHtml = post.tags?.length
    ? `<div>${post.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

  return `<a class="back-link" href="index.html">&larr; All posts</a>
    <h2>${escapeHtml(post.title)}</h2>
    <div class="post-meta">${formatDate(post.date)}</div>
    ${tagsHtml}
    <div class="post-content">
      ${post.contentHtml || ""}
    </div>`;
}
