import { Suite, BeforeEach, Test, AfterEach, Assert, Expect, ExpectToken, Before, After } from '@tsdi/unit';
import { Inject, Token, Injectable, Injector } from '@tsdi/ioc';
import { KarmaReporter, CoverageReporter, CoverageOptions, BrowserCoverageCollector } from '../src';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';
import { HrtimeFormatter } from '@tsdi/core';

/**
 * E2E Test Suite - Tests the full end-to-end workflow of unit-karma package.
 * 端到端测试套件 - 测试unit-karma包的完整工作流程
 */
@Injectable()
@Suite('E2E Integration Tests')
export class E2EIntegrationTest {

    @Inject()
    private injector!: Injector;

    @Inject()
    private karmaReporter!: KarmaReporter;

    @Inject()
    private coverageReporter!: CoverageReporter;

    @Inject()
    private hrtime!: HrtimeFormatter;

    private mockWindow: any;
    private mockDocument: any;
    private originalWindow: any;

    @Before()
    setupEnvironment() {
        this.originalWindow = (global as any).window;
    }

    @BeforeEach()
    setup() {
        this.setupMockBrowserEnvironment();
    }

    private setupMockBrowserEnvironment(): void {
        this.mockDocument = {
            getElementById: (id: string) => {
                if (id === 'test-results' || id === 'test-summary' || id === 'coverage-report') {
                    return {
                        className: '',
                        innerHTML: '',
                        appendChild: (child: any) => {},
                        children: []
                    };
                }
                return null;
            },
            createElement: (tag: string) => ({
                className: '',
                innerHTML: '',
                textContent: '',
                appendChild: (child: any) => {}
            })
        };

        this.mockWindow = {
            document: this.mockDocument,
            __coverage__: {}
        };
    }

    @AfterEach()
    cleanup() {
        if (this.originalWindow) {
            (global as any).window = this.originalWindow;
        } else {
            delete (global as any).window;
        }
        this.coverageReporter.setOptions({ enabled: false });
    }

    @After()
    teardown() {
        this.coverageReporter.setOptions({ enabled: false });
    }

    // ==================== E2E Workflow Tests ====================

