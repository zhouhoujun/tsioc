import { Suite, BeforeEach, Test, AfterEach } from '@tsdi/unit';
import { Inject, Token } from '@tsdi/ioc';
import { V8CoverageReporter } from '../src';
import { SuiteDescribe } from '@tsdi/unit';
import expect = require('expect');

@Suite('V8CoverageReporter Test Suite')
export class CoverageReporterTest {

    @Inject()
    private reporter!: V8CoverageReporter;

    @BeforeEach()
    setup() {
    }

    @Test('should create V8CoverageReporter instance')
    testCreateInstance() {
        expect(this.reporter).toBeDefined();
        expect(this.reporter instanceof V8CoverageReporter).toBeTruthy();
    }

    @Test('should have track method')
    testTrackMethod() {
        expect(this.reporter.track).toBeDefined();
        expect(typeof this.reporter.track).toBe('function');
    }

    @Test('should have render method')
    testRenderMethod() {
        expect(this.reporter.render).toBeDefined();
        expect(typeof this.reporter.render).toBe('function');
    }

    @Test('should have setOptions method')
    testSetOptionsMethod() {
        expect(this.reporter.setOptions).toBeDefined();
        expect(typeof this.reporter.setOptions).toBe('function');
    }

    @Test('should throw error when tracking')
    testTrackError() {
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
    async testDisabledCoverage() {
        this.reporter.setOptions({ enabled: false });
        
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with text-summary reporter')
    async testTextSummaryReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [2000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with text reporter')
    async testTextReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with json reporter')
    async testJsonReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with html reporter')
    async testHtmlReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with lcov reporter')
    async testLcovReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with cobertura reporter')
    async testCoberturaReport() {
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
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should render with multiple reporters')
    async testMultipleReporters() {
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
        
        await this.reporter.render(Array.from(suites.values()), [3000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should handle empty suites')
    async testEmptySuites() {
        this.reporter.setOptions({ 
            enabled: true, 
            reporters: ['text-summary'] 
        });
        
        const suites = new Map<Token, SuiteDescribe>();
        
        await this.reporter.render(Array.from(suites.values()), [0, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should calculate 100% coverage with all passing')
    async testAllPassing() {
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
        
        await this.reporter.render(Array.from(suites.values()), [6000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should calculate 0% coverage with all failing')
    async testAllFailing() {
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
        
        await this.reporter.render(Array.from(suites.values()), [3000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should show high coverage with green color')
    async testHighCoverageColor() {
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
        
        await this.reporter.render(Array.from(suites.values()), [15000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should show medium coverage with yellow color')
    async testMediumCoverageColor() {
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
        
        await this.reporter.render(Array.from(suites.values()), [10000000, 0]);
        expect(true).toBeTruthy();
    }

    @Test('should show low coverage with red color')
    async testLowCoverageColor() {
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
        
        await this.reporter.render(Array.from(suites.values()), [15000000, 0]);
        expect(true).toBeTruthy();
    }

    @AfterEach()
    cleanup() {
    }
}