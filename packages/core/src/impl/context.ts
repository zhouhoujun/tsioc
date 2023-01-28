import {
    Type, getClass, Injector, ProviderType, DefaultInvocationContext, createContext, InvokerLike,
    InvokeArguments, ArgumentExecption, EMPTY_OBJ, Class, ModuleDef, InjectFlags
} from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import { ApplicationContext, ApplicationFactory, EnvironmentOption, PROCESS_ROOT } from '../context';
import { RunnableFactory, BootstrapOption, RunnableRef } from '../runnable';
import { ApplicationRunners } from '../runners';
import { ModuleRef } from '../module.ref';
import { ApplicationArguments } from '../args';
import { ApplicationContextRefreshEvent, ApplicationEvent, ApplicationEventMulticaster, PayloadApplicationEvent } from '../events';
import { Observable } from 'rxjs';
import { runInvokers } from '../Interceptor';





/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends DefaultInvocationContext implements ApplicationContext {

    private _multicaster: ApplicationEventMulticaster;
    exit = true;

    private _runners: ApplicationRunners;

    constructor(readonly injector: ModuleRef, options: InvokeArguments = EMPTY_OBJ) {
        super(injector, options);
        const args = injector.get(ApplicationArguments, null);
        if (args && options.arguments !== args) {
            this._args = options.arguments ? { ...options.arguments, ...args } : args
        }
        this._multicaster = injector.get(ApplicationEventMulticaster);
        injector.setValue(ApplicationContext, this);
        this._runners = injector.get(ApplicationRunners);
        this.onDestroy(this._runners)
    }

    protected override createInjector(injector: Injector, providers?: ProviderType[]): Injector {
        if (providers) injector.inject(providers);
        return injector
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT)
    }

    get instance() {
        return this.injector.instance
    }

    get runners() {
        return this._runners
    }

    createRunnable<C>(type: Type<C> | Class<C>, option?: BootstrapOption): RunnableRef<C> {
        const typeRef = this.injector.reflectiveFactory.create(type, this.injector);
        const factory = typeRef.resolve(RunnableFactory);
        return factory.create(type, this.injector, option)
    }

    bootstrap<C>(type: Type<C> | Class<C>, option?: BootstrapOption): any {
        return this.createRunnable(type, option).run()
    }

    getLogger(name?: string): Logger {
        return this.injector.get(LoggerManager, null)?.getLogger(name) ?? null!;
    }

    publishEvent(event: ApplicationEvent): void;
    publishEvent(event: Object): void;
    publishEvent(obj: ApplicationEvent | Object): void {
        if (!obj) throw new ArgumentExecption('Event must not be null');

        // Decorate event as an ApplicationEvent if necessary
        let event: ApplicationEvent;
        if (obj instanceof ApplicationEvent) {
            event = obj
        }
        else {
            event = new PayloadApplicationEvent(this, obj)
        }

        this._multicaster?.emit(event);

        // Publish event via parent context as well...
        const context = this.get(ApplicationContext, InjectFlags.SkipSelf);
        if (context) {
            context.publishEvent(event)
        }
    }

    /**
     * refresh context.
     */
    async refresh(): Promise<void> {
        this._multicaster.emit(new ApplicationContextRefreshEvent(this))
    }

}

export class DefaultEventMulticaster extends ApplicationEventMulticaster {
    private maps: Map<Type, InvokerLike[]>;
    constructor(private injector: Injector) {
        super();
        this.maps = new Map();
    }

    addListener(event: Type<ApplicationEvent>, invoker: InvokerLike, order = -1): void {
        const handlers = this.maps.get(event);
        if (handlers) {
            order >= 0 ? handlers.splice(order, 0, invoker) : handlers.push(invoker);
        } else {
            this.maps.set(event, [invoker]);
        }
    }

    emit(value: ApplicationEvent): Observable<any> {
        const handlers = this.maps.get(getClass(value));
        return runInvokers(handlers, createContext(this.injector), value, v => v.done === true)
    }

    clear(): void {
        this.maps.clear();
    }
}


/**
 * default application factory.
 */
export class DefaultApplicationFactory extends ApplicationFactory {
    /**
     * none poincut for aop.
     */
    static ƿNPT = true;

    constructor() {
        super()
    }

    create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext {
        if ((root.moduleReflect.annotation as ModuleDef)?.baseURL) {
            root.setValue(PROCESS_ROOT, (root.moduleReflect.annotation as ModuleDef).baseURL)
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new DefaultApplicationContext(inj, option)
    }
}

