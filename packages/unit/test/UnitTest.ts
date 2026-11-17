import { lang, Inject, Container, CONTAINER } from '@tsdi/ioc';
import { Suite, BeforeEach, Test, Assert, Expect, ExpectToken, BeforeAll, Before, AfterEach } from '../src';
import expect = require('expect');


@Suite('Unit Test')
export class SuiteTest {

    // testContainer: AnyApplicationBuilder;
    private idx = 0;
    @BeforeAll()
    async init1() {
        console.log('---------before all init1-----------');
    }

    @Before()
    init2() {
        console.log('---------before all init2-----------');
    }

    @BeforeEach()
    async initTest() {
        console.log('---------before test case ' + (++this.idx) + '-----------');
    }

    @AfterEach()
    async afterTest() {
        console.log('---------after  test case ' + this.idx + '-----------');
    }

    // The case name describes a test that is still *within* its timeout: the
    // outer timeout must be comfortably larger than the inner timer, otherwise
    // the two 5ms timers race and the suite fails intermittently on a loaded
    // machine.
    @Test('assert test in time (timer below timeout)', 200)
    testTimeout() {
        console.log('---------assert test timeout------');
        const def = lang.defer();
        console.log('before out time do...');
        setTimeout(() => {
            console.log('out time do...');
            def.resolve('out time do...');
        }, 5)
        return def.promise;
    }

    @Test('assert test in time', 200)
    testInTime(assert: Assert) {
        console.log('---------assert test in time------');
        const def = lang.defer();
        assert.ok(assert);
        setTimeout(() => {
            console.log('in time do...');
            def.resolve('in time do...')
        }, 1)
        return def.promise;
    }

    @Test()
    async testEqural(@Inject(ExpectToken) expect1: Expect, @Inject() conatiner: Container) {
        await expect1('true').not.toBe(true);
    }

    @Test()
    testExpEqural() {
        expect('true').not.toBe(true);
    }
}

