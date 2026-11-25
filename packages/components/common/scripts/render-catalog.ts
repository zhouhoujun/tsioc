import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { collectWidgetCatalog } from '../catalog/collect';
import { renderCatalogHtml } from '../catalog/page';
import type { CatalogFileSystem } from '../catalog/types';

const root = join(__dirname, '..');
const output = process.argv[2] || join(root, 'docs', 'catalog.html');

const fs: CatalogFileSystem = {
    listDirectories(path) {
        return readdirSync(path).filter(name => {
            try {
                return statSync(join(path, name)).isDirectory();
            } catch {
                return false;
            }
        });
    },
    listFiles(path) {
        return readdirSync(path).filter(name => {
            try {
                return statSync(join(path, name)).isFile();
            } catch {
                return false;
            }
        });
    },
    exists(path) {
        return existsSync(path);
    },
    readText(path) {
        return readFileSync(path, 'utf8');
    }
};

const entries = collectWidgetCatalog(fs, root);
const html = renderCatalogHtml(entries);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html, 'utf8');
console.log(`catalog: ${entries.length} widgets -> ${output}`);
