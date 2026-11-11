import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { build } from 'esbuild';
import { createAotEsbuildPlugin } from '../../compiler/src/activities/AotEsbuildPlugin';

const packageDir = __dirname;
const uiDir = path.resolve(packageDir, '../agent-ui');
const outDir = path.join(packageDir, 'dist');
const mediaDir = path.join(packageDir, 'media');

async function main(): Promise<void> {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });
    execFileSync(process.execPath, ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'build-web.ts'], {
        cwd: uiDir,
        stdio: 'inherit'
    });
    fs.copyFileSync(path.join(uiDir, 'web', 'dist', 'agent-console.js'), path.join(mediaDir, 'agent-console.js'));
    await build({
        entryPoints: [path.join(packageDir, 'src', 'extension.ts')],
        outfile: path.join(outDir, 'extension.js'),
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node18',
        sourcemap: true,
        plugins: [createAotEsbuildPlugin({ target: 'es2020' })],
        external: ['vscode']
    });
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
