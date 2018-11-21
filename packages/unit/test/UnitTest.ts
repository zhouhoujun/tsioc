import { Suite, BeforeEach, UnitModule, Test } from '../src';
import { ApplicationBuilder } from '@ts-ioc/platform-server/bootstrap';
import { AnyApplicationBuilder } from '@ts-ioc/bootstrap';
import { Defer } from '@ts-ioc/core';


@Suite('Unit test...')
export class UnitTest {

    // testContainer: AnyApplicationBuilder;

    @BeforeEach()
    async initTest() {
        console.log('beofre test');
    }

    @Test('assert test timeout', 200)
    testAssert() {
        let def = new Defer();
        setTimeout(() => {
            console.log('in time do test...');
            def.resolve('in time do...')
        }, 10)
        return def.promise;
    }
}


ApplicationBuilder.create('.')
    .use(UnitModule)
    .bootstrap(UnitTest);
