import { Suite, BeforeEach, UnitModule, Test } from '../src';
import { ApplicationBuilder } from '@ts-ioc/bootstrap';
import { ServerBootstrapModule } from '@ts-ioc/platform-server/bootstrap';
import { Defer } from '@ts-ioc/core';


@Suite('Unit Test')
export class UnitTest {

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


ApplicationBuilder.create('.')
    .use(UnitModule, ServerBootstrapModule)
    .bootstrap(UnitTest);
