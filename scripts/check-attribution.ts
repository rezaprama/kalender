/** Reject assistant attribution in new commits; published history is preserved. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const AI_NAME = /^(?:claude(?:\s+(?:code|opus|sonnet|haiku)(?:\s+[\w.-]+)*)?|anthropic|codex|chatgpt|openai|gemini|(?:github\s+)?copilot)(?:\s*\[bot\])?$/i;
const AI_EMAIL = /^(?:noreply|no-reply)@(?:anthropic|openai)\.com$/i;

export function isAssistant(identity: string): boolean {
  const match = identity.trim().match(/^(.*?)\s*<([^>]+)>/);
  return AI_NAME.test((match?.[1] ?? identity).trim()) || AI_EMAIL.test(match?.[2] ?? '');
}

export function attributionIssues(message: string, author = '', committer = ''): string[] {
  const issues: string[] = [];
  if (isAssistant(author)) issues.push('Assistant author identity');
  if (isAssistant(committer)) issues.push('Assistant committer identity');
  for (const line of message.split(/\r?\n/)) {
    const trailer = line.match(/^\s*(?:co-authored-by|signed-off-by|authored-by):\s*(.+)$/i);
    if (trailer && isAssistant(trailer[1])) issues.push('Assistant attribution trailer');
    if (/^\s*(?:🤖\s*)?(?:generated|created|written)\s+(?:with|by)\s+(?:\[)?(?:claude|anthropic|codex|chatgpt|openai|gemini|(?:github\s+)?copilot)\b/i.test(line)) {
      issues.push('Assistant promotional credit');
    }
  }
  return issues;
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
}

/** Uses SHAs from GitHub event context, never interpolated shell commands. */
export function checkRange(base: string, head: string): number {
  if (![base, head].every((sha) => /^[a-f\d]{40,64}$/i.test(sha) && !/^0+$/.test(sha))) {
    throw new Error('ATTRIBUTION_BASE and ATTRIBUTION_HEAD must be nonzero full commit SHAs.');
  }
  const commits = git('rev-list', `${base}..${head}`).split('\n').filter(Boolean);
  for (const sha of commits) {
    const [author, committer, ...body] = git('show', '-s', '--format=%an <%ae>%n%cn <%ce>%n%B', sha).split('\n');
    const issues = attributionIssues(body.join('\n'), author, committer);
    if (issues.length) throw new Error(`${sha.slice(0, 7)}: ${issues.join(', ')}. Credit human contributors only.`);
  }
  return commits.length;
}

function main(): void {
  if (process.argv[2] === '--message' && process.argv[3]) {
    const issues = attributionIssues(readFileSync(process.argv[3], 'utf8'), git('var', 'GIT_AUTHOR_IDENT'), git('var', 'GIT_COMMITTER_IDENT'));
    if (issues.length) throw new Error(`${issues.join(', ')}. Remove assistant credits; preserve human co-authors.`);
    return;
  }
  const base = process.env.ATTRIBUTION_BASE;
  const head = process.env.ATTRIBUTION_HEAD;
  if (!base || !head) throw new Error('Set ATTRIBUTION_BASE and ATTRIBUTION_HEAD to the new commit range.');
  console.log(`Attribution checked: ${checkRange(base, head)} new commit(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) { console.error((error as Error).message); process.exitCode = 1; }
}
