#!/usr/bin/env node
/**
 * Prepare a single workspace package for publishing.
 *
 * Usage:
 *   node scripts/prepare-package-publish.mjs packages/microservices/gateway
 *
 * Steps:
 *   1. run the package's own `npm run build` (taskfile outputs to ../../dist/<name>)
 *   2. copy package.json + README into the dist directory
 *   3. rewrite main/types/files for the compiled layout
 *   4. run `npm pack --dry-run` and verify entry files
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageDir = resolve(process.argv[2] ?? '');
if (!existsSync(join(packageDir, 'package.json'))) {
    console.error('Usage: node scripts/prepare-package-publish.mjs <package-dir>');
    process.exit(2);
}

const name = basename(packageDir);
const outDir = resolve(packageDir, '../../dist', name);
console.log(`Building ${name}...`);
execFileSync('npm', ['run', 'build'], { cwd: packageDir, stdio: 'inherit' });

const entry = join(outDir, 'index.js');
const types = join(outDir, 'index.d.ts');
if (!existsSync(entry) || !existsSync(types)) {
    console.error(`build output missing ${entry} or ${types}`);
    process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
manifest.main = './index.js';
manifest.types = './index.d.ts';
manifest.files = ['**/*.js', '**/*.d.ts', 'README.md'];
delete manifest.scripts;
delete manifest.devDependencies;
writeFileSync(join(outDir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
const readme = join(packageDir, 'README.md');
if (existsSync(readme)) {
    copyFileSync(readme, join(outDir, 'README.md'));
}

const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: outDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
}))[0];
const files = new Set((packed.files ?? []).map(file => file.path));
for (const required of ['package.json', 'index.js', 'index.d.ts']) {
    if (!files.has(required)) {
        console.error(`publish payload is missing ${required}`);
        process.exit(1);
    }
}

console.log(`Prepared ${manifest.name}@${manifest.version} in ${outDir}`);
console.log(`tarball: ${packed.filename} (${packed.entryCount} files, ${packed.unpackedSize} bytes)`);
