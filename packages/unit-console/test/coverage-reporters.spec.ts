import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { V8CoverageReporter } from '../src/coverage';
import expect = require('expect');

function fileCoverage(path: string, lines: Array<[number, number]>) {
    const covered = lines.filter(([, hits]) => hits > 0).length;
    const ratio = lines.length ? (covered / lines.length) * 100 : 100;
    const summary = { total: lines.length, covered, percentage: ratio };
    return {
        path,
        lines: new Map(lines),
        statements: new Map(lines),
        functions: new Map<number, number>(),
        branches: new Map<number, number>(),
        summary: { lines: summary, statements: summary, branches: summary, functions: summary }
    };
}

function reporterWith(outputDir: string) {
    const files = new Map<string, any>([
        ['/repo/src/a.ts', fileCoverage('/repo/src/a.ts', [[1, 1], [2, 0]])],
        ['/repo/src/b.ts', fileCoverage('/repo/src/b.ts', [[1, 2]])]
    ]);
    const summary = {
        lines: { total: 3, covered: 2, percentage: 66.67 },
        statements: { total: 3, covered: 2, percentage: 66.67 },
        branches: { total: 0, covered: 0, percentage: 100 },
        functions: { total: 0, covered: 0, percentage: 100 }
    };
    const collector = {
        getSummary: () => summary,
        getAllFileCoverages: () => files
    };
    const reporter: any = new V8CoverageReporter({ format: () => '1ms' } as any, {} as any, {
        coverage: { outputDir }
    } as any);
    reporter.coverageCollector = collector;
    return reporter;
}

describe('coverage reporters', () => {

    it('writes an lcov.info file with DA/LF/LH records', () => {
        const dir = mkdtempSync(join(tmpdir(), 'lcov-report-'));
        try {
            reporterWith(dir).renderLcovReport();

            const lcov = readFileSync(join(dir, 'lcov.info'), 'utf-8');
            expect(lcov).toContain('SF:/repo/src/a.ts');
            expect(lcov).toContain('DA:1,1');
            expect(lcov).toContain('DA:2,0');
            expect(lcov).toContain('LF:2');
            expect(lcov).toContain('LH:1');
            expect(lcov).toContain('end_of_record');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('writes a cobertura.xml file with class and line entries', () => {
        const dir = mkdtempSync(join(tmpdir(), 'cobertura-report-'));
        try {
            reporterWith(dir).renderCoberturaReport();

            const xml = readFileSync(join(dir, 'cobertura.xml'), 'utf-8');
            expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
            expect(xml).toContain('<coverage line-rate="0.6667"');
            expect(xml).toContain('<class name="');
            expect(xml).toContain('<line number="1" hits="1"/>');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('writes an html index with the file table', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'html-report-'));
        try {
            await reporterWith(dir).renderHtmlReport();

            expect(existsSync(join(dir, 'index.html'))).toBe(true);
            const html = readFileSync(join(dir, 'index.html'), 'utf-8');
            expect(html).toContain('<title>Coverage report</title>');
            expect(html).toContain('a.ts');
            expect(html).toContain('66.67%');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('creates the report directory when missing', () => {
        const base = mkdtempSync(join(tmpdir(), 'report-dir-'));
        const dir = join(base, 'nested', 'coverage');
        try {
            reporterWith(dir).renderLcovReport();
            expect(existsSync(join(dir, 'lcov.info'))).toBe(true);
        } finally {
            rmSync(base, { recursive: true, force: true });
        }
    });

    it('skips reports when no collector is attached', () => {
        const reporter: any = new V8CoverageReporter({ format: () => '1ms' } as any, {} as any, {} as any);
        reporter.coverageCollector = undefined;

        expect(() => reporter.renderLcovReport()).not.toThrow();
        expect(() => reporter.renderCoberturaReport()).not.toThrow();
    });

    it('warns instead of throwing when the report directory cannot be created', () => {
        const base = mkdtempSync(join(tmpdir(), 'report-failure-'));
        const notADir = join(base, 'file');
        try {
            writeFileSync(notADir, 'x');
            const reporter = reporterWith(notADir);

            expect(() => reporter.renderLcovReport()).not.toThrow();
            expect(existsSync(join(notADir, 'lcov.info'))).toBe(false);
        } finally {
            rmSync(base, { recursive: true, force: true });
        }
    });

    it('escapes html in file names', () => {
        const dir = mkdtempSync(join(tmpdir(), 'html-escape-'));
        try {
            const reporter = reporterWith(dir);
            reporter.coverageCollector = {
                getSummary: () => ({ lines: { total: 1, covered: 1, percentage: 100 }, statements: { total: 1, covered: 1, percentage: 100 }, branches: { total: 0, covered: 0, percentage: 100 }, functions: { total: 0, covered: 0, percentage: 100 } }),
                getAllFileCoverages: () => new Map([['/repo/src/<script>.ts', fileCoverage('/repo/src/<script>.ts', [[1, 1]])]])
            };

            reporter.renderHtmlReport();

            const html = readFileSync(join(dir, 'index.html'), 'utf-8');
            expect(html).not.toContain('<script>.ts');
            expect(html).toContain('&lt;script&gt;.ts');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

});
