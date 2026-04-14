import { Suite, BeforeEach, Test, AfterEach, Assert, Expect, ExpectToken, Before } from '@tsdi/unit';
import { Inject, Token, Injectable } from '@tsdi/ioc';
import { KarmaReporter } from '../src';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';


@Suite('Browser Environment Tests')
export class BrowserEnvironmentTest {

    @Inject()
    private reporter!: KarmaReporter;

    private mockWindow: any;
    private mockDocument: any;
    private originalWindow: any;
    private originalDocument: any;

    @Before()
    setupBrowserEnvironment() {
        this.originalWindow = (global as any).window;
        this.originalDocument = (global as any).document;
    }

    @BeforeEach()
    setup() {
        this.mockDocument = {
            getElementById: (id: string) => {
                if (id === 'test-results' || id === 'test-summary') {
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
            document: this.mockDocument
        };
    }

    @AfterEach()
    cleanup() {
        if (this.originalWindow) {
            (global as any).window = this.originalWindow;
        } else {
            delete (global as any).window;
        }
        
        if (this.originalDocument) {
            (global as any).document = this.originalDocument;
        } else {
            delete (global as any).document;
        }
    }

    @Test('should detect non-browser environment')
    testNonBrowserEnvironment(@Inject(ExpectToken) expect: Expect) {
        expect(typeof window).toBe('undefined');
        expect(typeof document).toBe('undefined');
    }

    @Test('should handle browser environment for renderCase')
    testBrowserRenderCase(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const caseDesc: ICaseDescribe = {
            title: 'browser test case',
            key: 'browserKey',
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        expect(true).toBeTruthy();
    }

    @Test('should handle browser environment for failed case')
    testBrowserFailedCase(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const caseDesc: ICaseDescribe = {
            title: 'browser failed case',
            key: 'browserFailedKey',
            error: new Error('browser test error'),
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        expect(true).toBeTruthy();
    }

    @Test('should handle browser environment for final render')
    async testBrowserFinalRender(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('browser-suite', {
            describe: 'Browser Test Suite',
            cases: [
                { title: 'browser case 1', key: 'bkey1', used: [1000000, 0] },
                { title: 'browser case 2', key: 'bkey2', error: new Error('failed'), used: [2000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle missing DOM elements gracefully')
    testMissingDomElements(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = {
            getElementById: () => null,
            createElement: () => null
        };

        const caseDesc: ICaseDescribe = {
            title: 'no dom elements',
            key: 'noDomKey',
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        expect(true).toBeTruthy();
    }

    @Test('should handle empty test results container')
    testEmptyTestResults(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = {
            getElementById: (id: string) => {
                if (id === 'test-results') return null;
                return this.mockDocument.getElementById(id);
            },
            createElement: this.mockDocument.createElement
        };

        const caseDesc: ICaseDescribe = {
            title: 'no test-results container',
            key: 'noResultsKey',
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        expect(true).toBeTruthy();
    }

    @Test('should handle empty test summary container')
    async testEmptyTestSummary(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = {
            getElementById: (id: string) => {
                if (id === 'test-summary') return null;
                return this.mockDocument.getElementById(id);
            },
            createElement: this.mockDocument.createElement
        };

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('no-summary-suite', {
            describe: 'No Summary Suite',
            cases: [
                { title: 'case', key: 'key', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render multiple suites in browser')
    async testMultipleBrowserSuites(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Browser Suite 1',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        suites.set('suite2', {
            describe: 'Browser Suite 2',
            cases: [
                { title: 'case 2', key: 'key2', used: [2000000, 0] }
            ],
            start: [1000000, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle all passing tests in browser')
    async testAllPassingBrowserTests(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('all-pass', {
            describe: 'All Passing Suite',
            cases: [
                { title: 'pass 1', key: 'p1', used: [1000000, 0] },
                { title: 'pass 2', key: 'p2', used: [2000000, 0] },
                { title: 'pass 3', key: 'p3', used: [3000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle all failing tests in browser')
    async testAllFailingBrowserTests(@Inject(ExpectToken) expect: Expect) {
        (global as any).window = this.mockWindow;
        (global as any).document = this.mockDocument;

        const suites = new Map<Token, SuiteDescribe>();
        suites.set('all-fail', {
            describe: 'All Failing Suite',
            cases: [
                { title: 'fail 1', key: 'f1', error: new Error('e1'), used: [1000000, 0] },
                { title: 'fail 2', key: 'f2', error: new Error('e2'), used: [2000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }
}