import { Suite, Test } from '@tsdi/unit';
import { V8CoverageCollector } from '../src/V8CoverageCollector';
import expect = require('expect');

@Suite('V8CoverageCollector Test Suite')
export class V8CoverageCollectorTest {

    @Test('should create instance with default options')
    testCreateInstance() {
        const collector = new V8CoverageCollector();
        expect(collector.isEnabled()).toBeFalsy();
        expect(collector.getSummary()).toBeDefined();
    }

    @Test('should create instance with custom options')
    testCreateWithOptions() {
        const collector = new V8CoverageCollector({
            coverage: {
                enabled: true,
                include: ['src/**/*.ts'],
                exclude: ['test/**']
            }
        });
        expect(collector.isEnabled()).toBeTruthy();
    }

    @Test('should calculate summary correctly')
    testSummaryCalculation() {
        const collector = new V8CoverageCollector();
        const summary = collector.getSummary();
        
        expect(summary.lines.total).toBe(0);
        expect(summary.statements.total).toBe(0);
        expect(summary.functions.total).toBe(0);
        expect(summary.branches.total).toBe(0);
    }

    @Test('should clear coverage data')
    testClearCoverage() {
        const collector = new V8CoverageCollector();
        collector.clear();
        
        expect(collector.getAllFileCoverages().size).toBe(0);
        expect(collector.getSummary().lines.total).toBe(0);
    }

    @Test('should get relative path correctly')
    testGetRelativePath() {
        const collector = new V8CoverageCollector({
            baseURL: '/home/project'
        });
        
        expect((collector as any).getRelativePath('/home/project/src/index.ts')).toBe('src/index.ts');
        expect((collector as any).getRelativePath('/home/project/src/utils/helper.ts')).toBe('src/utils/helper.ts');
    }

    @Test('should match src directory files')
    testMatchSrcFiles() {
        const collector = new V8CoverageCollector({
            baseURL: '/home/project'
        });
        
        expect((collector as any).matchGlob('src/index.ts', 'src/**/*.ts')).toBeTruthy();
        expect((collector as any).matchGlob('src/utils/helper.ts', 'src/**/*.ts')).toBeTruthy();
        expect((collector as any).matchGlob('test/index.ts', 'src/**/*.ts')).toBeFalsy();
    }

    @Test('should match patterns with leading **/')
    testLeadingDoubleStar() {
        const collector = new V8CoverageCollector();
        
        expect((collector as any).matchGlob('packages/core/src/index.ts', '**/src/**/*.ts')).toBeTruthy();
        expect((collector as any).matchGlob('src/index.ts', '**/src/**/*.ts')).toBeTruthy();
    }

    @Test('should match extension patterns')
    testExtensionPatterns() {
        const collector = new V8CoverageCollector();
        
        expect((collector as any).matchGlob('file.spec.ts', '**/*.spec.ts')).toBeTruthy();
        expect((collector as any).matchGlob('file.test.ts', '**/*.test.ts')).toBeTruthy();
        expect((collector as any).matchGlob('file.ts', '**/*.spec.ts')).toBeFalsy();
    }

    @Test('should match single star patterns')
    testSingleStarPatterns() {
        const collector = new V8CoverageCollector();
        
        expect((collector as any).matchGlob('file.ts', '*.ts')).toBeTruthy();
        expect((collector as any).matchGlob('file.js', '*.ts')).toBeFalsy();
    }

