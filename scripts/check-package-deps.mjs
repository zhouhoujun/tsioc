#!/usr/bin/env node
/**
 * Verify that every `@tsdi/*` import in `packages/microservices/*\/src` is
 * declared by the importing package.
 *
 * This catches the monorepo-only failure mode where path mappings make a
 * package compile locally but `npm pack` / standalone install cannot resolve
 * its dependencies.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesDir = join(root, 'packages');

/** collect all workspace package names + versions */
function collectPackages() {
    const result = new Map();
    const walk = (dir, depth) => {
        if (depth > 4) return;
        for (const entry of readdirSync(dir)) {
            if (entry === 'node_modules' || entry === 'dist' || entry === 'lib') continue;
            const path = join(dir, entry);
            if (!statSync(path).isDirectory()) continue;
            const manifest = join(path, 'package.json');
            if (existsSync(manifest)) {
                try {
                    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
                    if (pkg.name) result.set(pkg.name, pkg);
                } catch {
                    // ignore malformed manifests
                }
            }
            walk(path, depth + 1);
        }
    };
    walk(packagesDir, 0);
    return result;
}

function resolvePackage(spec, packages) {
    const match = /^@tsdi\/([^/]+)/.exec(spec);
    if (!match) return null;
    const first = match[1];
    for (const candidate of [`@tsdi/${first}`, `@tsdi/${first}-microservice`, '@tsdi/platform-server']) {
        if (packages.has(candidate)) return candidate;
    }
    return null;
}

function collectSourceFiles(dir) {
    const files = [];
    const walk = (current) => {
        for (const entry of readdirSync(current)) {
            const path = join(current, entry);
            if (statSync(path).isDirectory()) {
                walk(path);
            } else if (entry.endsWith('.ts')) {
                files.push(path);
            }
        }
    };
    if (existsSync(dir)) walk(dir);
    return files;
}

const packages = collectPackages();
const microservices = join(packagesDir, 'microservices');
const roots = readdirSync(microservices).filter(name => existsSync(join(microservices, name, 'package.json')));
const errors = [];

for (const name of roots) {
    const dir = join(microservices, name);
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const declared = new Set([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.peerDependencies ?? {})
    ]);
    for (const file of collectSourceFiles(join(dir, 'src'))) {
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(/from\s+'(@tsdi\/[^']+)'/g)) {
            const spec = match[1];
            if (spec === '@tsdi/unit') continue;
            if (/\/src(\/|$)/.test(spec) || /\/dist(\/|$)/.test(spec)) {
                errors.push(`${relative(root, file)}: deep import '${spec}' (use the package barrel)`);
                continue;
            }
            const target = resolvePackage(spec, packages);
            if (target && !declared.has(target)) {
                errors.push(`${relative(root, file)}: '${spec}' requires dependency '${target}' in ${manifest.name}`);
            }
        }
    }
}

if (errors.length) {
    console.error(`package dependency check failed (${errors.length}):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}

console.log(`package dependency check passed (${roots.length} microservice packages).`);
