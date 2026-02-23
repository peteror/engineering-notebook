import { escapeHtml } from "./helpers";
import type { Config } from "../../config";

export function renderSettings(config: Config): string {
  let html = `<div class="page-title">Settings</div>`;
  html += `<form method="POST" action="/settings">`;

  // Summary instructions
  html += `<div class="settings-group">`;
  html += `<div class="settings-label">Custom Summary Instructions</div>`;
  html += `<div class="settings-help">Additional context sent to the LLM when generating summaries. E.g., "Focus on architectural decisions" or "Include commit hashes".</div>`;
  html += `<textarea class="settings-input" name="summary_instructions" rows="4">${escapeHtml(config.summary_instructions)}</textarea>`;
  html += `</div>`;

  // Day start hour
  html += `<div class="settings-group">`;
  html += `<div class="settings-label">Day Start Hour</div>`;
  html += `<div class="settings-help">Hour (0–23) when a new "logical day" begins. Messages before this hour belong to the previous day. Default: 5 (5 AM).</div>`;
  html += `<input class="settings-input" type="number" name="day_start_hour" min="0" max="23" value="${config.day_start_hour}" style="width: 80px;">`;
  html += `</div>`;

  // Source directories
  html += `<div class="settings-group">`;
  html += `<div class="settings-label">Source Directories</div>`;
  html += `<div class="settings-help">Paths to scan for Claude session JSONL files (one per line).</div>`;
  html += `<textarea class="settings-input" name="sources" rows="3">${escapeHtml(config.sources.join("\n"))}</textarea>`;
  html += `</div>`;

  // Excluded patterns
  html += `<div class="settings-group">`;
  html += `<div class="settings-label">Excluded Patterns</div>`;
  html += `<div class="settings-help">Glob patterns to skip during ingestion (one per line).</div>`;
  html += `<textarea class="settings-input" name="exclude" rows="3">${escapeHtml(config.exclude.join("\n"))}</textarea>`;
  html += `</div>`;

  // Port
  html += `<div class="settings-group">`;
  html += `<div class="settings-label">Server Port</div>`;
  html += `<input class="settings-input" type="number" name="port" value="${config.port}" style="width: 100px;">`;
  html += `</div>`;

  html += `<button class="settings-btn" type="submit">Save Settings</button>`;
  html += `</form>`;
  return html;
}
