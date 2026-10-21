import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TypeormAdapter } from '../src';

@Suite('sqljs autoSave writes atomically')
export class AtomicSqljsSaveTest {
    @Test('a save writes a temp file and renames it over the location')
    async atomicSave() {
        const dir = mkdtempSync(join(tmpdir(), 'sqljs-atomic-'));
        try {
            const file = join(dir, 'agent.db');
            writeFileSync(file, 'old');
            const driver = {
                database: { export: () => new Uint8Array([1, 2, 3]) },
                save: () => { writeFileSync(file, 'non-atomic'); }
            };
            const adapter = new TypeormAdapter({} as any);
            (adapter as any).installAtomicSqljsSave({ options: { type: 'sqljs', location: file, autoSave: true }, driver });
            await driver.save();
            expect(Array.from(readFileSync(file))).toEqual([1, 2, 3]);
            expect(existsSync(`${file}.tmp`)).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('non-sqljs or non-autoSave options keep the driver untouched')
    async leavesOtherDriversAlone() {
        const adapter = new TypeormAdapter({} as any);
        const original = () => undefined;
        const driver = { database: { export: () => new Uint8Array([1]) }, save: original };
        (adapter as any).installAtomicSqljsSave({ options: { type: 'sqlite', location: 'x', autoSave: true }, driver });
        expect(driver.save).toBe(original);
    }
}
