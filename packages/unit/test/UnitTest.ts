import { lang, Inject, Container, CONTAINER } from '@tsdi/ioc';
import { Suite, BeforeEach, Test, Assert, Expect, ExpectToken, BeforeAll, Before, AfterEach } from '../src';



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

    @Test('assert test timeout', 5)
    testTimeout() {
        console.log('---------assert test timeout------');
        let def = lang.defer();
        console.log('before out time do...');
        setTimeout(() => {
            console.log('out time do...');
            def.resolve('out time do...');
        }, 5)
        return def.promise;
    }

    @Test('assert test in time', 5)
    testInTime(assert: Assert) {
        console.log('---------assert test in time------');
        let def = lang.defer();
        assert.ok(assert);
        setTimeout(() => {
            console.log('in time do...');
            def.resolve('in time do...')
        }, 1)
        return def.promise;
    }

    @Test()
    async testEqural(@Inject(ExpectToken) expect: Expect, @Inject() conatiner: Container) {
        await expect('true').not.toBe(true);
    }
}

