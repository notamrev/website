import { escapeHtml, formatDate } from "./util.js";

const ASSET_BASE_PLACEHOLDER = "__ASSET_BASE__";

export function renderTripsIndex(trips, base) {
  if (!trips.length) {
    return `<h2>Trips</h2>
    <p class="empty-state">No trips posted yet — check back soon.</p>`;
  }

  const cards = trips
    .map((trip) => {
      const cover = trip.coverImage
        ? `<img class="trip-cover" src="${base}${escapeHtml(trip.coverImage)}" alt="">`
        : `<div class="trip-cover trip-cover-empty"></div>`;
      return `<li class="trip-card">
        <a href="${escapeHtml(trip.slug)}.html">
          ${cover}
          <div class="trip-card-body">
            <h3>${escapeHtml(trip.title)}</h3>
            <div class="post-meta">
              <span class="tag">${escapeHtml(trip.type)}</span>
              ${formatDate(trip.date)}${trip.location ? ` · ${escapeHtml(trip.location)}` : ""}
            </div>
            ${trip.summary ? `<p>${escapeHtml(trip.summary)}</p>` : ""}
          </div>
        </a>
      </li>`;
    })
    .join("\n      ");

  return `<h2>Trips</h2>
    <ul class="trip-list">
      ${cards}
    </ul>`;
}

export function renderTripPost(trip, base) {
  const contentHtml = (trip.contentHtml || "").split(ASSET_BASE_PLACEHOLDER).join(base);

  return `<a class="back-link" href="index.html">&larr; All trips</a>
    <h2>${escapeHtml(trip.title)}</h2>
    <div class="post-meta">
      <span class="tag">${escapeHtml(trip.type)}</span>
      ${formatDate(trip.date)}${trip.location ? ` · ${escapeHtml(trip.location)}` : ""}
    </div>
    ${trip.summary ? `<p class="summary">${escapeHtml(trip.summary)}</p>` : ""}
    <div class="post-content trip-content">
      ${contentHtml}
    </div>`;
}
