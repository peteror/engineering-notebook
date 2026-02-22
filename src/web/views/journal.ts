import { Database } from "bun:sqlite";

type JournalRow = {
  id: number;
  date: string;
  project_id: string;
  display_name: string;
  summary: string;
  topics: string;
  session_ids: string;
};

const PAGE_SIZE = 20;

export function renderJournal(db: Database, page: number, projectId?: string): string {
  const offset = (page - 1) * PAGE_SIZE;

  const whereClause = projectId ? "WHERE je.project_id = ?" : "";
  const countWhereClause = projectId ? "WHERE project_id = ?" : "";

  const entries = db
    .query(
      `
    SELECT je.id, je.date, je.project_id, p.display_name, je.summary, je.topics, je.session_ids
    FROM journal_entries je
    JOIN projects p ON je.project_id = p.id
    ${whereClause}
    ORDER BY je.date DESC, p.display_name
    LIMIT ? OFFSET ?
  `
    )
    .all(...(projectId ? [projectId, PAGE_SIZE, offset] : [PAGE_SIZE, offset])) as JournalRow[];

  const totalCount = db
    .query(`SELECT count(*) as c FROM journal_entries ${countWhereClause}`)
    .get(...(projectId ? [projectId] : [])) as { c: number };
  const totalPages = Math.ceil(totalCount.c / PAGE_SIZE);

  if (entries.length === 0) {
    return `
      <h2>No journal entries yet</h2>
      <p class="stat">Run <code>notebook ingest</code> then <code>notebook summarize --all</code> to generate entries.</p>
    `;
  }

  // Group by date
  const byDate = new Map<string, JournalRow[]>();
  for (const entry of entries) {
    if (!byDate.has(entry.date)) {
      byDate.set(entry.date, []);
    }
    byDate.get(entry.date)!.push(entry);
  }

  let html = "";

  for (const [date, dayEntries] of byDate) {
    html += `<div class="day-group">`;
    html += `<div class="day-header">${formatDate(date)}</div>`;

    for (const entry of dayEntries) {
      const topics: string[] = JSON.parse(entry.topics || "[]");
      const sessionIds: string[] = JSON.parse(entry.session_ids || "[]");

      html += `<div class="entry">`;
      html += `<div class="entry-project">${escapeHtml(entry.display_name)} <span class="stat">(${sessionIds.length} session${sessionIds.length !== 1 ? "s" : ""})</span></div>`;
      html += `<div class="entry-summary">${escapeHtml(entry.summary)}</div>`;

      if (topics.length > 0) {
        html += `<div class="entry-topics">`;
        for (const topic of topics) {
          html += `<span class="topic-tag">${escapeHtml(topic)}</span>`;
        }
        html += `</div>`;
      }

      html += `<button class="expand-btn" hx-get="/api/conversations?session_ids=${encodeURIComponent(JSON.stringify(sessionIds))}" hx-target="#convos-${entry.id}" hx-swap="innerHTML">Show conversations</button>`;
      html += `<div id="convos-${entry.id}"></div>`;
      html += `</div>`;
    }

    html += `</div>`;
  }

  // Pagination
  if (totalPages > 1) {
    html += `<div class="pagination">`;
    if (page > 1) {
      html += `<a href="/?page=${page - 1}">Previous</a>`;
    }
    html += `<span class="stat">Page ${page} of ${totalPages}</span>`;
    if (page < totalPages) {
      html += `<a href="/?page=${page + 1}">Next</a>`;
    }
    html += `</div>`;
  }

  return html;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
