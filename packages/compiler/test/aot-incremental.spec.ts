import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as ts from 'typescript';
import { emitAotProject } from '../src';
import expect = require('expect');

function createProject(): { root: string; src: string; rootNames: string[] } {
    const root = mkdtempSync(join(tmpdir(), 'aot-incremental-'));
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    const rootNames = [join(src, 'service.ts'), join(src, 'other.ts')];
    writeFileSync(rootNames[0], `
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class Service {
    value = 1;
}
`);
    writeFileSync(rootNames[1], `
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class Other {
    value = 2;
}
`);
    return { root, src, rootNames };
}

function emit(rootNames: string[], src: string, outDir: string): void {
    emitAotProject({
        rootNames,
        rootDir: src,
        compilerOptions: {
            outDir,
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            experimentalDecorators: true
        }
    });
}

function readTree(dir: string): Record<string, string> {
    const files: Record<string, string> = {};
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            Object.assign(files, readTree(full));
        } else if (entry.name.endsWith('.js')) {
            files[entry.name] = readFileSync(full, 'utf-8');
        }
    }
    return files;
}

describe('emitAotProject program reuse', () => {

    it('produces identical output on a warm run', () => {
        const { root, src, rootNames } = createProject();
        try {
            const coldOut = join(root, 'out-cold');
            const warmOut = join(root, 'out-warm');

            emit(rootNames, src, coldOut);
            emit(rootNames, src, warmOut);

            expect(readTree(warmOut)).toEqual(readTree(coldOut));
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('rebuilds when a source file changes', () => {
        const { root, src, rootNames } = createProject();
        try {
            const outDir = join(root, 'out-change');
            emit(rootNames, src, outDir);
            expect(readTree(outDir)['service.js']).toContain('value = 1');

            writeFileSync(rootNames[0], `
import { Injectable } from '@tsdi/ioc';

@Injectable()
export class Service {
    value = 3;
}
`);
            // Make sure the modification time is strictly newer.
            const future = new Date(Date.now() + 2000);
            const fs = require('fs');
            fs.utimesSync(rootNames[0], future, future);

            emit(rootNames, src, outDir);
            expect(readTree(outDir)['service.js']).toContain('value = 3');
        } finally {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it('honours NO_CACHE=1', () => {
        const { root, src, rootNames } = createProject();
        const original = process.env.NO_CACHE;
        try {
            process.env.NO_CACHE = '1';
            const outDir = join(root, 'out-nocache');
            emit(rootNames, src, outDir);
            expect(readTree(outDir)['service.js']).toContain('class Service');
        } finally {
            if (original === undefined) {
                delete process.env.NO_CACHE;
            } else {
                process.env.NO_CACHE = original;
            }
            rmSync(root, { recursive: true, force: true });
        }
    });

});
