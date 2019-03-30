import { BootContext } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';
import { Type } from '@tsdi/ioc';


export class UnitTestContext extends BootContext {

    configures?: (string | UnitTestConfigure)[];

    static create(type: Type<any>, options?: UnitTestOptions): UnitTestContext {
        let ctx = new UnitTestContext(type);
        options && ctx.setOptions(options);
        return ctx;
    }
}
