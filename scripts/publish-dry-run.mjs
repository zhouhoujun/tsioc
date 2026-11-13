#!/usr/bin/env node
/**
 * Build and dry-run publish microservice packages.
 *
 * Usage:
 *   node scripts/publish-dry-run.mjs
 *   node scripts/publish-dry-run.mjs --packages=gateway,discovery
 *
 * Each package runs `prepare-package-publish.mjs` (build + dist manifest +
 * pack check) and then `npm publish --dry-run` inside `packages/dist/<name>`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const microservices = join(root, 'packages', 'microservices');
const arg = process.argv.find(value => value.startsWith('--packages='));
const selected = arg
    ? arg.slice('--packages='.length).split(',').map(value => value.trim()).filter(Boolean)
    : readdirSync(microservices).filter(name => existsSync(join(microservices, name, 'package.json')));

const prepared = [];
for (const name of selected) {
    const packageDir = join(microservices, name);
    if (!existsSync(join(packageDir, 'package.json'))) {
        console.error(`unknown package: ${name}`);
        process.exit(2);
    }
    console.log(`\n=== ${name} ===`);
    execFileSync('node', [join(root, 'scripts', 'prepare-package-publish.mjs'), packageDir], {
        cwd: root,
        stdio: 'inherit'
    });
    const distDir = join(root, 'packages', 'dist', name);
    execFileSync('npm', ['publish', '--dry-run', '--access=public', '--ignore-scripts'], {
        cwd: distDir,
        stdio: 'inherit'
    });
    prepared.push(name);
}

console.log(`\npublish dry-run completed for ${prepared.length} package(s): ${prepared.join(', ')}`);
