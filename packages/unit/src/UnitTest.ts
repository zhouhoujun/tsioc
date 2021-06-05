import { LoadType, Type } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { BootApplication, DIModule } from '@tsdi/boot';
import { UnitTestConfigureRegister } from './UnitTestConfigureRegister';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestRunner } from './runner/UnitTestRunner';
import { RunAspect } from './aop/RunAspect';
import { Runner } from './runner/Runner';
import { OldTestRunner } from './runner/OldTestRunner';
import { SuiteRunner } from './runner/SuiteRunner';
import { TestReport } from './reports/TestReport';


@DIModule({
   imports: [
      AopModule,
      LogModule
   ],
   providers: [
      UnitTestConfigureRegister,
      RunAspect,
      OldTestRunner,
      { provide: Runner, useClass: SuiteRunner },
      UnitTestRunner,
      TestReport
   ],
   bootstrap: UnitTestRunner
})
export class UnitTest { }

/**
 * unit test.
 *
 * @export
 * @param {(string | Type | (string | Type)[])} src test source.
 * @param {(string | AppConfigure)} [config] test configure.
 * @param {...LoadType[]} deps custom set unit test dependencies.
 * @returns {Promise<any>}
 */
export async function runTest(src: string | Type | (string | Type)[], config?: string | UnitTestConfigure, ...loads: LoadType[]): Promise<any> {
   await BootApplication.run({ type: UnitTest, loads, configures: [config, { src: src }] })
}