    @Test('should merge coverage for the same file across multiple results')
    testMergeCoverageForSameFile() {
        const collector = new V8CoverageCollector();
        const previous = {
            path: '/tmp/sample.ts',
            lines: new Map([[1, 1], [2, 0]]),
            statements: new Map([[1, 1], [2, 0]]),
            functions: new Map([[1, 1], [2, 0]]),
            branches: new Map([[1, 1], [2, 0]]),
            summary: {
                lines: { total: 2, covered: 1, percentage: 50 },
                statements: { total: 2, covered: 1, percentage: 50 },
                functions: { total: 2, covered: 1, percentage: 50 },
                branches: { total: 2, covered: 1, percentage: 50 }
            }
        };
        const next = {
            path: '/tmp/sample.ts',
            lines: new Map([[1, 0], [2, 1]]),
            statements: new Map([[1, 0], [2, 1]]),
            functions: new Map([[1, 0], [2, 1]]),
            branches: new Map([[1, 0], [2, 1]]),
            summary: {
                lines: { total: 2, covered: 1, percentage: 50 },
                statements: { total: 2, covered: 1, percentage: 50 },
                functions: { total: 2, covered: 1, percentage: 50 },
                branches: { total: 2, covered: 1, percentage: 50 }
            }
        };

        const merged = (collector as any).mergeFileCoverage(previous, next);

        expect(Array.from(merged.lines.entries())).toEqual([[1, 1], [2, 1]]);
        expect(Array.from(merged.statements.entries())).toEqual([[1, 1], [2, 1]]);
        expect(Array.from(merged.functions.entries())).toEqual([[1, 1], [2, 1]]);
        expect(Array.from(merged.branches.entries())).toEqual([[1, 1], [2, 1]]);
        expect(merged.summary.lines.covered).toBe(2);
        expect(merged.summary.statements.covered).toBe(2);
        expect(merged.summary.functions.covered).toBe(2);
        expect(merged.summary.branches.covered).toBe(2);
    }

    @Test('should prefer nested block ranges when calculating line coverage')
    testLineCoverageUsesNestedRanges() {
        const collector = new V8CoverageCollector();
        const source = [
            'if (flag) {',
            '  run();',
            '} else {',
            '  skip();',
            '}'
        ].join('\n');
        const coverage = (collector as any).processScript({
            scriptId: '1',
            url: '/tmp/sample.ts',
            functions: [{
                functionName: '',
                isBlockCoverage: true,
                ranges: [
                    { startOffset: 0, endOffset: source.length, count: 1 },
                    { startOffset: source.indexOf('run();'), endOffset: source.indexOf('run();') + 'run();'.length, count: 1 },
                    { startOffset: source.indexOf('skip();'), endOffset: source.indexOf('skip();') + 'skip();'.length, count: 0 }
                ]
            }]
        }, source, '/tmp/sample.ts');

        expect(Array.from(coverage.lines.entries())).toEqual([
            [1, 1],
            [2, 1],
            [3, 1],
            [4, 0],
            [5, 1]
        ]);
        expect(coverage.summary.lines.covered).toBe(4);
        expect(coverage.summary.lines.total).toBe(5);
    }

    @Test('should ignore top level wrapper when counting functions and statements')
    testIgnoreTopLevelWrapperForFunctions() {
        const collector = new V8CoverageCollector();
        const source = [
            'export function run(flag: boolean) {',
            '  return flag ? 1 : 0;',
            '}'
        ].join('\n');
        const fnStart = source.indexOf('export function run');
        const coverage = (collector as any).processScript({
            scriptId: '1',
            url: '/tmp/run.ts',
            functions: [
                {
                    functionName: '',
                    isBlockCoverage: true,
                    ranges: [{ startOffset: 0, endOffset: source.length, count: 1 }]
                },
                {
                    functionName: 'run',
                    isBlockCoverage: true,
                    ranges: [
                        { startOffset: fnStart, endOffset: source.length, count: 1 },
                        { startOffset: source.indexOf('1'), endOffset: source.indexOf('1') + 1, count: 1 },
                        { startOffset: source.lastIndexOf('0'), endOffset: source.lastIndexOf('0') + 1, count: 0 }
                    ]
                }
            ]
        }, source, '/tmp/run.ts');

        expect(Array.from(coverage.functions.entries())).toEqual([[1, 1]]);
        expect(Array.from(coverage.statements.entries())).toEqual([[1, 1], [2, 1]]);
        expect(Array.from(coverage.branches.entries())).toEqual([[2, 1]]);
    }
}
