import { ModuleInjector, InjectorContext } from './ModuleInjector';
import { Type, Singleton } from '@ts-ioc/ioc';

@Singleton
export class IocExtInjector extends ModuleInjector {

    getDecorator(): string {
        return '@IocExt';
    }

    protected setContext(ctx: InjectorContext, injected: Type<any>[]): void {
        if (injected && injected.length) {
            ctx.injected = ctx.injected.concat(injected);
            ctx.modules = [];
        }
    }
}
