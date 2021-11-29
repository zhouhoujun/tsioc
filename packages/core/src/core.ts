import { Inject, IocExt, Injector, ProviderType, Resolver, lang, isNumber, Type } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { ApplicationContext, ApplicationFactory } from './context';
import { ApplicationShutdownHandlers, createShutdown, isShutdown } from './shutdown';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver } from './module/module';
import { DefaultApplicationFactory } from './context.impl';
import { isDisposable } from './dispose';
import { Server, ServerSet } from './server';
import { Client, ClientSet } from './client';
import { StartupService, ServiceSet } from './service';
import { ScanSet } from './scan.set';
import { Runnable, RunnableSet } from './runnable';



/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class CoreModule
 */
@IocExt()
export class CoreModule {
    /**
     * register core module.
     */
    setup(@Inject() injector: Injector) {
        const platform = injector.platform();

        platform.onInstanceCreated((target, inj) => {
            if (isShutdown(target) || isDisposable(target)) {
                const hdrs = inj.get(ApplicationShutdownHandlers);
                if (hdrs && !hdrs.has(target)) {
                    hdrs.add(createShutdown(target));
                }
            }
        });

        injector.register(DefaultConfigureManager, ConfigureMergerImpl);
    }
}


abstract class AbstractScanSet<T = any> implements ScanSet<T> {
    private _rs: Resolver<T>[] = [];
    protected order = false;
    constructor() {
        this._rs = [];
    }

    get count(): number {
        return this._rs.length;
    }


    getAll(): Resolver<T>[] {
        return this._rs;
    }

    has(type: Type): boolean {
        return this._rs.some(i => i.type === type);
    }
    add(resolver: Resolver<T>, order?: number): void {
        if (this.has(resolver.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, resolver);
        } else {
            this._rs.push(resolver);
        }
    }
    remove(resolver: Resolver<T> | Type<T>): void {
        lang.remove(this._rs, resolver);
    }
    clear(): void {
        this._rs = [];
    }

    async startup(ctx: ApplicationContext): Promise<void> {
        if (this._rs.length) {
            if (this.order) {
                await lang.step(Array.from(this._rs).map(svr => () => this.run(svr, ctx)));
            } else {
                await Promise.all(this._rs.map(svr => this.run(svr, ctx)));
            }
        }
    }

    protected abstract run(resolver: Resolver<T>, ctx: ApplicationContext): any;

    destroy(): void {
        this.clear();
    }

}


class ServiceSetImpl extends AbstractScanSet implements ServiceSet {
    protected run(resolver: Resolver<StartupService>, ctx: ApplicationContext) {
        return resolver.resolve()?.configureService(ctx);
    }
}

class ClientSetImpl extends AbstractScanSet implements ClientSet {
    protected run(resolver: Resolver<Client>, ctx: ApplicationContext) {
        return resolver.resolve()?.connect();
    }

}

class ServerSetImpl extends AbstractScanSet implements ServerSet {
    protected run(resolver: Resolver<Server>, ctx: ApplicationContext) {
        return resolver.resolve()?.startup();
    }
}

class RunnableSetImpl extends AbstractScanSet implements RunnableSet {
    protected run(resolver: Resolver<Runnable>, ctx: ApplicationContext) {
        return resolver.resolve()?.run();
    }
}

export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: ServerSet, useClass: ServerSetImpl, singleton: true },
    { provide: ClientSet, useClass: ClientSetImpl, singleton: true },
    { provide: ServiceSet, useClass: ServiceSetImpl, singleton: true },
    { provide: RunnableSet, useClass: RunnableSetImpl, singleton: true },
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() }
]
