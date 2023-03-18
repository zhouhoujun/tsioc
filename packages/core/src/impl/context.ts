import {
    Type, Injector, ProviderType, InvokeArguments, ArgumentExecption, EMPTY_OBJ,
    Class, ModuleDef, InjectFlags, ModuleRef, DefaultInvocationContext, ReflectiveRef
} from '@tsdi/ioc';
import { Logger, LoggerManager } from '@tsdi/logs';
import { ApplicationArguments } from '../ApplicationArguments';
import { ApplicationEvent } from '../ApplicationEvent';
import { ApplicationEventMulticaster } from '../ApplicationEventMulticaster';
import { ApplicationRunners } from '../ApplicationRunners';
import { ApplicationContext, ApplicationFactory, EnvironmentOption, PROCESS_ROOT } from '../ApplicationContext';
import { ApplicationContextRefreshEvent, PayloadApplicationEvent } from '../events';
import { BootstrapOption } from '../filters/endpoint.factory';




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

    get eventMulticaster(): ApplicationEventMulticaster {
        return this._multicaster;
    }

    async bootstrap<C>(type: Type<C> | Class<C>, option?: BootstrapOption): Promise<ReflectiveRef<C>> {
        const typeRef = this.runners.attach(type, option);
        if (typeRef) {
            await this.runners.run(typeRef.type);
        }
        return typeRef;
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

    create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext {
        const ann = root.moduleReflect.getAnnotation<ModuleDef>();
        if (ann?.baseURL) {
            root.setValue(PROCESS_ROOT, ann.baseURL)
        }
        const ctx = this.createInstance(root, option);
        return ctx
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new DefaultApplicationContext(inj, option)
    }
}

