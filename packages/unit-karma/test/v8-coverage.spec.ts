import { Suite, BeforeEach, Test, AfterEach, Expect, ExpectToken } from '@tsdi/unit';
import { Injectable, Inject, Token } from '@tsdi/ioc';
import { V8CoverageCollector, KarmaCoverageOptions } from '../src';

@Injectable()
@Suite('V8CoverageCollector Test Suite')
export class V8CoverageCollectorTest {

    @Inject()
    private collector!: V8CoverageCollector;

    @BeforeEach()
    setup() {
    }

    @Test('should create V8CoverageCollector instance')
    testCreateInstance(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector).toBeDefined();
    }

    @Test('should have collect method')
    testCollectMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.collect).toBeDefined();
        expect(typeof this.collector.collect).toBe('function');
    }

    @Test('should have getSummary method')
    testGetSummaryMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.getSummary).toBeDefined();
        expect(typeof this.collector.getSummary).toBe('function');
    }

    @Test('should have getFileCoverage method')
    testGetFileCoverageMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.getFileCoverage).toBeDefined();
        expect(typeof this.collector.getFileCoverage).toBe('function');
    }

    @Test('should have getAllFileCoverages method')
    testGetAllFileCoveragesMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.getAllFileCoverages).toBeDefined();
        expect(typeof this.collector.getAllFileCoverages).toBe('function');
    }

    @Test('should have isEnabled method')
    testIsEnabledMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.isEnabled).toBeDefined();
        expect(typeof this.collector.isEnabled).toBe('function');
    }

    @Test('should have clear method')
    testClearMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.clear).toBeDefined();
        expect(typeof this.collector.clear).toBe('function');
    }

    @Test('should return empty summary when no coverage collected')
    testEmptySummary(@Inject(ExpectToken) expect: Expect) {
        const summary = this.collector.getSummary();
        expect(summary.lines.total).toBe(0);
        expect(summary.statements.total).toBe(0);
        expect(summary.functions.total).toBe(0);
        expect(summary.branches.total).toBe(0);
    }

    @Test('should return empty file coverages when no coverage collected')
    testEmptyFileCoverages(@Inject(ExpectToken) expect: Expect) {
        const files = this.collector.getAllFileCoverages();
        expect(files.size).toBe(0);
    }

    @Test('should clear coverage data')
    testClearCoverage(@Inject(ExpectToken) expect: Expect) {
        this.collector.clear();
        const files = this.collector.getAllFileCoverages();
        expect(files.size).toBe(0);
    }

    @Test('should return undefined for non-existent file')
    testNonExistentFile(@Inject(ExpectToken) expect: Expect) {
        const coverage = this.collector.getFileCoverage('/non/existent/file.ts');
        expect(coverage).toBeUndefined();
    }

    @Test('should check isEnabled status')
    testIsEnabledStatus(@Inject(ExpectToken) expect: Expect) {
        const enabled = this.collector.isEnabled();
        expect(typeof enabled).toBe('boolean');
    }

    @Test('should collect coverage without error')
    async testCollectCoverage(@Inject(ExpectToken) expect: Expect) {
        await this.collector.collect();
        expect(true).toBeTruthy();
    }

    @AfterEach()
    cleanup() {
        this.collector.clear();
    }
}
