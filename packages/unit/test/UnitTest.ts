import { Suite, BeforeEach, UnitTest, Test } from '../src';
import { Defer } from '@ts-ioc/core';
import { ConsoleReporter } from '@ts-ioc/unit-console';


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
            def.resolve('out time do...')
        }, 300)
        return def.promise;
    }

    @Test('assert test in time', 200)
    testInTime() {
        console.log('--------assert test in time------');
        let def = new Defer();
        setTimeout(() => {
            def.resolve('in time do...')
        }, 100)
        return def.promise;
    }

    testEqural() {
    }
}


new UnitTest()
    .use(ConsoleReporter)
    .test(SuiteTest);
