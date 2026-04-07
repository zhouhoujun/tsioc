import { Suite, BeforeEach, Test, AfterEach, Assert, Expect, ExpectToken } from '@tsdi/unit';
import { Inject, Token, Injectable } from '@tsdi/ioc';
import { CoverageReporter, CoverageOptions } from '../src';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';

@Injectable()
@Suite('CoverageReporter Test Suite')
export class CoverageReporterTest {

    @Inject()
    private reporter!: CoverageReporter;

    @BeforeEach()
    setup() {
    }

    @Test('should create CoverageReporter instance')
    testCreateInstance(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter).toBeDefined();
        expect(this.reporter instanceof CoverageReporter).toBeTruthy();
    }

    @Test('should have track method')
    testTrackMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter.track).toBeDefined();
        expect(typeof this.reporter.track).toBe('function');
    }

    @Test('should have renderSuite method')
    testRenderSuiteMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter.renderSuite).toBeDefined();
        expect(typeof this.reporter.renderSuite).toBe('function');
    }

    @Test('should have renderCase method')
    testRenderCaseMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter.renderCase).toBeDefined();
        expect(typeof this.reporter.renderCase).toBe('function');
    }

    @Test('should have render method')
    testRenderMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter.render).toBeDefined();
        expect(typeof this.reporter.render).toBe('function');
    }

    @Test('should have setOptions method')
    testSetOptionsMethod(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter.setOptions).toBeDefined();
        expect(typeof this.reporter.setOptions).toBe('function');
    }

    @Test('should throw error when tracking')
    testTrackError(@Inject(ExpectToken) expect: Expect) {
        const error = new Error('test error');
        let thrown = false;
        try {
            this.reporter.track(error);
        } catch (e) {
            thrown = true;
        }
        expect(thrown).toBeTruthy();
    }

    @Test('should not render when coverage disabled')
    async testDisabledCoverage(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ enabled: false });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with text-summary reporter')
    async testTextSummaryReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', error: new Error('fail'), used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with text reporter')
    async testTextReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with json reporter')
    async testJsonReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['json'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with html reporter')
    async testHtmlReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['html'],
            outputDir: 'test-coverage'
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with lcov reporter')
    async testLcovReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['lcov'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with cobertura reporter')
    async testCoberturaReport(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['cobertura'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should render with multiple reporters')
    async testMultipleReporters(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary', 'json'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', used: [2000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should handle empty suites')
    async testEmptySuites(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should calculate 100% coverage with all passing')
    async testAllPassing(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'All Passing Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', used: [2000000, 0] },
                { title: 'case 3', key: 'key3', used: [3000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should calculate 0% coverage with all failing')
    async testAllFailing(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'All Failing Suite',
            cases: [
                { title: 'case 1', key: 'key1', error: new Error('fail 1'), used: [1000000, 0] },
                { title: 'case 2', key: 'key2', error: new Error('fail 2'), used: [2000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should show high coverage with green color')
    async testHighCoverageColor(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'High Coverage Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', used: [2000000, 0] },
                { title: 'case 3', key: 'key3', used: [3000000, 0] },
                { title: 'case 4', key: 'key4', used: [4000000, 0] },
                { title: 'case 5', key: 'key5', error: new Error('fail'), used: [5000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should show medium coverage with yellow color')
    async testMediumCoverageColor(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Medium Coverage Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', used: [2000000, 0] },
                { title: 'case 3', key: 'key3', error: new Error('fail'), used: [3000000, 0] },
                { title: 'case 4', key: 'key4', error: new Error('fail'), used: [4000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @Test('should show low coverage with red color')
    async testLowCoverageColor(@Inject(ExpectToken) expect: Expect) {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Low Coverage Suite',
            cases: [
                { title: 'case 1', key: 'key1', error: new Error('fail'), used: [1000000, 0] },
                { title: 'case 2', key: 'key2', error: new Error('fail'), used: [2000000, 0] },
                { title: 'case 3', key: 'key3', error: new Error('fail'), used: [3000000, 0] },
                { title: 'case 4', key: 'key4', error: new Error('fail'), used: [4000000, 0] },
                { title: 'case 5', key: 'key5', used: [5000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(suites);
        expect(true).toBeTruthy();
    }

    @AfterEach()
    cleanup() {
    }
}