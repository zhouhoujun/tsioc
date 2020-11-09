import { Type } from '@tsdi/ioc';
import { LoadType } from '@tsdi/core';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { BootApplication, DIModule } from '@tsdi/boot';
import { UnitTestConfigureRegister } from './UnitTestConfigureRegister';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestRunner } from './runner/UnitTestRunner';
import { RunAspect } from './aop/RunAspect';
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
      SuiteRunner,
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
export async function runTest(src: string | Type | (string | Type)[], config?: string | UnitTestConfigure, ...deps: LoadType[]): Promise<any> {
   await BootApplication.run({ type: UnitTest, deps: deps, configures: [config, { src: src }] })
}
