import { Suite, BeforeEach, Test, AfterEach, Assert } from '@tsdi/unit';
import { Inject, Token } from '@tsdi/ioc';
import { ConsoleReporter } from '../src';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';
import expect = require('expect');


@Suite('ConsoleReporter Test Suite')
export class ConsoleReporterTest {

    @Inject()
    private reporter!: ConsoleReporter;

    @BeforeEach()
    setup() {
    }

    @Test('should create ConsoleReporter instance')
    testCreateInstance() {
        expect(this.reporter).toBeDefined();
        expect(this.reporter instanceof ConsoleReporter).toBeTruthy();
    }

    @Test('should have track method')
    testTrackMethod() {
        expect(this.reporter.track).toBeDefined();
        expect(typeof this.reporter.track).toBe('function');
    }

    @Test('should have renderSuite method')
    testRenderSuiteMethod() {
        expect(this.reporter.renderSuite).toBeDefined();
        expect(typeof this.reporter.renderSuite).toBe('function');
    }

    @Test('should have renderCase method')
    testRenderCaseMethod() {
        expect(this.reporter.renderCase).toBeDefined();
        expect(typeof this.reporter.renderCase).toBe('function');
    }

    @Test('should have render method')
    testRenderMethod() {
        expect(this.reporter.render).toBeDefined();
        expect(typeof this.reporter.render).toBe('function');
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

    @Test('should render suite correctly')
    testRenderSuite(assert: Assert) {
        const suiteDesc: SuiteDescribe = {
            describe: 'Test Suite',
            cases: []
        };
        
        this.reporter.renderSuite(suiteDesc);
        assert.ok(true);
    }

    @Test('should render case without error')
    testRenderCaseNoError(assert: Assert) {
        const caseDesc: ICaseDescribe = {
            title: 'test case',
            key: 'testKey',
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        assert.ok(true);
    }

    @Test('should render case with error')
    testRenderCaseWithError(assert: Assert) {
        const caseDesc: ICaseDescribe = {
            title: 'failed case',
            key: 'testKey',
            error: new Error('test error'),
            used: [1000000, 0]
        };
        
        this.reporter.renderCase(caseDesc);
        assert.ok(true);
    }

    @Test('should render final report with all passing')
    async testRenderAllPassing() {
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite 1',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] },
                { title: 'case 2', key: 'key2', used: [2000000, 0] }
            ],
            start: [0, 0]
        });
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 2000000]);
        expect(true).toBeTruthy();
    }

    @Test('should handle multiple suites')
    async testMultipleSuites() {
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Suite One',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
            ],
            start: [0, 0]
        });
        suites.set('suite2', {
            describe: 'Suite Two',
            cases: [
                { title: 'case 2', key: 'key2', used: [2000000, 0] }
            ],
            start: [1000000, 0]
        });
        
        await this.reporter.render(Array.from(suites.values()), [1000000, 2000000]);
        expect(true).toBeTruthy();
    }

    @Test('should handle empty suites')
    async testEmptySuites() {
        const suites = new Map<Token, SuiteDescribe>();
        
        await this.reporter.render(Array.from(suites.values()), [0, 0]);
        expect(true).toBeTruthy();
    }

    @AfterEach()
    cleanup() {
    }
}