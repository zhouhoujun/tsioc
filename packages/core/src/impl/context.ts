import {
    Type, lang, isFunction, ModuleMetadata, DefaultInvocationContext, EMPTY_OBJ, InvokeArguments,
    InvocationContext, ArgumentError, getClass, Injector, ProviderType
} from '@tsdi/ioc';
import { PROCESS_ROOT } from '../metadata/tk';
import { EventEmitter } from '../EventEmitter';
import { ApplicationContext, ApplicationEvent, ApplicationFactory, BootstrapOption, EnvironmentOption } from '../context';
import { RunnableFactory, RunnableFactoryResolver, RunnableRef, ApplicationRunners } from '../runnable';
import { ModuleRef } from '../module.ref';
import { ApplicationArguments } from '../args';
import { ILogger, LoggerFactory } from '../logger';




/**
 * application boot context.
 *
 * @export
 * @class BootContext
 * @extends {HandleContext}
 */
export class DefaultApplicationContext extends DefaultInvocationContext implements ApplicationContext {

    readonly bootstraps: RunnableRef[] = [];
    private _eventEmitter: EventEmitter<ApplicationEvent>;
    exit = true;

    private _runners: ApplicationRunners;

    constructor(readonly injector: ModuleRef, options: InvokeArguments = EMPTY_OBJ) {
        super(injector, options);
        const args = injector.get(ApplicationArguments);
        if (args) {
            this._args = args;
            options.arguments && lang.forIn(options.arguments, (v, k) => this.setArgument(k, v));
        }
        this._eventEmitter = new EventEmitter();
        injector.setValue(InvocationContext, this);
        injector.setValue(ApplicationContext, this);
        this._runners = injector.get(ApplicationRunners);
        this.onDestroy(this._runners);
    }

    protected override createInvocationInjector(injector: Injector, providers?: ProviderType[]): Injector {
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


    getLogger(name?: string): ILogger {
        return this.injector.get(LoggerFactory)?.getLogger(name);
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

        this._eventEmitter.emit(event);

        // Publish event via parent context as well...
        if (this.parent) {
            if (this.parent instanceof ApplicationContext
                || this.parent instanceof DefaultApplicationContext) {
                (this.parent as ApplicationContext).publishEvent(event);
            }
        }
    }


    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
    }

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

