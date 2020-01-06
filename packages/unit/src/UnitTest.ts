import { LoadType, Type } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { BootApplication, DIModule, ConfigureRegister } from '@tsdi/boot';
import { UnitSetup } from './UnitSetup';
import { UnitTestConfigureRegister } from './UnitTestConfigureRegister';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestContext } from './UnitTestContext';
import { UnitTestRunner } from './runner/UnitTestRunner';
import { RunAspect } from './aop/RunAspect';
import { OldTestRunner } from './runner/OldTestRunner';
import { SuiteRunner } from './runner/SuiteRunner';
import { TestReport } from './reports/TestReport';


@DIModule({
   imports: [
      AopModule,
      LogModule,
      UnitSetup,
      UnitTestContext,
      UnitTestConfigureRegister,
      RunAspect,
      OldTestRunner,
      SuiteRunner,
      UnitTestRunner,
      TestReport
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
 * @param {(string | Type | (string | Type)[])} src test source.
 * @param {(string | AppConfigure)} [config] test configure.
 * @param {...LoadType[]} deps custom set unit test dependencies.
 * @returns {Promise<any>}
 */
export async function runTest(src: string | Type | (string | Type)[], config?: string | UnitTestConfigure, ...deps: LoadType[]): Promise<any> {
   await BootApplication.run({ type: UnitTest, deps: deps, configures: [config, { src: src }] })
}
