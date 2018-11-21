import { Suite, Before, BeforeEach, UnitModule, Test } from '../src';
import { ApplicationBuilder } from '@ts-ioc/platform-server/bootstrap';
import { AnyApplicationBuilder } from '@ts-ioc/bootstrap';
import { Defer } from '@ts-ioc/core';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';


@Suite
export class UnitTest {

    // testContainer: AnyApplicationBuilder;

    @BeforeEach()
    async initTest() {
        console.log('beofre test');
    }

    @Test('assert test timeout', 200)
    testAssert() {
        console.log('exect test');
        let def = new Defer();
        setTimeout(() => {
            console.log('in time do...');
            def.resolve('in time do...')
        }, 150)
        return def.promise;
    }
}


ApplicationBuilder.create('.')
    .use(AopModule, LogModule)
    .use(UnitModule)
    .bootstrap(UnitTest);
