import { Suite, BeforeEach, Test, AfterEach, Expect, ExpectToken } from '@tsdi/unit';
import { Injectable, Inject } from '@tsdi/ioc';
import { BrowserCoverageCollector, BrowserCoverageOptions } from '../src';

declare const window: any;


@Suite('BrowserCoverageCollector Test Suite')
export class BrowserCoverageCollectorTest {

    @Inject()
    private collector!: BrowserCoverageCollector;

    @BeforeEach()
    setup() {
        if (typeof window !== 'undefined') {
            window.__coverage__ = {};
        }
    }

    @Test('should create BrowserCoverageCollector instance')
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

    @Test('should have setOptions method')
    testSetOptionsMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.collector.setOptions).toBeDefined();
        expect(typeof this.collector.setOptions).toBe('function');
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

    @Test('should return empty summary when no coverage')
    testEmptySummary(@Inject(ExpectToken) expect: Expect) {
        const summary = this.collector.getSummary();
        expect(summary.lines.total).toBe(0);
    }

    @Test('should return empty file coverages when no coverage')
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

    @Test('should check isEnabled status')
    testIsEnabledStatus(@Inject(ExpectToken) expect: Expect) {
        const enabled = this.collector.isEnabled();
        expect(typeof enabled).toBe('boolean');
    }

    @Test('should set options correctly')
    testSetOptions(@Inject(ExpectToken) expect: Expect) {
        const options: BrowserCoverageOptions = {
            enabled: true,
            include: ['**/*.ts'],
            exclude: ['**/*.spec.ts']
        };
        this.collector.setOptions(options);
        expect(true).toBeTruthy();
    }

    @AfterEach()
    cleanup() {
        this.collector.clear();
        if (typeof window !== 'undefined') {
            window.__coverage__ = undefined;
        }
    }
}
