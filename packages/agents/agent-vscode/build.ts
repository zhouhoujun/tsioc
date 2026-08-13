import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { buildSync } from 'esbuild';

const packageDir = __dirname;
const uiDir = path.resolve(packageDir, '../agent-ui');
const outDir = path.join(packageDir, 'dist');
const mediaDir = path.join(packageDir, 'media');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });
execFileSync(process.execPath, ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'build-web.ts'], {
    cwd: uiDir,
    stdio: 'inherit'
});
fs.copyFileSync(path.join(uiDir, 'web', 'dist', 'agent-console.js'), path.join(mediaDir, 'agent-console.js'));
buildSync({
    entryPoints: [path.join(packageDir, 'src', 'extension.ts')],
    outfile: path.join(outDir, 'extension.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    sourcemap: true,
    external: ['vscode']
});
