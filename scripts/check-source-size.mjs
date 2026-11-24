import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DEFAULT_MAX_LINES = 600;
const COMMON_MAX_LINES = 700;
const ROOT = process.cwd();
const SCAN_ROOTS = [
    { root: join(ROOT, 'packages', 'agents'), max: DEFAULT_MAX_LINES },
    { root: join(ROOT, 'packages', 'components', 'common'), max: COMMON_MAX_LINES },
    // Workflow designer: templates + data-heavy UI files; ratchet only downward.
    { root: join(ROOT, 'packages', 'activities', 'src', 'visual', 'components'), max: 700 },
    // Visual engine (definitions, runtime, service): no god files. Translation
    // bundles and the shared type module are data/type-only and exempt.
    {
        root: join(ROOT, 'packages', 'activities', 'src', 'visual'),
        max: 700,
        exclude: /(^|[\\/])i18n(\.nodes)?\.ts$|(^|[\\/])types\.ts$/
    }
];
const BASELINE_PATH = join(ROOT, 'scripts', 'source-size-baseline.json');
const EXCLUDED = [`${sep}node_modules${sep}`, `${sep}test${sep}`, `${sep}dist${sep}`, `${sep}lib${sep}`];

function walk(dir, out = []) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return out;
    }
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (EXCLUDED.some(fragment => `${full}${sep}`.includes(fragment))) {
            continue;
        }
        if (entry.isDirectory()) {
            walk(full, out);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

function currentCounts() {
    const counts = {};
    for (const { root, max, exclude } of SCAN_ROOTS) {
        for (const file of walk(root)) {
            if (exclude && exclude.test(file)) {
                continue;
            }
            counts[relative(ROOT, file).split(sep).join('/')] = {
                lines: readFileSync(file, 'utf8').split('\n').length,
                max
            };
        }
    }
    return counts;
}

const counts = currentCounts();

if (process.argv.includes('--write-baseline')) {
    const baseline = {};
    for (const [file, entry] of Object.entries(counts).sort()) {
        if (entry.lines > entry.max) {
            baseline[file] = entry.lines;
        }
    }
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`source-size: wrote baseline for ${Object.keys(baseline).length} file(s)`);
    process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
let regressions = 0;
for (const [file, entry] of Object.entries(counts).sort()) {
    const max = Object.prototype.hasOwnProperty.call(baseline, file) ? baseline[file] : entry.max;
    if (entry.lines > max) {
        console.log(`[REGRESSION] ${file}: ${entry.lines} lines > allowed ${max}`);
        regressions++;
    }
}
if (regressions > 0) {
    console.log(`source-size: ${regressions} file(s) exceeded their line budget; split them or lower the budget intentionally.`);
    process.exit(1);
}
console.log('source-size: OK (no source file exceeded its line budget)');
