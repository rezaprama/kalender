import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { attributionIssues, checkRange, isAssistant } from '../scripts/check-attribution.ts';

describe('commit attribution policy', () => {
  test('rejects assistant credits while preserving human co-authors and ordinary mentions', () => {
    assert.equal(attributionIssues('fix: handle Claude API errors\n\nCo-authored-by: Claude Martin <claude@example.org>').length, 0);
    for (const identity of ['Claude Opus 5.5 <noreply@anthropic.com>', 'Claude <claude@example.org>', 'Claude Code [bot] <bot@example.org>', 'Codex <noreply@openai.com>', 'GitHub Copilot <bot@example.org>']) {
      assert.equal(isAssistant(identity), true, identity);
      assert.ok(attributionIssues(`fix: calendar\n\nCo-Authored-By: ${identity}`).length);
    }
    assert.ok(attributionIssues('fix: calendar', 'Claude Code <bot@example.org>').length);
    assert.ok(attributionIssues('fix: calendar', '', 'Claude Opus 5.5 <noreply@anthropic.com>').length);
    assert.ok(attributionIssues('fix: calendar\n\n🤖 Generated with [Claude Code](https://claude.ai)').length);
  });

  test('covers newer model names, other assistants, alternative trailers and session links', () => {
    for (const identity of ['Claude Fable 5.1 <bot@example.org>', 'Claude Mythos 5.1 <bot@example.org>', 'Cursor Agent <cursoragent@cursor.com>', 'Devin AI <158243242+devin-ai-integration[bot]@users.noreply.github.com>', 'Helper <x@anthropic.com>']) {
      assert.equal(isAssistant(identity), true, identity);
    }
    assert.ok(attributionIssues('fix: x\n\nAssisted-by: Claude <bot@example.org>').length);
    assert.ok(attributionIssues('fix: x\n\nClaude-Session: https://claude.ai/code/session_01ABC').length);
    assert.ok(attributionIssues('fix: x\n\nhttps://claude.ai/code/session_01ABC').length);
    // Humans and ordinary prose stay allowed.
    for (const ok of ['fix: x\n\nCo-authored-by: Claude Martin <claude@example.org>', 'fix: x\n\nCo-authored-by: Jules Verne <jules@example.org>', 'docs: compare Cursor and Copilot behaviour', 'fix: x\n\nSigned-off-by: Reza Prama Arviandi <48824676+rezaprama@users.noreply.github.com>']) {
      assert.deepEqual(attributionIssues(ok), [], ok);
    }
  });

  test('checks every new commit, including a credit hidden behind a clean final commit', () => {
    const dir = mkdtempSync(join(tmpdir(), 'kalender-attribution-'));
    const original = process.cwd();
    const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Human', GIT_AUTHOR_EMAIL: 'human@example.org', GIT_COMMITTER_NAME: 'Human', GIT_COMMITTER_EMAIL: 'human@example.org' } }).trim();
    try {
      git('init', '--quiet');
      // Disable any inherited hooks in this disposable fixture only.
      git('config', 'core.hooksPath', '.no-hooks');
      git('commit', '--allow-empty', '-m', 'chore: legacy\n\nCo-Authored-By: Claude <noreply@anthropic.com>');
      const base = git('rev-parse', 'HEAD');
      writeFileSync(join(dir, 'example.txt'), 'Human contribution');
      git('add', '.');
      git('commit', '-m', 'docs: human change');
      const clean = git('rev-parse', 'HEAD');
      process.chdir(dir);
      assert.equal(checkRange(base, clean), 1, 'legacy history stays outside the checked range');
      git('commit', '--allow-empty', '-m', 'fix: credited change\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>');
      git('commit', '--allow-empty', '-m', 'docs: clean tip');
      assert.throws(() => checkRange(base, git('rev-parse', 'HEAD')), /Assistant attribution trailer/);
      assert.throws(() => checkRange('--all', clean), /full commit SHAs/);
    } finally {
      process.chdir(original);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
