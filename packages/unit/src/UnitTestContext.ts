import { Type, Refs, Injectable, createRaiseContext, isToken, IInjector } from '@tsdi/ioc';
import { BootContext, BootOption, ConfigureManager } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext<BootOption> {

    getConfiguration<T extends UnitTestConfigure>() {
        return super.getConfiguration() as T;
    }

    getConfigureManager<T extends UnitTestConfigure>(): ConfigureManager<T>{
        return super.getConfigureManager();
    }

    static parse(injector: IInjector, target: Type | UnitTestOptions): UnitTestContext {
        return createRaiseContext(injector, UnitTestContext, isToken(target) ? { module: target } : target);
    }
}
