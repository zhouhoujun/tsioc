import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { renderStateMatrixHtml } from './state-matrix';

const root = join(__dirname, '..');
const output = process.argv[2] || join(root, 'docs', 'catalog-states.html');

renderStateMatrixHtml()
    .then(html => {
        mkdirSync(dirname(output), { recursive: true });
        writeFileSync(output, html, 'utf8');
        console.log(`state-matrix: ${html.length} bytes -> ${output}`);
    })
    .catch(error => {
        console.error('state-matrix failed', error);
        process.exit(1);
    });
