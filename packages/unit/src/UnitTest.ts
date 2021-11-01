import { LoadType, Type } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { ApplicationOption, Application, Module } from '@tsdi/core';
import { UnitTestStartup } from './RegisterConfigure';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestRunner } from './runner/UnitTestRunner';
import { RunAspect } from './aop/RunAspect';
import { UnitRunner } from './runner/Runner';
import { OldTestRunner } from './runner/OldTestRunner';
import { SuiteRunner } from './runner/SuiteRunner';
import { DefaultTestReport } from './reports/TestReport';


@Module({
   imports: [
      AopModule,
      LogModule
   ],
   providers: [
      UnitTestStartup,
      RunAspect,
      OldTestRunner,
      { provide: UnitRunner, useClass: SuiteRunner },
      UnitTestRunner,
      DefaultTestReport
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
   await Application.run({ type: UnitTest, loads, configures: [config, { src: src }] } as ApplicationOption)
}
