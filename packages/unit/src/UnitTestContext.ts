import { BootContext, createAnnoationContext } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';
import { Type, Refs, Injectable, ContainerFactory } from '@tsdi/ioc';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext {

    configures?: (string | UnitTestConfigure)[];

    static parse(target: Type<any> | UnitTestOptions, raiseContainer?: ContainerFactory): UnitTestContext {
        return createAnnoationContext(UnitTestContext, target, raiseContainer);
    }
}
