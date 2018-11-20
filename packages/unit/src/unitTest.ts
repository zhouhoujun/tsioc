import { DefaultApplicationBuilder } from '@ts-ioc/bootstrap';
import { UnitModule } from './UnitModule';
import { LoadType } from '@ts-ioc/core';

/**
 * unit test.
 *
 * @export
 * @param {UnitTestOptions} options
 * @returns {Promise<any>}
 */
export async function unitTest(options: LoadType): Promise<any> {
   let builder = new DefaultApplicationBuilder('.');
   builder.use(UnitModule)
      .use(options);
   // return builder.bootstrap();
}
