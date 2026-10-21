import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { describe, test } from 'node:test';
import { route } from '../src/worker.ts';

const SITE = 'https://kalender.rezaprama.com';
const DOCS = ['README.md', 'README.id.md', 'CONTRIBUTING.md', 'docs/API.md', 'docs/DATA_SOURCES.md', 'docs/METHODOLOGY.md', 'LICENSE-DATA.md'];

/** Resolve a site URL the way production does: static file in dist/ first, then the Worker. */
async function siteFetch(input: string | URL): Promise<Response> {
  const url = new URL(String(input), SITE);
  const file = join('dist', url.pathname);
  if (url.pathname.includes('.') && existsSync(file)) return new Response(await readFile(file), { status: 200 });
  return route(new Request(url));
}

describe('documentation examples', () => {
  test('every GET example in the docs succeeds', async () => {
    const examples = new Set<string>();
    for (const doc of DOCS) {
      const text = await readFile(doc, 'utf8');
      for (const m of text.matchAll(/^GET (\/\S+)$/gm)) examples.add(m[1]);
      for (const m of text.matchAll(/curl "https:\/\/kalender\.rezaprama\.com(\/[^"]+)"/g)) examples.add(m[1]);
    }
    assert.ok(examples.size >= 12, `found ${examples.size} examples`);
    for (const path of examples) assert.equal((await siteFetch(path)).status, 200, path);
  });

  test('the JavaScript examples run against the API', async () => {
    const blocks: string[] = [];
    for (const doc of ['docs/API.md', 'README.md', 'README.id.md']) {
      for (const m of (await readFile(doc, 'utf8')).matchAll(/```js\n([\s\S]*?)```/g)) blocks.push(m[1]);
    }
    assert.ok(blocks.length >= 3);
    const logs: string[] = [];
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    for (const code of blocks) {
      await new AsyncFunction('fetch', 'console', code)(siteFetch, { log: (...args: unknown[]) => logs.push(args.join(' ')) });
    }
    assert.ok(logs.some((line) => /\d{4}-\d{2}-\d{2} .+ \((official|estimated)\)|No more holidays/.test(line)), logs.join('\n'));
  });

  test('relative links between documents resolve', async () => {
    for (const doc of [...DOCS, 'SECURITY.md', 'CHANGELOG.md', 'NOTICE']) {
      const text = await readFile(doc, 'utf8');
      for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)#\s]+)(#[^)]*)?\)/g)) {
        assert.ok(existsSync(join(dirname(doc), m[1])), `${doc} → ${m[1]}`);
      }
    }
  });
});
