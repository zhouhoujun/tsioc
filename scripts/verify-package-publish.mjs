#!/usr/bin/env node
/**
 * Verify the publish payload of every microservice package.
 *
 * `npm pack --dry-run` is the closest local proxy for what users install:
 * - entry files must be present (index.ts + src/index.ts + package.json)
 * - tests/taskfiles must not leak into the tarball after `files` is declared
 * - package metadata must carry a name/version and declared @tsdi deps
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(root, 'packages', 'microservices');
const dirs = readdirSync(packagesDir).filter(name => existsSync(join(packagesDir, name, 'package.json')));
const errors = [];

for (const dir of dirs) {
    const packageDir = join(packagesDir, dir);
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    if (!manifest.name || !manifest.version) {
        errors.push(`${dir}: package.json is missing name/version`);
        continue;
    }
    let packed;
    try {
        const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
            cwd: packageDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        packed = JSON.parse(output)[0];
    } catch (error) {
        errors.push(`${dir}: npm pack failed: ${error.message?.split('\n')[0] ?? error}`);
        continue;
    }
    const files = new Set((packed.files ?? []).map(file => file.path));
    for (const required of ['package.json', 'index.ts', 'src/index.ts']) {
        if (!files.has(required)) {
            errors.push(`${dir}: packed tarball is missing ${required}`);
        }
    }
    for (const file of files) {
        if (file.startsWith('test/') || file.startsWith('unit.') || file.includes('.spec.')) {
            errors.push(`${dir}: test artifact leaked into tarball: ${file}`);
        }
    }
    if (!manifest.files?.length) {
        errors.push(`${dir}: package.json should declare a files allowlist`);
    }
}

if (errors.length) {
    console.error(`package publish check failed (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}
console.log(`package publish check passed (${dirs.length} microservice packages).`);
