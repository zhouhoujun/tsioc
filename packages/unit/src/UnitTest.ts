import { BootApplication, DIModule, ConfigureRegister } from '@ts-ioc/boot';
import { AopModule } from '@ts-ioc/aop';
import { LogModule } from '@ts-ioc/logs';
import { UnitSetup } from './UnitSetup';
import { UnitTestConfigureRegister } from './UnitTestConfigureRegister';
import * as aops from './aop';
import * as asserts from './assert';
import * as runners from './runner';
import * as reports from './reports';
import { LoadType } from '@ts-ioc/ioc';
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
 * @param {string | string[]} src
 * @param {(string | AppConfigure)} [config]
 * @param {...LoadType[]} used
 * @returns {Promise<any>}
 */
export async function runTest(src: string | string[], config?: string | UnitTestConfigure, ...used: LoadType[]): Promise<any> {
   await BootApplication.run(UnitTestContext.create(UnitTest, { deps: used, configures: [config, { src: src }] }))
}
