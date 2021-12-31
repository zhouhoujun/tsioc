import { ProviderType, lang, isNumber, Type, ObservableParser, LifecycleHooksResolver, OperationFactory } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory } from './context';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver, ModuleLifecycleHooksResolver } from './module/module';
import { DefaultApplicationFactory } from './context.impl';
import { Server, ServerSet } from './server';
import { Client, ClientSet } from './client';
import { StartupService, ServiceSet } from './service';
import { ScanSet, TypeRef } from './scan.set';
import { RunnableRef, RunnableSet } from './runnable';
import { Observable, from, lastValueFrom } from 'rxjs';


abstract class AbstractScanSet<T extends TypeRef> implements ScanSet<T> {
    static ρNPT = true;

    private _rs: T[] = [];
    protected order = false;
    constructor() {
        this._rs = [];
    }

    get count(): number {
        return this._rs.length;
    }


    getAll(): T[] {
        return this._rs;
    }

    has(type: Type): boolean {
        return this._rs.some(i => i.type === type);
    }
    add(typeRef: T, order?: number): void {
        if (this.has(typeRef.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, typeRef);
        } else {
            this._rs.push(typeRef);
        }
    }

    remove(typeRef: T | Type<T>): void {
        lang.remove(this._rs, typeRef);
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

    protected abstract run(typeRef: T, ctx: ApplicationContext): any;

    onDestroy(): void {
        this.clear();
    }

}


class ServiceSetImpl extends AbstractScanSet<OperationFactory<StartupService>> implements ServiceSet {
    protected run(typeRef: OperationFactory<StartupService>, ctx: ApplicationContext) {
        return typeRef.resolve().configureService(ctx);
    }
}

class ClientSetImpl extends AbstractScanSet<OperationFactory<Client>> implements ClientSet {
    protected run(typeRef: OperationFactory<Client>, ctx: ApplicationContext) {
        return typeRef.resolve().connect();
    }

}

class ServerSetImpl extends AbstractScanSet<OperationFactory<Server>> implements ServerSet {
    protected run(typeRef: OperationFactory<Server>, ctx: ApplicationContext) {
        return typeRef.resolve().startup();
    }
}

class RunnableSetImpl extends AbstractScanSet<RunnableRef> implements RunnableSet {
    protected run(typeRef: RunnableRef, ctx: ApplicationContext) {
        return typeRef.run();
    }
}

export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: ServerSet, useClass: ServerSetImpl, singleton: true },
    { provide: ClientSet, useClass: ClientSetImpl, singleton: true },
    { provide: ServiceSet, useClass: ServiceSetImpl, singleton: true },
    { provide: RunnableSet, useClass: RunnableSetImpl, singleton: true },
    { provide: LifecycleHooksResolver, useValue: new ModuleLifecycleHooksResolver() },
    { provide: ModuleFactoryResolver, useValue: new DefaultModuleFactoryResolver() },
    { provide: ApplicationFactory, useValue: new DefaultApplicationFactory() },
    {
        provide: ObservableParser,
        useValue: {
            fromPromise<T>(promise: Promise<T>): Observable<T> {
                return from(promise);
            },
            toPromise<T>(obser: Observable<T>): Promise<T> {
                return lastValueFrom(obser);
            }
        } as ObservableParser
    }
]
