import { Inject, IocExt, Injector, ProviderType, Resolver, lang } from '@tsdi/ioc';
import { DefaultConfigureManager, ConfigureMergerImpl } from './configure/manager';
import { ApplicationContext, ApplicationFactory } from './context';
import { ApplicationShutdownHandlers, createShutdown, isShutdown } from './shutdown';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver } from './module/module';
import { DefaultApplicationFactory } from './context.impl';
import { isDisposable } from './dispose';
import { Server, ServerSet } from './server';
import { Client, ClientSet } from './client';
import { Service, ServiceSet } from './services/service';




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


class ServiceSetImpl extends ServiceSet {

    private _sets: Resolver<Service>[] = [];
    get count(): number {
        return this._sets.length;
    }

    getAll(): Resolver<Service>[] {
        return this._sets;
    }

    async configuration(ctx: ApplicationContext): Promise<void> {
        if (this._sets.length) {
            await lang.step(this._sets.map(rser => () => rser.resolve()?.configureService(ctx)));
        }
    }

    clear(): void {
        this._sets = [];
    }
    destroy(): void {
        this.clear();
    }

}

class ClientSetImpl extends ClientSet {
    private _set = new Set<Resolver<Client>>();
    get count(): number {
        return this._set.size;
    }
    add(resolver: Resolver<Client>): void {
        this._set.add(resolver);
    }
    remove(resolver: Resolver<Client>): void {
        this._set.delete(resolver);
    }
    clear(): void {
        this._set.clear();
    }

    async connect(): Promise<void> {
        if (this._set.size) {
            await Promise.all(Array.from(this._set).map(clt => clt.resolve()?.connect()));
        }
    }

    destroy(): void {
        this.clear();
    }

}

class ServerSetImpl extends ServerSet {
    private _set = new Set<Resolver<Server>>();
    get count(): number {
        return this._set.size;
    }
    add(resolver: Resolver<Server>): void {
        this._set.add(resolver);
    }
    remove(resolver: Resolver<Server>): void {
        this._set.delete(resolver);
    }
    clear(): void {
        this._set.clear();
    }

    async connent(): Promise<void> {
        if (this._set.size) {
            await Promise.all(Array.from(this._set).map(svr => svr.resolve()?.startup()));
        }
    }

    destroy(): void {
        this.clear();
    }

}

export const DEFAULTA_FACTORYS: ProviderType[] = [
    { provide: ServerSet, useClass: ServerSetImpl, singleton: true },
    { provide: ClientSet, useClass: ClientSetImpl, singleton: true },
    { provide: ServiceSet, useClass: ServiceSetImpl, singleton: true },
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() }
]
