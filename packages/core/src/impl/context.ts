import {
    Type, lang, isFunction, ModuleMetadata, getClass, Injector, ProviderType, EMPTY_OBJ,
    DefaultInvocationContext, InvokeArguments, InvocationContext, ArgumentError
} from '@tsdi/ioc';
import { Logger, LoggerFactory } from '@tsdi/logs';
import { PROCESS_ROOT } from '../metadata/tk';
import { ApplicationContext, ApplicationFactory, APP_CONTEXT_IMPL, EnvironmentOption } from '../context';
import { RunnableFactory, RunnableFactoryResolver, BootstrapOption } from '../runnable';
import { ApplicationRunners } from '../runners';
import { ModuleRef } from '../module.ref';
import { ApplicationArguments } from '../args';
import { ApplicationEvent, ApplicationEventMulticaster } from '../events';





/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends DefaultInvocationContext implements ApplicationContext {

    private _multicaster: ApplicationEventMulticaster|null;
    exit = true;

    private _runners: ApplicationRunners;

    constructor(readonly injector: ModuleRef, options: InvokeArguments = EMPTY_OBJ) {
        super(injector, options);
        const args = injector.get(ApplicationArguments, null);
        if (args && options.arguments !== args) {
            this._args = options.arguments ? { ...options.arguments, ...args } : args;
        }
        this._multicaster = injector.get(ApplicationEventMulticaster, null);
        if (!this._multicaster) {
            this._multicaster = new DefaultEventMulticaster();
            injector.setValue(ApplicationEventMulticaster, this._multicaster);
        }
        // injector.setValue(InvocationContext, this);
        injector.setValue(ApplicationContext, this);
        this._runners = injector.get(ApplicationRunners);
        this.onDestroy(this._runners);
    }

    protected override createInjector(injector: Injector, providers?: ProviderType[]): Injector {
        if (providers) injector.inject(providers);
        return injector;
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    get instance() {
        return this.injector.instance;
    }

    get runners() {
        return this._runners;
    }

    bootstrap<C>(type: Type<C> | RunnableFactory<C>, option?: BootstrapOption): any {
        const factory = isFunction(type) ? this.injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type) : type;
        return factory.create(this.injector, option).run();
    }

    getLogger(name?: string): Logger {
        return this.injector.get(LoggerFactory, null)?.getLogger(name)!;
    }

    publishEvent(event: ApplicationEvent): void;
    publishEvent(event: Object): void;
    publishEvent(obj: ApplicationEvent | Object): void {
        if (!obj) throw new ArgumentError('Event must not be null');

        // Decorate event as an ApplicationEvent if necessary
        let event: ApplicationEvent;
        if (obj instanceof ApplicationEvent) {
            event = obj;
        }
        else {
            event = new PayloadApplicationEvent(this, obj);
        }

        this._multicaster?.emit(event);

        // Publish event via parent context as well...
        if (this.parent) {
            if (this.parent instanceof ApplicationContext
                || this.parent instanceof DefaultApplicationContext) {
                (this.parent as ApplicationContext).publishEvent(event);
            }
        }
    }

    /**
     * refresh context.
     */
    refresh(): void {
        // this._multicaster.unsubscribe();
    }

    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
    }
}

export class DefaultEventMulticaster extends ApplicationEventMulticaster {
    emit(value: ApplicationEvent) { super.next(value); }
}

export class PayloadApplicationEvent<T = any> extends ApplicationEvent {

    constructor(source: Object, public playload: T) {
        super(source);
    }

    getPayloadType() {
        return getClass(this.playload);
    }
}


/**
 * default application factory.
 */
export class DefaultApplicationFactory extends ApplicationFactory {

    constructor() {
        super();
        APP_CONTEXT_IMPL.create = this.create.bind(this);
    }

    create<T>(root: ModuleRef<T>, option?: EnvironmentOption): ApplicationContext {
        if (root.moduleReflect.annotation?.baseURL) {
            root.setValue(PROCESS_ROOT, root.moduleReflect.annotation.baseURL);
        }
        const ctx = this.createInstance(root, option);
        return ctx;
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new DefaultApplicationContext(inj, option);
    }
}

