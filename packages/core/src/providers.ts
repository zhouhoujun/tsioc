import { ProviderType, lang, isNumber, Type, ObservableParser, LifecycleHooksResolver } from '@tsdi/ioc';
import { ApplicationFactory, SERVICE_RUNNABLES, STARUP_RUNNABLES } from './context';
import { ModuleFactoryResolver } from './module.factory';
import { DefaultModuleFactoryResolver, ModuleLifecycleHooksResolver } from './impl/module';
import { DefaultApplicationFactory } from './impl/context';
import { RunnableRef, RunnableSet } from './runnable';
import { Observable, from, lastValueFrom } from 'rxjs';


class DefaultScanSet<T> extends RunnableSet<T> {
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
    add(typeRef: RunnableRef, order?: number): void {
        if (this.has(typeRef.type)) return;
        if (isNumber(order)) {
            this.order = true;
            this._rs.splice(order, 0, typeRef);
        } else {
            this._rs.push(typeRef);
        }
    }

    remove(typeRef: RunnableRef | Type<T>): void {
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


export const DEFAULTA_PROVIDERS: ProviderType[] = [
    { provide: STARUP_RUNNABLES, useValue: new DefaultScanSet() },
    { provide: SERVICE_RUNNABLES, useValue: new DefaultScanSet() },
    { provide: RunnableSet, useValue: new DefaultScanSet() },
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