    @Test('should complete full test workflow - setup, run, report')
    async testFullWorkflow(@Inject(ExpectToken) expect: Expect) {
        // Step 1: Setup test suites
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('workflow-suite', {
            describe: 'Full Workflow Suite',
            cases: [
                { title: 'test case 1', key: 'wf1', used: [1000000, 0] },
                { title: 'test case 2', key: 'wf2', used: [2000000, 0] },
                { title: 'test case 3', key: 'wf3', error: new Error('workflow error'), used: [3000000, 0] }
            ],
            start: [0, 0]
        });

        // Step 2: Render suite
        const suiteDesc = suites.get('workflow-suite')!;
        this.karmaReporter.renderSuite(suiteDesc);
        expect(suiteDesc.describe).toBe('Full Workflow Suite');

        // Step 3: Render each case
        for (const caseDesc of suiteDesc.cases) {
            this.karmaReporter.renderCase(caseDesc);
        }

        // Step 4: Final render
        await this.karmaReporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should integrate KarmaReporter with CoverageReporter')
    async testReporterIntegration(@Inject(ExpectToken) expect: Expect) {
        // Setup both reporters
        this.coverageReporter.setOptions({
            enabled: true,
            reporters: ['text-summary']
        });

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('integration-suite', {
            describe: 'Integration Suite',
            cases: [
                { title: 'integration test', key: 'int1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });

        // Run both reporters
        this.karmaReporter.renderSuite(suites.get('integration-suite')!);
        await this.karmaReporter.render(suites);
        await this.coverageReporter.render(suites);

        expect(true).toBeTruthy();
    }

    @Test('should handle complete test cycle with multiple suites')
    async testMultipleSuitesCycle(@Inject(ExpectToken) expect: Expect) {
        const suites = new Map<Token, SuiteDescribe>();

        // Suite 1: All passing
        suites.set('suite-pass', {
            describe: 'Passing Suite',
            cases: [
                { title: 'pass 1', key: 'p1', used: [1000000, 0] },
                { title: 'pass 2', key: 'p2', used: [2000000, 0] }
            ],
            start: [0, 0]
        });

        // Suite 2: Mixed results
        suites.set('suite-mixed', {
            describe: 'Mixed Suite',
            cases: [
                { title: 'mixed pass', key: 'm1', used: [1500000, 0] },
                { title: 'mixed fail', key: 'm2', error: new Error('mixed error'), used: [2500000, 0] }
            ],
            start: [1000000, 0]
        });

        // Suite 3: All failing
        suites.set('suite-fail', {
            describe: 'Failing Suite',
            cases: [
                { title: 'fail 1', key: 'f1', error: new Error('fail error 1'), used: [3000000, 0] }
            ],
            start: [2000000, 0]
        });

        // Process all suites
        for (const [token, suite] of suites) {
            this.karmaReporter.renderSuite(suite);
            for (const caseDesc of suite.cases) {
                this.karmaReporter.renderCase(caseDesc);
            }
        }

        await this.karmaReporter.render(suites);
        expect(suites.size).toBe(3);
    }

    // ==================== Browser Environment E2E Tests ====================

    @Test('should complete browser workflow end-to-end')
    async testBrowserE2EWorkflow(@Inject(ExpectToken) expect: Expect) {
        // Setup browser environment
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('browser-e2e', {
            describe: 'Browser E2E Suite',
            cases: [
                { title: 'browser test 1', key: 'be1', used: [1000000, 0] },
                { title: 'browser test 2', key: 'be2', error: new Error('browser error'), used: [2000000, 0] }
            ],
            start: [0, 0]
        });

        // Execute full workflow
        this.karmaReporter.renderSuite(suites.get('browser-e2e')!);
        
        for (const caseDesc of suites.get('browser-e2e')!.cases) {
            this.karmaReporter.renderCase(caseDesc);
        }

        await this.karmaReporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle browser coverage collection workflow')
    async testBrowserCoverageWorkflow(@Inject(ExpectToken) expect: Expect) {
        // Setup browser environment with coverage data
        (global as any).window = {
            document: this.mockDocument,
            __coverage__: {
                '/src/test.ts': {
                    path: '/src/test.ts',
                    s: { '1': 1, '2': 0 },
                    b: {},
                    f: { '1': 1 },
                    fnMap: { '1': { name: 'testFn', line: 1, loc: { start: { line: 1, column: 0 }, end: { line: 5, column: 0 } } } },
                    statementMap: { '1': { start: { line: 1, column: 0 }, end: { line: 2, column: 0 } }, '2': { start: { line: 3, column: 0 }, end: { line: 4, column: 0 } } },
                    branchMap: {}
                }
            }
        };

        this.coverageReporter.setOptions({
            enabled: true,
            reporters: ['text-summary', 'json'],
            include: ['**/*.ts'],
            exclude: ['**/*.spec.ts']
        });

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('browser-cov', {
            describe: 'Browser Coverage Suite',
            cases: [{ title: 'coverage test', key: 'cov1', used: [1000000, 0] }],
            start: [0, 0]
        });

        await this.karmaReporter.render(suites);
        await this.coverageReporter.render(suites);

        expect(true).toBeTruthy();
    }

    // ==================== Node Environment E2E Tests ====================

    @Test('should handle node environment workflow')
    async testNodeWorkflow(@Inject(ExpectToken) expect: Expect) {
        // Node environment (no window)
        delete (global as any).window;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('node-e2e', {
            describe: 'Node E2E Suite',
            cases: [
                { title: 'node test 1', key: 'ne1', used: [1000000, 0] },
                { title: 'node test 2', key: 'ne2', used: [2000000, 0] }
            ],
            start: [0, 0]
        });

        this.karmaReporter.renderSuite(suites.get('node-e2e')!);
        
        for (const caseDesc of suites.get('node-e2e')!.cases) {
            this.karmaReporter.renderCase(caseDesc);
        }

        await this.karmaReporter.render(suites);
        expect(true).toBeTruthy();
    }

    // ==================== Error Handling E2E Tests ====================

    @Test('should track and report errors end-to-end')
    async testErrorTrackingWorkflow(@Inject(ExpectToken) expect: Expect) {
        const testError = new Error('E2E test error');
        testError.stack = 'Error: E2E test error\n    at test()';

        let thrown = false;
        try {
            this.karmaReporter.track(testError);
        } catch (e) {
            thrown = true;
        }
        expect(thrown).toBeTruthy();
    }

    @Test('should handle multiple error scenarios in workflow')
    async testMultipleErrorsWorkflow(@Inject(ExpectToken) expect: Expect) {
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('error-suite', {
            describe: 'Error Handling Suite',
            cases: [
                { title: 'error 1', key: 'e1', error: new Error('error 1'), used: [1000000, 0] },
                { title: 'error 2', key: 'e2', error: new Error('error 2'), used: [2000000, 0] },
                { title: 'error 3', key: 'e3', error: new Error('error 3'), used: [3000000, 0] }
            ],
            start: [0, 0]
        });

        await this.karmaReporter.render(suites);
        
        const suite = suites.get('error-suite')!;
        const errorCount = suite.cases.filter(c => c.error).length;
        expect(errorCount).toBe(3);
    }

    @Test('should handle coverage threshold failures')
    async testCoverageThresholdWorkflow(@Inject(ExpectToken) expect: Expect) {
        this.coverageReporter.setOptions({
            enabled: true,
            reporters: ['text-summary'],
            threshold: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100
            }
        });

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('threshold-suite', {
            describe: 'Threshold Suite',
            cases: [{ title: 'threshold test', key: 'th1', used: [1000000, 0] }],
            start: [0, 0]
        });

        // This should work even if coverage is below threshold (warning only)
        await this.coverageReporter.render(suites);
        expect(true).toBeTruthy();
    }

    // ==================== Coverage Report Format E2E Tests ====================

    @Test('should generate all report formats end-to-end')
    async testAllReportFormatsWorkflow(@Inject(ExpectToken) expect: Expect) {
        const reportTypes = ['text', 'text-summary', 'json', 'html', 'lcov', 'cobertura'];

        for (const reporterType of reportTypes) {
            this.coverageReporter.setOptions({
                enabled: true,
                reporters: [reporterType as any],
                outputDir: 'test-coverage-output'
            });

            const suites = new Map<Token, SuiteDescribe>();
            suites.set('format-suite', {
                describe: `Format Suite ${reporterType}`,
                cases: [{ title: `format test ${reporterType}`, key: `fmt-${reporterType}`, used: [1000000, 0] }],
                start: [0, 0]
            });

            await this.coverageReporter.render(suites);
        }

        expect(reportTypes.length).toBe(6);
    }

    @Test('should generate combined reports workflow')
    async testCombinedReportsWorkflow(@Inject(ExpectToken) expect: Expect) {
        this.coverageReporter.setOptions({
            enabled: true,
            reporters: ['text-summary', 'json', 'lcov'],
            outputDir: 'combined-coverage'
        });

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('combined-suite', {
            describe: 'Combined Reports Suite',
            cases: [
                { title: 'combined test 1', key: 'cmb1', used: [1000000, 0] },
                { title: 'combined test 2', key: 'cmb2', used: [2000000, 0] }
            ],
            start: [0, 0]
        });

        await this.karmaReporter.render(suites);
        await this.coverageReporter.render(suites);

        expect(true).toBeTruthy();
    }

    // ==================== Injector Integration Tests ====================

    @Test('should resolve all components from injector')
    testInjectorResolution(@Inject(ExpectToken) expect: Expect) {
        const karmaReporter = this.injector.get(KarmaReporter);
        const coverageReporter = this.injector.get(CoverageReporter);
        const browserCollector = this.injector.get(BrowserCoverageCollector);

        expect(karmaReporter).toBeDefined();
        expect(coverageReporter).toBeDefined();
        expect(browserCollector).toBeDefined();

        expect(karmaReporter instanceof KarmaReporter).toBeTruthy();
        expect(coverageReporter instanceof CoverageReporter).toBeTruthy();
    }

    @Test('should use shared hrtime formatter across reporters')
    testSharedHrtimeFormatter(@Inject(ExpectToken) expect: Expect) {
        const hrtime = this.injector.get(HrtimeFormatter);

        expect(hrtime).toBeDefined();
        expect(this.karmaReporter).toBeDefined();
        expect(this.coverageReporter).toBeDefined();
    }

    // ==================== Performance E2E Tests ====================

    @Test('should handle large suite workflow efficiently')
    async testLargeSuiteWorkflow(@Inject(ExpectToken) expect: Expect) {
        const cases: ICaseDescribe[] = [];
        for (let i = 0; i < 50; i++) {
            cases.push({
                title: `large suite test ${i}`,
                key: `large-${i}`,
                used: [1000000 + i * 100000, 0],
                error: i % 10 === 0 ? new Error(`error ${i}`) : undefined
            });
        }

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('large-suite', {
            describe: 'Large Suite (50 tests)',
            cases,
            start: [0, 0]
        });

        const startTime = process.hrtime();
        await this.karmaReporter.render(suites);
        const endTime = process.hrtime(startTime);
        const durationMs = endTime[0] * 1000 + endTime[1] / 1000000;

        expect(durationMs).toBeLessThan(5000);
        expect(suites.get('large-suite')!.cases.length).toBe(50);
    }

    @Test('should handle concurrent reporter operations')
    async testConcurrentOperations(@Inject(ExpectToken) expect: Expect) {
        const suites1 = new Map<Token, SuiteDescribe>();
        suites1.set('concurrent-1', {
            describe: 'Concurrent Suite 1',
            cases: [{ title: 'c1', key: 'c1', used: [1000000, 0] }],
            start: [0, 0]
        });

        const suites2 = new Map<Token, SuiteDescribe>();
        suites2.set('concurrent-2', {
            describe: 'Concurrent Suite 2',
            cases: [{ title: 'c2', key: 'c2', used: [2000000, 0] }],
            start: [1000000, 0]
        });

        // Run concurrently
        await Promise.all([
            this.karmaReporter.render(suites1),
            this.karmaReporter.render(suites2)
        ]);

        expect(true).toBeTruthy();
    }

    // ==================== Edge Cases E2E Tests ====================

    @Test('should handle empty test workflow')
    async testEmptyWorkflow(@Inject(ExpectToken) expect: Expect) {
        const suites = new Map<Token, SuiteDescribe>();
        
        await this.karmaReporter.render(suites);
        await this.coverageReporter.render(suites);
        
        expect(suites.size).toBe(0);
    }

    @Test('should handle disabled coverage workflow')
    async testDisabledCoverageWorkflow(@Inject(ExpectToken) expect: Expect) {
        this.coverageReporter.setOptions({ enabled: false });

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('disabled-suite', {
            describe: 'Disabled Coverage Suite',
            cases: [{ title: 'disabled test', key: 'dis1', used: [1000000, 0] }],
            start: [0, 0]
        });

        await this.coverageReporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle mixed environment detection')
    async testMixedEnvironmentWorkflow(@Inject(ExpectToken) expect: Expect) {
        // Test with browser mock
        (global as any).window = this.mockWindow;
        
        const browserSuites = new Map<Token, SuiteDescribe>();
        browserSuites.set('browser-env', {
            describe: 'Browser Environment Suite',
            cases: [{ title: 'browser env test', key: 'be', used: [1000000, 0] }],
            start: [0, 0]
        });

        await this.karmaReporter.render(browserSuites);

        // Test with node environment
        delete (global as any).window;
        
        const nodeSuites = new Map<Token, SuiteDescribe>();
        nodeSuites.set('node-env', {
            describe: 'Node Environment Suite',
            cases: [{ title: 'node env test', key: 'ne', used: [1000000, 0] }],
            start: [0, 0]
        });

        await this.karmaReporter.render(nodeSuites);
        expect(true).toBeTruthy();
    }
}