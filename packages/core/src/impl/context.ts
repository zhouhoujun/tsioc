import {
    Type, Injector, ProviderType, InvokeArguments, EMPTY_OBJ,
    Class, ModuleDef, ModuleRef, DefaultInvocationContext, ReflectiveRef, ProvdierOf
} from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { ApplicationArguments } from '../ApplicationArguments';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationContext, ApplicationFactory, BootstrapOption, EnvironmentOption, PROCESS_ROOT } from '../ApplicationContext';
import { ApplicationContextRefreshEvent } from '../events';
import { setOptions } from '../endpoints/endpoint.service';




/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext<T = any, TArg = ApplicationArguments> extends DefaultInvocationContext implements ApplicationContext<T, TArg> {

    private _multicaster: ApplicationEventMulticaster;
    exit = true;

    private _runners: ApplicationRunners;

    constructor(readonly injector: ModuleRef, options: EnvironmentOption<TArg> = EMPTY_OBJ) {
        super(injector, options);
        this._multicaster = injector.get(ApplicationEventMulticaster);
        injector.setValue(ApplicationContext, this);
        this._runners = injector.get(ApplicationRunners);
        this.onDestroy(this._runners);
        if (options.eventsOptions) {
            setOptions(this.eventMulticaster, options.eventsOptions);
        }
        if (options.runnersOptions) {
            setOptions(this.runners, options.runnersOptions);
        }
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

    get eventMulticaster(): ApplicationEventMulticaster {
        return this._multicaster;
    }

    async bootstrap<C, TArg>(type: Type<C> | Class<C>, option?: BootstrapOption<TArg>): Promise<ReflectiveRef<C>> {
        const typeRef = this.runners.attach(type, option);
        if (typeRef) {
            await this.runners.run(typeRef.type);
        }
        return typeRef;
    }

    getLogger(name?: string): Logger {
        return this.injector.get(LoggerManager, null)?.getLogger(name) ?? null!;
    }

    publishEvent(event: ApplicationEvent): Observable<any>;
    publishEvent(event: Object): Observable<any>;
    publishEvent(obj: ApplicationEvent | Object): Observable<any> {
        return this.eventMulticaster.publishEvent(obj);
    }

    /**
     * refresh context.
     */
    async refresh(): Promise<void> {
        this._multicaster.emit(new ApplicationContextRefreshEvent(this))
    }

    close(): Promise<void> {
        return this.destroy();
    }

    async destroy(): Promise<void> {
        await this.runners.stop();
        super.destroy();
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

    create<T, TArg = ApplicationArguments>(root: ModuleRef<T>, option?: EnvironmentOption<TArg>): ApplicationContext<T, TArg> {
        const ann = root.moduleReflect.getAnnotation<ModuleDef>();
        if (ann?.baseURL) {
            root.setValue(PROCESS_ROOT, ann.baseURL)
        }
        if (!option) {
            option = {};
        }
        if (!option.payload) {
            option.payload = ApplicationArguments as ProvdierOf<TArg>;
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }

    protected createInstance<TArg>(inj: ModuleRef, option?: InvokeArguments<TArg>) {
        return new DefaultApplicationContext(inj, option)
    }
}

