/** Local development: build once, rebuild on client/data changes, run `wrangler dev`. */
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { run } from './build.ts';

await run();
const wrangler = spawn('npx', ['wrangler', 'dev', '--port', process.env.PORT ?? '8787'], { stdio: 'inherit', shell: true });
let timer: NodeJS.Timeout | undefined;
for (const dir of ['src/client', 'data', 'public']) {
  watch(dir, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => run().catch((error) => console.error('Rebuild failed:', error.message)), 150);
  });
}
wrangler.on('exit', (code) => process.exit(code ?? 0));
