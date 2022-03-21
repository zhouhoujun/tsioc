import { ProviderType, lang, isNumber, Type, ObservableParser, LifecycleHooksResolver, isFunction } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory } from './context';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver, ModuleLifecycleHooksResolver } from './impl/module';
import { DefaultApplicationFactory } from './impl/context';
import { ApplicationRunners, RunnableRef, RunnableSet } from './runnable';
import { Observable, from, lastValueFrom } from 'rxjs';
import { ConfigureService } from './service';
import { Startup } from './startup';


export class DefaultScanSet<T> extends RunnableSet<T> {
    static ρNPT = true;

    private _rs: RunnableRef<T>[] = [];
    protected order = false;
    constructor() {
        super();
        this._rs = [];
    }

    get count(): number {
        return this._rs.length;
    }

    getAll(): RunnableRef<T>[] {
        return this._rs;
    }

    has(type: Type): boolean {
        return this._rs.some(i => i.type === type);
    }

    add(typeRef: RunnableRef<T>, order?: number): void {
        if (this.has(typeRef.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, typeRef);
        } else {
            this._rs.push(typeRef);
        }
    }

    remove(typeOrRef: RunnableRef<T> | Type<T>): void {
        const typeRef = isFunction(typeOrRef) ? this._rs.find(r => r.type === typeOrRef) : typeOrRef;
        lang.remove(this._rs, typeRef);
    }

    clear(): void {
        this._rs = [];
    }

    async run(): Promise<void> {
        if (this._rs.length) {
            if (this.order) {
                await lang.step(Array.from(this._rs).map(svr => () => svr.run()));
            } else {
                await Promise.all(this._rs.map(svr => svr.run()));
            }
        }
    }


    onDestroy(): void {
        this.clear();
    }

}

export class DefaultApplicationRunners extends ApplicationRunners {
    private _startups: RunnableSet<Startup>;
    private _services: RunnableSet<ConfigureService>;
    private _runners: RunnableSet;
    constructor() {
        super();
        this._startups = new DefaultScanSet();
        this._services = new DefaultScanSet();
        this._runners = new DefaultScanSet();
    }
    get startups(): RunnableSet<Startup> {
        return this._startups;
    }
    get services(): RunnableSet<ConfigureService> {
        return this._services;
    }
    get runners(): RunnableSet {
        return this._runners;
    }
    add(runner: RunnableRef<any>, order?: number): void {
        this._runners.add(runner, order);
    }
    addStartup(runner: RunnableRef<Startup>, order?: number): void {
        this._startups.add(runner, order);
    }
    addConfigureService(runner: RunnableRef<ConfigureService>, order?: number): void {
        if (!runner.reflect.class.hasParameters('configureService')) {
            runner.reflect.class.setParameters('configureService', [{ provider: ApplicationContext }])
        }
        this._services.add(runner, order);
    }

    async run(): Promise<void> {
        await this._startups.run();
        await this._services.run();
        await this._runners.run();
    }

    onDestroy(): void {
        this._runners.onDestroy();
        this._services.onDestroy();
        this._startups.onDestroy();
    }

}

export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: ApplicationRunners, useValue: new DefaultApplicationRunners() },
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
