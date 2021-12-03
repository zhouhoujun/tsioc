import { lang, Inject, Container, CONTAINER } from '@tsdi/ioc';
import { Suite, BeforeEach, Test, Assert, Expect, ExpectToken, BeforeAll, Before } from '../src';



@Suite('Unit Test')
export class SuiteTest {

    // testContainer: AnyApplicationBuilder;
    @BeforeAll()
    async init1() {
        console.log('---------beofre all init1-----------');
    }

    @Before()
    init2() {
        console.log('---------beofre all init2-----------');
    }

    @BeforeEach()
    async initTest() {
        console.log('---------beofre test-----------');
    }

    @Test('assert test timeout', 10)
    testTimeout() {
        console.log('---------assert test timeout------');
        let def = lang.defer();
        setTimeout(() => {
            console.log('out time do...');
            def.resolve('out time do...')
        }, 10)
        return def.promise;
    }

    @Test('assert test in time', 11)
    testInTime(assert: Assert) {
        console.log('---------assert test in time------');
        let def = lang.defer();
        assert.ok(assert);
        setTimeout(() => {
            console.log('in time do...');
            def.resolve('in time do...')
        }, 10)
        return def.promise;
    }

    @Test()
    async testEqural(@Inject(ExpectToken) expect: Expect, @Inject() conatiner: Container) {
        await expect('true').not.toBe(true);
    }
}

