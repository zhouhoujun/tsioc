import { BootApplication, DIModule, ConfigureRegister } from '@tsdi/boot';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { UnitSetup } from './UnitSetup';
import * as aops from './aop';
import * as asserts from './assert';
import * as runners from './runner';
import * as reports from './reports';
import { LoadType } from '@tsdi/ioc';
import { UnitTestConfigureRegister } from './UnitTestConfigureRegister';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestContext } from './UnitTestContext';
import { UnitTestRunner } from './runner';


@DIModule({
   imports: [
      AopModule,
      LogModule,
      UnitTestConfigureRegister,
      aops,
      UnitSetup,
      runners,
      reports,
      asserts
   ],
   providers: [
      { provide: ConfigureRegister, useClass: UnitTestConfigureRegister }
   ],
   bootstrap: UnitTestRunner
})
export class UnitTest {

}

/**
 * unit test.
 *
 * @export
 * @param {string | string[]} src test source.
 * @param {(string | AppConfigure)} [config] test configure.
 * @param {...LoadType[]} deps unit test dependencies.
 * @returns {Promise<any>}
 */
export async function runTest(src: string | string[], config?: string | UnitTestConfigure, ...deps: LoadType[]): Promise<any> {
   await BootApplication.run(UnitTestContext.parse({ targetType: UnitTest, deps: deps, configures: [config, { src: src }] }))
}
