import { Database } from "bun:sqlite";

type SearchRow = {
  id: number;
  date: string;
  project_id: string;
  display_name: string;
  summary: string;
  topics: string;
};

export function renderSearch(db: Database, query: string): string {
  let html = `<h2>Search</h2>`;
  html += `<input class="search-box" type="text" name="q" placeholder="Search journal entries and conversations..."
    hx-get="/search" hx-trigger="keyup changed delay:300ms" hx-target="#results" hx-include="this"
    value="${escapeHtml(query)}">`;
  html += `<div id="results">`;

  if (query) {
    html += renderSearchResults(db, query);
  }

  html += `</div>`;
  return html;
}

export function renderSearchResults(db: Database, query: string): string {
  const pattern = `%${query}%`;

  const journalResults = db
    .query(
      `
    SELECT je.id, je.date, je.project_id, p.display_name, je.summary, je.topics
    FROM journal_entries je
    JOIN projects p ON je.project_id = p.id
    WHERE je.summary LIKE ? OR je.topics LIKE ?
    ORDER BY je.date DESC
    LIMIT 20
  `
    )
    .all(pattern, pattern) as SearchRow[];

  const convoResults = db
    .query(
      `
    SELECT s.id as session_id, date(s.started_at) as date, p.display_name, c.conversation_markdown
    FROM conversations c
    JOIN sessions s ON c.session_id = s.id
    JOIN projects p ON s.project_id = p.id
    WHERE c.conversation_markdown LIKE ?
    ORDER BY s.started_at DESC
    LIMIT 20
  `
    )
    .all(pattern) as { session_id: string; date: string; display_name: string; conversation_markdown: string }[];

  let html = "";

  if (journalResults.length > 0) {
    html += `<h3 style="margin: 1rem 0 0.5rem;">Journal Entries (${journalResults.length})</h3>`;
    for (const r of journalResults) {
      html += `<div class="entry" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem;">`;
      html += `<div class="entry-project">${escapeHtml(r.display_name)} <span class="stat">${r.date}</span></div>`;
      html += `<div class="entry-summary">${highlightMatch(escapeHtml(r.summary), query)}</div>`;
      html += `</div>`;
    }
  }

  if (convoResults.length > 0) {
    html += `<h3 style="margin: 1rem 0 0.5rem;">Conversations (${convoResults.length})</h3>`;
    for (const r of convoResults) {
      html += `<div class="entry" style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem;">`;
      html += `<div class="entry-project">${escapeHtml(r.display_name)} <span class="stat">${r.date}</span></div>`;
      html += `<a href="/session/${r.session_id}" style="color: var(--accent); font-size: 0.85rem;">View session</a>`;
      html += `</div>`;
    }
  }

  if (journalResults.length === 0 && convoResults.length === 0) {
    html += `<p class="stat">No results found for "${escapeHtml(query)}"</p>`;
  }

  return html;
}

function highlightMatch(text: string, query: string): string {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  return text.replace(regex, `<mark style="background: var(--accent-2); color: var(--text);">$1</mark>`);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
