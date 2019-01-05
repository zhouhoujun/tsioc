import { ApplicationBuilder } from '@ts-ioc/bootstrap';
import { UnitModule } from './UnitModule';
import { LoadType } from '@ts-ioc/core';
import { Src } from '@taskfr/core';


export class UnitTest extends ApplicationBuilder<any> {
   constructor() {
      super();
      this.use(UnitModule);
   }

   test(src: Src) {

   }
}

let unit: UnitTest;
/**
 * unit test.
 *
 * @export
 * @param {Src} src
 * @returns {Promise<any>}
 */
export async function runTest(src: Src): Promise<any> {
   if (!unit) {
      unit = new UnitTest();
   }
   unit.test(src);
}
