import { Suite, BeforeEach, Test, AfterEach, Assert, Expect, ExpectToken } from '@tsdi/unit';
import { Inject, Token, Injectable } from '@tsdi/ioc';
import { KarmaReporter } from '../src';
import { SuiteDescribe, ICaseDescribe } from '@tsdi/unit';

@Suite('KarmaReporter Test Suite')
export class KarmaReporterTest {

    @Inject()
    private reporter!: KarmaReporter;

    @BeforeEach()
    setup() {
    }

    @Test('should create KarmaReporter instance')
    testCreateInstance(@Inject(ExpectToken) expect: Expect) {
        expect(this.reporter).toBeDefined();
        expect(this.reporter instanceof KarmaReporter).toBeTruthy();
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

    @Test('should render final report')
    async testRender(@Inject(ExpectToken) expect: Expect) {
        const suites = new Map<Token, SuiteDescribe>();
        suites.set('suite1', {
            describe: 'Test Suite 1',
            cases: [
                { title: 'case 1', key: 'key1', used: [1000000, 0] }
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