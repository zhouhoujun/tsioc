import { ApplicationBuilder, ModuleConfigure, ModuleConfig, Runnable, RunnableEvents, isDIModuleClass, RunOptions, AppConfigure, IConfigureRegister, RunnableConfigure, ConfigureRegisterToken } from '@ts-ioc/bootstrap';
import { UnitModule } from './UnitModule';
import { Src } from '@ts-ioc/activities';
import { isClass, hasClassMetadata, Type, isString, isArray, Token, IContainer, Refs, LoadType, IContainerBuilder, lang, ContainerBuilder, PromiseUtil } from '@ts-ioc/core';
import { Suite } from './decorators/Suite';
import { TestReport, ReportsToken, isReporterClass, ITestReport } from './reports';
import { SuiteRunner, OldTestRunner } from './runner';
import { DebugLogAspect } from '@ts-ioc/logs';

/**
 * unit test options.
 *
 * @export
 * @interface UnitTestOptions
 * @extends {RunOptions<any>}
 */
export interface UnitTestOptions extends RunOptions<any> {
   report?: boolean;
}

/**
 * unit test configure.
 *
 * @export
 * @interface UnitTestConfigure
 * @extends {AppConfigure}
 */
export interface UnitTestConfigure extends AppConfigure {
   /**
    * resports.
    *
    * @type {Token<ITestReport>[]}
    * @memberof UnitTestConfigure
    */
   reporters: Token<ITestReport>[];
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

   /**
    * create unit test.
    *
    * @static
    * @param {(string | UnitTestConfigure)} [config]
    * @returns
    * @memberof UnitTest
    */
   static create(config?: string | UnitTestConfigure) {
      let unit = new UnitTest();
      if (config) {
         unit.useConfiguration(config);
      }
      return unit;
   }

   initUnit() {
      this.use(UnitModule);
      this.use(UnitTestConfigureRegister);
      this.on(RunnableEvents.registeredExt, (types: Type<any>[], container: IContainer) => {
         let repoters = [];
         types.forEach(type => {
            if (isReporterClass(type)) {
               repoters.push(type);
            } else if (isDIModuleClass(type)) {
               let injMd = this.getInjectedModule(type);
               let pdmap = injMd.getProviderMap();
               if (pdmap) {
                  pdmap.provides().forEach(p => {
                     if (isReporterClass(p)) {
                        repoters.push(p);
                     }
                  });
               }
            }
         });
         this.useReporter(container, ...repoters);
      });
   }


   protected useReporter(container: IContainer, ...reporters: Type<any>[]): this {
      let reps = container.get(ReportsToken) as Type<any>[];
      if (reps) {
         reps = reps.concat(...reporters);
      } else {
         reps = reporters;
      }
      container.bindProvider(ReportsToken, reps);
      return this;
   }

   getTopBuilder(): IContainerBuilder {
      let c = this.getPools().values().find(c => lang.getClass(c.getBuilder()) !== ContainerBuilder);
      if (c) {
         return c.getBuilder();
      }
      return this.getPools().getDefault().getBuilder();
   }


   async test(src: string | Type<any> | (Type<any> | string)[]) {
      await await this.initContainerPools();
      let suites: any[] = [];
      let dbuiler = this.getTopBuilder();

      let oldRunner = this.resolve(OldTestRunner);

      oldRunner.registerGlobalScope();
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
      oldRunner.unregisterGlobalScope();
      await oldRunner.run();
      await PromiseUtil.step(suites.filter(v => isClass(v) && hasClassMetadata(Suite, v)).map(s => () => this.bootstrap(s, { report: false })));
      await this.resolve(TestReport).report();
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


@Refs(UnitTest, ConfigureRegisterToken)
export class UnitTestConfigureRegister implements IConfigureRegister<RunnableConfigure> {

   async register(config: UnitTestConfigure, container: IContainer): Promise<void> {
      if (config.debug) {
         container.register(DebugLogAspect);
      }
      if (isArray(config.reporters) && config.reporters.length) {
         let reps = container.get(ReportsToken) as Type<any>[];
         config.reporters.forEach(type => {
            if (isReporterClass(type)) {
               if (!container.has(type)) {
                  container.use(type);
               }
               reps.push(type);
            }
         });
         container.bindProvider(ReportsToken, reps);
      }
   }
}

/**
 * unit test.
 *
 * @export
 * @param {Src} src
 * @param {(string | AppConfigure)} [config]
 * @param {...LoadType[]} used
 * @returns {Promise<any>}
 */
export async function runTest(src: Src, config?: string | AppConfigure, ...used: LoadType[]): Promise<any> {
   let unit = new UnitTest();
   if (config) {
      unit.useConfiguration(config);
   }
   if (used.length) {
      unit.use(...used);
   }
   await unit.test(src);
}
