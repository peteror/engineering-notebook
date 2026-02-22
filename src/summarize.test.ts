import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { groupSessionsByDateAndProject, buildSummaryPrompt, parseSummaryResponse } from "./summarize";
import { initDb, closeDb } from "./db";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("summarize", () => {
  let tempDir: string;
  let db: ReturnType<typeof initDb>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "notebook-sum-test-"));
    db = initDb(join(tempDir, "test.db"));

    // Insert test data
    db.exec(`
      INSERT INTO projects (id, path, display_name, session_count)
      VALUES ('myapp', '/test/myapp', 'My App', 2);

      INSERT INTO sessions (id, project_id, project_path, source_path, started_at, ended_at, message_count, ingested_at)
      VALUES
        ('s1', 'myapp', '/test/myapp', '/tmp/s1.jsonl', '2026-02-02T10:00:00Z', '2026-02-02T11:00:00Z', 5, datetime('now')),
        ('s2', 'myapp', '/test/myapp', '/tmp/s2.jsonl', '2026-02-02T14:00:00Z', '2026-02-02T15:00:00Z', 3, datetime('now'));

      INSERT INTO conversations (session_id, conversation_markdown, extracted_at)
      VALUES
        ('s1', '**User (10:00):** Fix the bug\n**Claude (10:01):** Fixed it.', datetime('now')),
        ('s2', '**User (14:00):** Add tests\n**Claude (14:01):** Added tests.', datetime('now'));
    `);
  });

  afterEach(() => {
    closeDb();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("groupSessionsByDateAndProject groups correctly", () => {
    const groups = groupSessionsByDateAndProject(db);
    expect(groups.length).toBe(1);
    expect(groups[0].date).toBe("2026-02-02");
    expect(groups[0].projectId).toBe("myapp");
    expect(groups[0].sessionIds).toEqual(["s1", "s2"]);
    expect(groups[0].conversations.length).toBe(2);
  });

  test("buildSummaryPrompt produces valid prompt", () => {
    const groups = groupSessionsByDateAndProject(db);
    const prompt = buildSummaryPrompt(groups[0]);
    expect(prompt).toContain("Fix the bug");
    expect(prompt).toContain("Add tests");
    expect(prompt).toContain("engineering journal");
  });

  test("parseSummaryResponse extracts summary, topics, and commits", () => {
    const response = `SUMMARY:
Today I worked on fixing the auth bug and adding test coverage.

TOPICS:
["auth bug", "test coverage"]

COMMITS:
["fix: resolve auth timeout"]`;
    const result = parseSummaryResponse(response);
    expect(result.summary).toContain("auth bug");
    expect(result.topics).toEqual(["auth bug", "test coverage"]);
    expect(result.commits).toEqual(["fix: resolve auth timeout"]);
  });
});
