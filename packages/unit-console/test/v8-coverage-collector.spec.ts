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
}
