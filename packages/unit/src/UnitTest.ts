import { ApplicationBuilder, ModuleConfigure, ModuleConfig, BootOptions, Runnable, RunnableEvents, isDIModuleClass } from '@ts-ioc/bootstrap';
import { UnitModule } from './UnitModule';
import { Src } from '@ts-ioc/activities';
import { isClass, hasClassMetadata, Type, isString, isArray, Token, IContainer } from '@ts-ioc/core';
import { Suite, Report } from './core';
import { TestReport, ReportsToken, isReporterClass } from './reports';
import { SuiteRunner } from './runner';

export interface UnitTestOptions extends BootOptions<any> {
   report?: boolean;
}

/**
 * unit test.
 *
 * @export
 * @class UnitTest
 * @extends {ApplicationBuilder<any>}
 */
export class UnitTest extends ApplicationBuilder<any> {
   constructor() {
      super();
      this.initUnit();
   }

   initUnit() {
      this.use(UnitModule);
      this.on(RunnableEvents.registeredExt, (types: Type<any>[], container: IContainer) => {
         types.forEach(type => {
            if (isReporterClass(type)) {
               this.useReporter(container, type);
            } else if (isDIModuleClass(type)) {
               let injMd = this.getInjectedModule(type);
               let pdmap = injMd.getProviderMap();
               if (pdmap) {
                  pdmap.provides().forEach(p => {
                     if (isReporterClass(p)) {
                        this.useReporter(container, p);
                     }
                  });
               }
            }
         });
      });
   }


   protected useReporter(contaienr: IContainer, ...reporters: Type<any>[]): this {
      let reps = contaienr.get(ReportsToken) as Type<any>[];
      if (reps) {
         reps = reps.concat(...reporters);
      } else {
         reps = reporters;
      }
      contaienr.bindProvider(ReportsToken, reps.filter(r => isClass(r) && hasClassMetadata(Report, r)));
      return this;
   }


   async test(src: string | Type<any> | (Type<any> | string)[]) {
      let suites: any[] = [];
      let dbuiler = this.getPools().getDefault().getBuilder();
      if (isString(src)) {
         let alltypes = await dbuiler.loader.loadTypes([{ files: [src] }]);
         alltypes.forEach(tys => {
            suites = suites.concat(tys);
         })
      } else if (isClass(src)) {
         suites = [src];
      } else if (isArray(src)) {
         if (src.some(t => isClass(t))) {
            suites = src;
         } else {
            let alltypes = await dbuiler.loader.loadTypes([{ files: src }]);
            alltypes.forEach(tys => {
               suites = suites.concat(tys);
            })
         }
      }
      let runners = await Promise.all(suites.filter(v => isClass(v) && hasClassMetadata(Suite, v)).map(s => this.bootstrap(s, { report: false })));
      let runner: SuiteRunner = runners.find(rs => rs instanceof SuiteRunner) as SuiteRunner;
      await runner.container.get(TestReport).report();
   }


   async bootstrap(token: Token<any> | ModuleConfigure, config?: ModuleConfig<any> | UnitTestOptions, options?: UnitTestOptions): Promise<Runnable<any>> {
      let params = this.vaildParams(token, config, options);
      let opt = params.options as UnitTestOptions;
      let runner = await super.bootstrap(params.token, params.config, opt) as SuiteRunner;
      if (!(opt && opt.report === false)) {
         await runner.container.get(TestReport).report();
      }
      return runner;
   }
}


/**
 * unit test.
 *
 * @export
 * @param {Src} src
 * @returns {Promise<any>}
 */
export async function runTest(src: Src): Promise<any> {
   let unit = new UnitTest();
   await unit.test(src);
}
