#!/usr/bin/env node
/**
 * Pixel-level regression for the designer preview screenshot.
 *
 * Uses the PNG decoder bundled with Playwright (no extra dependency), counts
 * pixels whose RGB deltas exceed a small noise floor, and writes a red diff
 * image when the ratio crosses the threshold.
 */
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('playwright-core/lib/utilsBundle');

const DIR = __dirname;
const BASELINE = process.env.PREVIEW_VISUAL_BASELINE || path.join(DIR, 'preview.baseline.png');
const ACTUAL = process.env.PREVIEW_VISUAL_ACTUAL || path.join(DIR, 'preview.png');
const DIFF = process.env.PREVIEW_VISUAL_DIFF || path.join(DIR, 'preview.diff.png');
const THRESHOLD = Number(process.env.PREVIEW_VISUAL_THRESHOLD || 0.005);
const PIXEL_FLOOR = Number(process.env.PREVIEW_VISUAL_PIXEL_FLOOR || 8);

function readPng(file) {
    return PNG.sync.read(fs.readFileSync(file));
}

function compare(baselinePath = BASELINE, actualPath = ACTUAL, options = {}) {
    const threshold = options.threshold ?? THRESHOLD;
    const floor = options.pixelFloor ?? PIXEL_FLOOR;
    if (!fs.existsSync(baselinePath)) {
        return { ok: false, error: `missing baseline: ${baselinePath}` };
    }
    if (!fs.existsSync(actualPath)) {
        return { ok: false, error: `missing screenshot: ${actualPath}` };
    }
    const expected = readPng(baselinePath);
    const actual = readPng(actualPath);
    if (expected.width !== actual.width || expected.height !== actual.height) {
        return {
            ok: false,
            error: `size mismatch ${expected.width}x${expected.height} -> ${actual.width}x${actual.height}`
        };
    }
    const diff = new PNG({ width: actual.width, height: actual.height });
    let changed = 0;
    let maxDelta = 0;
    let totalDelta = 0;
    for (let index = 0; index < actual.data.length; index += 4) {
        const dr = Math.abs(expected.data[index] - actual.data[index]);
        const dg = Math.abs(expected.data[index + 1] - actual.data[index + 1]);
        const db = Math.abs(expected.data[index + 2] - actual.data[index + 2]);
        const delta = dr + dg + db;
        if (delta > floor) {
            changed++;
            totalDelta += delta;
            maxDelta = Math.max(maxDelta, delta);
            diff.data[index] = 255;
            diff.data[index + 1] = 0;
            diff.data[index + 2] = 0;
            diff.data[index + 3] = 255;
        } else {
            const gray = Math.round((actual.data[index] + actual.data[index + 1] + actual.data[index + 2]) / 3);
            const faded = Math.round(gray * 0.25 + 255 * 0.75);
            diff.data[index] = faded;
            diff.data[index + 1] = faded;
            diff.data[index + 2] = faded;
            diff.data[index + 3] = 255;
        }
    }
    const pixels = actual.width * actual.height;
    const ratio = changed / (pixels || 1);
    const result = {
        ok: ratio <= threshold,
        changed,
        pixels,
        ratio,
        maxDelta,
        averageDelta: changed ? totalDelta / changed : 0,
        threshold,
        baseline: baselinePath,
        actual: actualPath
    };
    if (!result.ok) {
        fs.writeFileSync(DIFF, PNG.sync.write(diff));
        result.diff = DIFF;
    }
    return result;
}

if (require.main === module) {
    const update = process.argv.includes('--update');
    if (update) {
        fs.copyFileSync(ACTUAL, BASELINE);
        console.log(`visual baseline updated: ${BASELINE}`);
        process.exit(0);
    }
    const result = compare();
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) {
        process.exitCode = 1;
    }
}

module.exports = { compare };
