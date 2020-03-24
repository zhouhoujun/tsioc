import { Type, Refs, Injectable, createContext, isToken, IInjector } from '@tsdi/ioc';
import { BootContext, BootOption, ConfigureManager } from '@tsdi/boot';
import { UnitTestConfigure, UnitTestOptions } from './UnitTestConfigure';


@Injectable()
@Refs('@Suite', BootContext)
export class UnitTestContext extends BootContext<BootOption> {

    getConfiguration(): UnitTestConfigure {
        return super.getConfiguration();
    }

    getConfigureManager(): ConfigureManager<UnitTestConfigure> {
        return super.getConfigureManager();
    }

    static parse(injector: IInjector, target: Type | UnitTestOptions): UnitTestContext {
        return createContext(injector, UnitTestContext, isToken(target) ? { module: target } : target);
    }
}
