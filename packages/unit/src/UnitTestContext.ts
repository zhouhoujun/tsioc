import { Type, Refs, Injectable, createRaiseContext, isToken, IInjector } from '@tsdi/ioc';
import { BootContext, BootOption } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext<BootOption, UnitTestConfigure> {

    static parse(injector: IInjector, target: Type | UnitTestOptions): UnitTestContext {
        return createRaiseContext(injector, UnitTestContext, isToken(target) ? { module: target } : target);
    }
}
