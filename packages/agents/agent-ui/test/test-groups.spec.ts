import expect = require('expect');
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Suite, Test } from '@tsdi/unit';
import { planGroups, selectGroups } from './groups';

function specFiles(dir: string, root = dir, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            specFiles(full, root, out);
        } else if (entry.name.endsWith('.spec.ts')) {
            out.push(full.slice(root.length + 1).split('\\').join('/'));
        }
    }
    return out;
}

@Suite('agent-ui test grouping')
export class AgentUiTestGroupingTest {
    private files(): string[] {
        // Paths are package-relative (`test/x.spec.ts`), matching unit.ts.
        return specFiles(join(__dirname), join(__dirname, '..')).sort();
    }

    @Test('every spec file lands in exactly one group for 1-5 workers')
    coversEveryFileOnce() {
        const files = this.files();
        for (let count = 1; count <= 5; count++) {
            const groups = selectGroups(planGroups(files), count);
            const assigned = Object.values(groups).flat();
            expect(assigned.length).toEqual(files.length);
            expect(assigned.slice().sort()).toEqual(files);
        }
    }

    @Test('heavy specs are isolated when the worker budget allows')
    isolatesHeavySpecs() {
        const files = this.files();
        for (const count of [3, 4, 5]) {
            const groups = selectGroups(planGroups(files), count);
            const owner = (name: string): string | undefined =>
                Object.keys(groups).find(group => groups[group].includes(name));
            expect(owner('test/console-renderer.spec.ts')).toBeDefined();
            expect(owner('test/session-tab-isolation.spec.ts')).toBeDefined();
            expect(owner('test/console-renderer.spec.ts'))
                .not.toEqual(owner('test/session-tab-isolation.spec.ts'));
        }
    }

    @Test('a single worker receives the whole suite')
    singleWorker() {
        const files = this.files();
        const groups = selectGroups(planGroups(files), 1);
        expect(Object.keys(groups)).toEqual(['all']);
        expect(groups.all).toEqual(files);
    }
}
