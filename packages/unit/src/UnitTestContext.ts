import { BootContext } from '@ts-ioc/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';
import { Type } from '@ts-ioc/ioc';


export class UnitTestContext extends BootContext {

    configures?: (string | UnitTestConfigure)[];

    static create(type: Type<any>, options?: UnitTestOptions): UnitTestContext {
        let ctx = new UnitTestContext(type);
        options && ctx.setOptions(options);
        return ctx;
    }
}
