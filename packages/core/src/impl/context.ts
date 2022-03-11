import { Type, isFunction, ModuleMetadata, DefaultInvocationContext, EMPTY_OBJ, InvokeArguments, InvocationContext, lang } from '@tsdi/ioc';
import { PROCESS_ROOT } from '../metadata/tk';
import { ApplicationContext, ApplicationFactory, BootstrapOption, EnvironmentOption } from '../context';
import { RunnableFactory, RunnableFactoryResolver, RunnableSet, RunnableRef } from '../runnable';
import { ModuleRef } from '../module.ref';
import { StartupSet } from '../startup';
import { ServiceSet } from '../service';
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

    exit = true;

    constructor(readonly injector: ModuleRef, options: InvokeArguments = EMPTY_OBJ) {
        super(injector, options);
        const args = injector.get(ApplicationArguments);
        if (args) {
            this._args = args;
            options.arguments && lang.forIn(options.arguments, (v, k) => this.setArgument(k, v));
        }
        injector.setValue(InvocationContext, this);
        injector.setValue(ApplicationContext, this);
    }

    get services() {
        return this.injector.get(ServiceSet);
    }

    get runnables() {
        return this.injector.get(RunnableSet);
    }

    get startups() {
        return this.injector.get(StartupSet);
    }

    bootstrap<C>(type: Type<C> | RunnableFactory<C>, option?: BootstrapOption): any {
        const factory = isFunction(type) ? this.injector.resolve({ token: RunnableFactoryResolver, target: type }).resolve(type) : type;
        return factory.create(this.injector, option).run();
    }

    get instance() {
        return this.injector.instance;
    }

    getLogger(name?: string): ILogger {
        return this.injector.get(LoggerFactory)?.getLogger(name);
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
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

