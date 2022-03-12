import { LoadType, Type } from '@tsdi/ioc';
import { AopModule } from '@tsdi/aop';
import { LogModule } from '@tsdi/logs';
import { ApplicationOption, Application, Module } from '@tsdi/core';
import { UNITTESTCONFIGURE, UnitTestConfigureService } from './configure';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestRunner } from './runner/UnitTestRunner';
import { RunAspect } from './aop/RunAspect';
import { OldTestRunner } from './runner/OldTestRunner';
import { DefaultTestReport } from './reports/TestReport';
import { SuiteRunner } from './runner/SuiteRunner';


@Module({
   imports: [
      LogModule
   ],
   providers: [
      UnitTestConfigureService,
      RunAspect,
      SuiteRunner,
      OldTestRunner,
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
 * @param {(UnitTestConfigure} [config] test configure.
 * @param {...LoadType[]} deps custom set unit test dependencies.
 * @returns {Promise<any>}
 */
export async function runTest(src: string | Type | (string | Type)[], config?: UnitTestConfigure, ...loads: LoadType[]): Promise<any> {
   await Application.run({
      type: UnitTest,
      loads,
      providers: [
         {
            provide: UNITTESTCONFIGURE,
            useValue: { ...config, src }
         }
      ]
   } as ApplicationOption)
}
