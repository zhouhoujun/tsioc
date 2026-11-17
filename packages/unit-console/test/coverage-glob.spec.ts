import { mkdtempSync, writeFileSync, readdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { V8CoverageCollector } from '../src/V8CoverageCollector';
import expect = require('expect');

/** Reach the private glob translator through the public collector instance. */
function globToRegex(pattern: string): RegExp {
    const collector = new V8CoverageCollector(undefined as any);
    return new RegExp((collector as any).globToRegex(pattern), 'i');
}

describe('coverage glob matching', () => {

    it('scopes plain patterns to the start of the path', () => {
        const regex = globToRegex('src/**/*.ts');

        expect(regex.test('src/a.ts')).toBe(true);
        expect(regex.test('src/nested/deep/a.ts')).toBe(true);
        // The old implementation only anchored the end, so any package's
        // `src/...` matched this pattern.
        expect(regex.test('/repo/packages/ioc/src/a.ts')).toBe(false);
        expect(regex.test('lib/a.ts')).toBe(false);
    });

    it('matches any depth for a leading **/', () => {
        const regex = globToRegex('**/src/**/*.ts');

        expect(regex.test('src/a.ts')).toBe(true);
        expect(regex.test('packages/a/src/b/c.ts')).toBe(true);
        expect(regex.test('packages/a/test/b.ts')).toBe(false);
    });

    it('matches a trailing **/ pattern at any depth', () => {
        const regex = globToRegex('**/node_modules/**');

        expect(regex.test('node_modules/a.js')).toBe(true);
        expect(regex.test('packages/a/node_modules/b/c.js')).toBe(true);
        expect(regex.test('packages/a/src/b.js')).toBe(false);
    });

    it('matches a trailing ** without a slash across separators', () => {
        const regex = globToRegex('src/**');

        expect(regex.test('src/a.ts')).toBe(true);
        expect(regex.test('src/a/b/c.ts')).toBe(true);
        expect(regex.test('test/a.ts')).toBe(false);
    });

    it('keeps single-star matches inside one segment', () => {
        const regex = globToRegex('src/*.ts');

        expect(regex.test('src/a.ts')).toBe(true);
        expect(regex.test('src/nested/a.ts')).toBe(false);
    });

    it('supports the ? wildcard for a single character', () => {
        const regex = globToRegex('src/a?.ts');

        expect(regex.test('src/ab.ts')).toBe(true);
        expect(regex.test('src/abc.ts')).toBe(false);
    });

    it('escapes regular expression metacharacters in the pattern', () => {
        const regex = globToRegex('src/a+b(c).ts');

        expect(regex.test('src/a+b(c).ts')).toBe(true);
        expect(regex.test('src/aab(c).ts')).toBe(false);
    });


    it('clears coverage dumps from previous runs', () => {
        const dir = mkdtempSync(join(tmpdir(), 'coverage-clean-'));
        try {
            writeFileSync(join(dir, 'coverage-1-2-0.json'), '{}');
            writeFileSync(join(dir, 'keep.txt'), 'x');
            const collector = new V8CoverageCollector({ coverage: { outputDir: dir } } as any);

            (collector as any).clearCoverageDir();

            expect(readdirSync(dir)).toEqual(['keep.txt']);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('tolerates a missing coverage directory', () => {
        const dir = join(tmpdir(), 'coverage-missing-does-not-exist');
        const collector = new V8CoverageCollector({ coverage: { outputDir: dir } } as any);

        expect(() => (collector as any).clearCoverageDir()).not.toThrow();
        expect(existsSync(dir)).toBe(false);
    });

});
