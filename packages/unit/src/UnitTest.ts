import { Module, ProviderType, Type } from '@tsdi/ioc';
import { ApplicationOption, Application, PROCESS_ROOT, LoadType } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logs';
import { UNITTESTCONFIGURE, UnitTestConfigureService } from './configure';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestService } from './UnitTestService';
import { RunAspect } from './aop/RunAspect';
import { OldTestRunner } from './runner/OldTestRunner';
import { DefaultTestReport } from './reports/TestReport';


@Module({
   imports: [
      LoggerModule
   ],
   providers: [
      UnitTestConfigureService,
      RunAspect,
      OldTestRunner,
      UnitTestService,
      DefaultTestReport
   ],
   bootstrap: UnitTestService
})
export class UnitTest { }



/**
 * unit test.
 *
 * @export
 * @param {(string | Type | (string | Type)[])} src test source.
 * @param {UnitTestConfigure} [config] test configure.
 * @param {...LoadType[]} deps custom set unit test dependencies.
 * @returns {Promise<any>}
 */
export async function runTest(src: string | Type | (string | Type)[], config?: UnitTestConfigure, ...loads: LoadType[]): Promise<any> {
   const providers: ProviderType[] = [
      {
         provide: UNITTESTCONFIGURE,
         useValue: { ...config, src }
      }
   ];
   if (config?.baseURL) {
      providers.push({ provide: PROCESS_ROOT, useValue: config.baseURL });
   }
   await Application.run({
      module: UnitTest,
      loads,
      providers
   } as ApplicationOption)
}
