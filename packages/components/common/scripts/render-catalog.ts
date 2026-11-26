import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { collectWidgetCatalog, renderWidgetCatalogMarkdown } from '../catalog/collect';
import { renderCatalogHtml } from '../catalog/page';
import type { CatalogFileSystem } from '../catalog/types';

const root = join(__dirname, '..');
const htmlOutput = process.argv[2] || join(root, 'docs', 'catalog.html');
const markdownOutput = process.argv[3] || join(root, 'docs', 'catalog.md');

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
mkdirSync(dirname(htmlOutput), { recursive: true });
writeFileSync(htmlOutput, renderCatalogHtml(entries), 'utf8');
mkdirSync(dirname(markdownOutput), { recursive: true });
writeFileSync(markdownOutput, renderWidgetCatalogMarkdown(entries) + '\n', 'utf8');
console.log(`catalog: ${entries.length} widgets -> ${htmlOutput}, ${markdownOutput}`);
