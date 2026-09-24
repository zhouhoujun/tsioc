import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DEFAULT_MAX_LINES = 600;
const ROOT = process.cwd();
const SCAN_ROOT = join(ROOT, 'packages', 'agents');
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
    for (const file of walk(SCAN_ROOT)) {
        counts[relative(ROOT, file).split(sep).join('/')] = readFileSync(file, 'utf8').split('\n').length;
    }
    return counts;
}

const counts = currentCounts();

if (process.argv.includes('--write-baseline')) {
    const baseline = {};
    for (const [file, lines] of Object.entries(counts).sort()) {
        if (lines > DEFAULT_MAX_LINES) {
            baseline[file] = lines;
        }
    }
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`source-size: wrote baseline for ${Object.keys(baseline).length} file(s) over ${DEFAULT_MAX_LINES} lines`);
    process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
let regressions = 0;
for (const [file, lines] of Object.entries(counts).sort()) {
    const max = Object.prototype.hasOwnProperty.call(baseline, file) ? baseline[file] : DEFAULT_MAX_LINES;
    if (lines > max) {
        console.log(`[REGRESSION] ${file}: ${lines} lines > allowed ${max}`);
        regressions++;
    }
}
if (regressions > 0) {
    console.log(`source-size: ${regressions} file(s) exceeded their line budget; split them or lower the budget intentionally.`);
    process.exit(1);
}
console.log('source-size: OK (no source file exceeded its line budget)');
