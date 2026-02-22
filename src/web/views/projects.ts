import { Database } from "bun:sqlite";

type ProjectRow = {
  id: string;
  path: string;
  display_name: string;
  description: string;
  first_session_at: string | null;
  last_session_at: string | null;
  session_count: number;
};

export function renderProjects(db: Database): string {
  const projects = db
    .query(`SELECT * FROM projects ORDER BY last_session_at DESC`)
    .all() as ProjectRow[];

  if (projects.length === 0) {
    return `<h2>No projects yet</h2><p class="stat">Run <code>notebook ingest</code> first.</p>`;
  }

  let html = `<h2>Projects (${projects.length})</h2>`;
  html += `<div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">`;

  for (const p of projects) {
    html += `<div class="day-group" style="margin-bottom: 0;">`;
    html += `<div class="entry">`;
    html += `<div class="entry-project"><a href="/project/${encodeURIComponent(p.id)}" style="color: var(--accent); text-decoration: none;">${escapeHtml(p.display_name || p.id)}</a></div>`;
    if (p.description) {
      html += `<div class="entry-summary">${escapeHtml(p.description)}</div>`;
    }
    html += `<div class="stat" style="margin-top: 0.5rem;">${p.session_count} sessions`;
    if (p.first_session_at && p.last_session_at) {
      html += ` | ${p.first_session_at.split("T")[0]} — ${p.last_session_at.split("T")[0]}`;
    }
    html += `</div>`;
    html += `</div></div>`;
  }

  html += `</div>`;
  return html;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
