/** Reject assistant attribution in new commits; published history is preserved. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Bare product names, or "Claude <model family>"; a human named "Claude Martin" stays allowed. */
const AI_NAME = /^(?:claude(?:\s+(?:code|opus|sonnet|haiku|fable|mythos|instant|ai|agent|assistant)(?:\s+[\w.-]+)*)?|anthropic|codex(?:\s+cli)?|chatgpt|openai(?:\s+codex)?|gemini(?:\s+code\s+assist)?|(?:github\s+)?copilot(?:\s+swe\s+agent)?|cursor(?:\s+agent)?|devin(?:\s+ai)?|aider|jules|windsurf|amazon\s+q)(?:\s*\[bot\])?$/i;
const AI_EMAIL = /^(?:(?:noreply|no-reply)@(?:anthropic|openai)\.com|[\w.+-]*@(?:anthropic\.com|cursor\.com)|\d+\+(?:copilot|devin-ai-integration\[bot\]|google-labs-jules\[bot\])@users\.noreply\.github\.com)$/i;
/** Credit trailers, including ones some tools add instead of Co-authored-by. */
const CREDIT_TRAILER = /^\s*(?:co-authored-by|co-developed-by|signed-off-by|authored-by|assisted-by|generated-by|helped-by):\s*(.+)$/i;
/** Session or provenance trailers and links emitted by coding assistants. */
const SESSION_CREDIT = /^\s*(?:(?:claude|codex|copilot|cursor)-session(?:-url)?:|.*\bhttps?:\/\/(?:claude\.ai\/code\/session_|chatgpt\.com\/codex\/tasks\/))/i;

export function isAssistant(identity: string): boolean {
  const match = identity.trim().match(/^(.*?)\s*<([^>]+)>/);
  return AI_NAME.test((match?.[1] ?? identity).trim()) || AI_EMAIL.test(match?.[2] ?? '');
}

export function attributionIssues(message: string, author = '', committer = ''): string[] {
  const issues: string[] = [];
  if (isAssistant(author)) issues.push('Assistant author identity');
  if (isAssistant(committer)) issues.push('Assistant committer identity');
  for (const line of message.split(/\r?\n/)) {
    const trailer = line.match(CREDIT_TRAILER);
    if (trailer && isAssistant(trailer[1])) issues.push('Assistant attribution trailer');
    if (SESSION_CREDIT.test(line)) issues.push('Assistant session link');
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
