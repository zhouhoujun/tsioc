import { ProviderType, lang, isNumber, Type, isFunction, Injector, Injectable } from '@tsdi/ioc';
import { ApplicationContext, ApplicationFactory } from './context';
import { DefaultApplicationFactory, DefaultEventMulticaster } from './impl/context';
import { RunnableRef, RunnableSet } from './runnable';
import { ConfigureService } from './service';
import { Startup } from './startup';
import { ApplicationRunners } from './runners';
import { RandomUuidGenerator, UuidGenerator } from './uuid';
import { ApplicationEventMulticaster, ApplicationStartEvent } from './events';


export class DefaultScanSet<T> extends RunnableSet<T> {
    static ƿNPT = true;

    private _rs: RunnableRef<T>[] = [];
    protected order = false;
    constructor() {
        super()
        this._rs = []
    }

    get count(): number {
        return this._rs.length
    }

    getAll(): RunnableRef<T>[] {
        return this._rs
    }

    has(type: Type): boolean {
        return this._rs.some(i => i.type === type)
    }

    add(typeRef: RunnableRef<T>, order?: number): void {
        if (this.has(typeRef.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, typeRef)
        } else {
            this._rs.push(typeRef)
        }
    }

    remove(typeOrRef: RunnableRef<T> | Type<T>): void {
        const typeRef = isFunction(typeOrRef) ? this._rs.find(r => r.type === typeOrRef) : typeOrRef;
        lang.remove(this._rs, typeRef)
    }

    clear(): void {
        this._rs = []
    }

    async run(): Promise<void> {
        if (this._rs.length) {
            if (this.order) {
                await lang.step(Array.from(this._rs).map(svr => () => svr.run()))
            } else {
                await Promise.all(this._rs.map(svr => svr.run()))
            }
        }
    }


    onDestroy(): void {
        this.clear()
    }

}

@Injectable()
export class DefaultApplicationRunners extends ApplicationRunners {
    private _startups: RunnableSet<Startup>;
    private _services: RunnableSet<ConfigureService>;
    private _runnables: RunnableSet;
    private _bootstraps: RunnableRef[];
    private _runners: RunnableRef[];
    constructor(private caster: ApplicationEventMulticaster) {
        super()
        this._startups = new DefaultScanSet();
        this._services = new DefaultScanSet();
        this._runnables = new DefaultScanSet();
        this._bootstraps = [];
        this._runners = []
    }
    get startups(): RunnableSet<Startup> {
        return this._startups
    }
    get services(): RunnableSet<ConfigureService> {
        return this._services
    }
    get runnables(): RunnableSet {
        return this._runnables
    }
    get bootstraps(): RunnableRef[] {
        return this._bootstraps
    }

    get runners(): RunnableRef[] {
        return this._runners
    }

    addRunnable(runner: RunnableRef<any>, order?: number): void {
        this._runnables.add(runner, order);
        runner.onDestroy(() => this._runnables.remove(runner))
    }
    addStartup(runner: RunnableRef<Startup>, order?: number): void {
        this._startups.add(runner, order);
        runner.onDestroy(() => this._startups.remove(runner))
    }
    addConfigureService(runner: RunnableRef<ConfigureService>, order?: number): void {
        if (!runner.class.hasParameters('configureService')) {
            runner.class.setParameters('configureService', [{ provider: ApplicationContext }])
        }
        this._services.add(runner, order);
        runner.onDestroy(() => this._services.remove(runner))
    }
    addBootstrap(runner: RunnableRef<any>): void {
        this._bootstraps.push(runner);
        runner.onDestroy(() => lang.remove(this._bootstraps, runner))
    }

    attach(runner: RunnableRef): void {
        this._runners.push(runner);
        runner.onDestroy(() => lang.remove(this._runners, runner))
    }

    async run(): Promise<void> {
        if (this._startups.count) {
            await this._startups.run()
        }
        if (this._services.count) {
            await this._services.run()
        }
        if (this._runnables.count) {
            await this._runnables.run()
        }
        if (this._bootstraps.length) {
            await Promise.all(this._bootstraps.map(b => b.run()))
        }
        this.caster.emit(new ApplicationStartEvent(this));
    }

    onDestroy(): void {
        this._runnables.onDestroy();
        this._services.onDestroy();
        this._startups.onDestroy()
    }

}

export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: ApplicationRunners, useClass: DefaultApplicationRunners, static: true },
    {
        provide: ApplicationEventMulticaster,
        useFactory: (injector: Injector) => {
            return new DefaultEventMulticaster(injector)
        },
        static: true,
        deps: [Injector]
    },
    { provide: ApplicationFactory, useClass: DefaultApplicationFactory, static: true },
    { provide: UuidGenerator, useClass: RandomUuidGenerator, asDefault: true, static: true }
]
