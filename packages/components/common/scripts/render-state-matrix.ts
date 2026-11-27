import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { normalizeStateMarkup, renderStateMatrix } from './state-matrix';

const root = join(__dirname, '..');
const output = process.argv[2] || join(root, 'docs', 'catalog-states.html');
const baselineOutput = join(root, 'scripts', 'catalog-states-baseline.json');

renderStateMatrix()
    .then(report => {
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, report.html, 'utf8');
        const baseline = Object.fromEntries(Object.entries(report.states).map(([state, markup]) => [
            state,
            createHash('sha1').update(normalizeStateMarkup(markup)).digest('hex')
        ]));
        writeFileSync(baselineOutput, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
        console.log(`state-matrix: ${report.html.length} bytes -> ${output}`);
        console.log(`state-matrix baseline -> ${baselineOutput}`);
    })
    .catch(error => {
        console.error('state-matrix failed', error);
        process.exit(1);
    });
