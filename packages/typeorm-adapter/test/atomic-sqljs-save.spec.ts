import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TypeormAdapter } from '../src';

/**
 * Regression guard for the sql.js autoSave override.
 *
 * TypeORM 0.3.x `SqljsDriver` keeps the connection on `databaseConnection`
 * (the field is NOT `database`). Reading the wrong field made the override
 * silently skip every save, so file-backed stores lost all writes while the
 * unit test — which used a fake driver exposing `database` — still passed.
 */
@Suite('sqljs autoSave writes atomically')
export class AtomicSqljsSaveTest {
    @Test('a save writes a temp file and renames it over the location')
    async atomicSave() {
        const dir = mkdtempSync(join(tmpdir(), 'sqljs-atomic-'));
        try {
            const file = join(dir, 'agent.db');
            writeFileSync(file, 'old');
            const driver = {
                databaseConnection: { export: () => new Uint8Array([1, 2, 3]) },
                save: () => { writeFileSync(file, 'non-atomic'); }
            };
            const adapter = new TypeormAdapter({} as any);
            (adapter as any).installAtomicSqljsSave({ options: { type: 'sqljs', location: file, autoSave: true }, driver });
            await driver.save();
            expect(Array.from(readFileSync(file))).toEqual([1, 2, 3]);
            // The staging file is per-process, so two agents on the same
            // database can never rename/delete each other's temp file.
            expect(existsSync(`${file}.${process.pid}.tmp`)).toBe(false);
            expect(existsSync(`${file}.tmp`)).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('the legacy `database` field is still honoured')
    async legacyDatabaseField() {
        const dir = mkdtempSync(join(tmpdir(), 'sqljs-atomic-'));
        try {
            const file = join(dir, 'agent.db');
            writeFileSync(file, 'old');
            const driver = {
                database: { export: () => new Uint8Array([9]) },
                save: () => { writeFileSync(file, 'non-atomic'); }
            };
            const adapter = new TypeormAdapter({} as any);
            (adapter as any).installAtomicSqljsSave({ options: { type: 'sqljs', location: file, autoSave: true }, driver });
            await driver.save();
            expect(Array.from(readFileSync(file))).toEqual([9]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a driver without a readable connection still persists through the original save')
    async fallsBackWhenConnectionIsUnreadable() {
        const dir = mkdtempSync(join(tmpdir(), 'sqljs-atomic-'));
        try {
            const file = join(dir, 'agent.db');
            writeFileSync(file, 'old');
            const calls: Array<string | undefined> = [];
            const driver = {
                save: (location?: string) => { calls.push(location); writeFileSync(location || file, 'original'); }
            };
            const adapter = new TypeormAdapter({} as any);
            (adapter as any).installAtomicSqljsSave({ options: { type: 'sqljs', location: file, autoSave: true }, driver });
            await (driver.save as any)();
            // Never swallow a save: dropping writes silently loses user data.
            expect(readFileSync(file, 'utf8')).toEqual('original');
            expect(calls).toEqual([undefined]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('an explicit location argument is written atomically too')
    async explicitLocationArgument() {
        const dir = mkdtempSync(join(tmpdir(), 'sqljs-atomic-'));
        try {
            const file = join(dir, 'agent.db');
            const other = join(dir, 'copy.db');
            writeFileSync(file, 'old');
            writeFileSync(other, 'old-copy');
            const driver = {
                databaseConnection: { export: () => new Uint8Array([4, 5]) },
                save: () => undefined
            };
            const adapter = new TypeormAdapter({} as any);
            (adapter as any).installAtomicSqljsSave({ options: { type: 'sqljs', location: file, autoSave: true }, driver });
            await (driver.save as any)(other);
            expect(Array.from(readFileSync(other))).toEqual([4, 5]);
            expect(readFileSync(file, 'utf8')).toEqual('old');
            expect(existsSync(`${other}.tmp`)).toBe(false);
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
