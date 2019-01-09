import { ApplicationBuilder, ModuleConfigure, ModuleConfig, BootOptions, Runnable } from '@ts-ioc/bootstrap';
import { UnitModule } from './UnitModule';
import { Src } from '@ts-ioc/activities';
import { isClass, hasClassMetadata, Type, isString, isArray, Token, LoadType } from '@ts-ioc/core';
import { Suite, Report } from './core';
import * as globby from 'globby';
import { TestReport, ReportsToken, Reporter } from './reports';
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
      this.use(UnitModule);
   }


   useReporter(...reporters: Type<any>[]): this {
      let reps = this.getProvider(ReportsToken) as Type<any>[];
      if (reps) {
         reps = reps.concat(...reporters);
      } else {
         reps = reporters;
      }
      this.use(...reporters);
      this.provider(ReportsToken, reps.filter(r => isClass(r) && hasClassMetadata(Report, r)), true);
      return this;
   }


   async test(src: string | Type<any> | (Type<any> | string)[]) {
      let suites: any[];
      if (isString(src)) {
         suites = await globby(src);
      } else if (isClass(src)) {
         suites = [src];
      } else if (isArray(src)) {
         if (src.some(t => isClass(t))) {
            suites = src;
         } else {
            suites = await globby(src);
         }
      }
      let runners = await Promise.all(suites.map(s => this.runSuite(s)));
      let runner: SuiteRunner;
      runners.some(rs => {
         if (rs && rs.length) {
            runner = rs.find(r => r instanceof SuiteRunner) as SuiteRunner;
         }
         return !!runner;
      });

      await runner.container.get(TestReport).report();
   }

   protected runSuite(suite: string | Type<any> | (Type<any> | string)[]) {
      let suites: any[];
      if (isString(suite)) {
         let md = require(suite);
         suites = Object.values(md);
      } else if (isClass(suite)) {
         suites = [suite];
      } else if (isArray(suite)) {
         suite.forEach(s => {
            if (isString(s)) {
               let md = require(s);
               suites.push(...Object.values(md));
            } else {
               suites.push(s);
            }
         })
      } else {
         suites = [];
      }

      return Promise.all(suites.filter(v => isClass(v) && hasClassMetadata(Suite, v))
         .map(v => {
            return this.bootstrap(v, { report: false });
         }));
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
