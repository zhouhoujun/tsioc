import { Suite, BeforeEach, Test, Assert, Expect, ExpectToken } from '@ts-ioc/unit';
import { Defer, Inject, IContainer, ContainerToken } from '@ts-ioc/core';



@Suite('Unit Test')
export class SuiteTest {

    // testContainer: AnyApplicationBuilder;

    @BeforeEach()
    async initTest() {
        console.log('---------beofre test-----------');
    }

    @Test('assert test timeout', 200)
    testTimeout() {
        console.log('--------assert test timeout------');
        let def = new Defer();
        setTimeout(() => {
            console.log('out time do...');
            def.resolve('out time do...')
        }, 300)
        return def.promise;
    }

    @Test('assert test in time', 200)
    testInTime(assert: Assert) {
        console.log('--------assert test in time------');
        let def = new Defer();
        setTimeout(() => {
            console.log('in time do...');
            def.resolve('in time do...')
        }, 100)
        assert.equal('0', 0);
        return def.promise;
    }

    @Test('expect test')
    async testEqural(@Inject(ExpectToken) expect: Expect, @Inject(ContainerToken) conatiner: IContainer) {
        await expect('true').toBe(true);
    }
}


// new UnitTest()
//     .use(ConsoleReporter)
//     .test(SuiteTest);
