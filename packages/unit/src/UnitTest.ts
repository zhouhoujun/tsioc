import { Module, Provider, AbstractType } from '@tsdi/ioc';
import { Application, ApplicationArguments, AppMode, AppPlatform, LoadType } from '@tsdi/core';
import { LoggerModule } from '@tsdi/logger';
import { UNITTESTCONFIGURE, UnitTestConfigureService } from './configure';
import { UnitTestConfigure } from './UnitTestConfigure';
import { UnitTestService } from './UnitTestService';
import { RunAspect } from './aop/RunAspect';
import { OldTestRunner } from './runner/OldTestRunner';
import { DefaultTestReport } from './reports/TestReport';
import { SuiteRunner } from './runner/SuiteRunner';

class UnitTestApplicationArguments extends ApplicationArguments {
    private _baseURL: string;
    private _envOverride: Partial<ApplicationArguments> = {};
    
    constructor(baseURL: string) {
        super();
        this._baseURL = baseURL;
    }
    
    get argsSource(): string[] { return []; }
    get args(): Record<string, string> { return {}; }
    get cmds(): string[] { return []; }
    get env(): Record<string, any> { return {}; }
    get signls(): string[] { return []; }
    
    get name(): string { return 'unit-test'; }
    get version(): string { return '1.0.0'; }
    get mode(): AppMode { return 'test'; }
    get platform(): AppPlatform { return 'node'; }
    get cwd(): string { return this._envOverride.cwd ?? this._baseURL; }
    get hostname(): string { return 'localhost'; }
    get pid(): number { return process.pid; }
    get locale(): string { return 'en-US'; }
    get timezone(): string { return 'UTC'; }
    get debug(): boolean { return true; }
    get logLevel(): string { return 'debug'; }
    get baseURL(): string { return this._envOverride.baseURL ?? this._baseURL; }
    
    reset(): void {}
    mergeEnvironment(env: Partial<ApplicationArguments>): void {
        this._envOverride = { ...this._envOverride, ...env };
    }
}

@Module({
   imports: [
      LoggerModule
   ],
   providers: [
      UnitTestConfigureService,
      RunAspect,
      SuiteRunner,
      OldTestRunner,
      DefaultTestReport
   ],
   declarations:[
      UnitTestService
   ],
   bootstrap: UnitTestService
})
export class UnitTest { }



export async function runTest(src: string | AbstractType | (string | AbstractType)[], config?: UnitTestConfigure, ...loads: LoadType[]): Promise<any> {
   const providers: Provider[] = [
      {
         provide: UNITTESTCONFIGURE,
         useValue: { ...config, src }
      }
   ];
   if (config?.baseURL) {
      providers.push({ 
         provide: ApplicationArguments, 
         useClass: UnitTestApplicationArguments,
         deps: [],
         useFactory: () => new UnitTestApplicationArguments(config.baseURL!)
      });
   }
   await Application.run({
      module: UnitTest,
      loads,
      providers
   })
}
