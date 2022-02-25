import { Token, Type, isFunction, ModuleMetadata, DefaultInvocationContext, EMPTY_OBJ, InvokeArguments, InvocationContext, lang } from '@tsdi/ioc';
import { ConfigureLoggerManager, LoggerManager, LOGGER_MANAGER } from '@tsdi/logs';
import { Observable } from 'rxjs';
import { CONFIGURATION, PROCESS_ROOT } from './metadata/tk';
import { ApplicationConfiguration, ConfigureManager } from './configure/config';
import { Pattern, WritePacket } from './transport/packet';
import { ClientFactory } from './transport/client';
import { ApplicationContext, ApplicationFactory, BootstrapOption, EnvironmentOption } from './context';
import { RunnableFactory, RunnableFactoryResolver, RunnableSet, RunnableRef } from './runnable';
import { ModuleRef } from './module.ref';
import { StartupSet } from './startup';
import { ServiceSet } from './service';
import { ApplicationArguments } from './args';
import { TransportClient } from './transport/client';




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

    private client: TransportClient | undefined;
    /**
     * send message.
     * @param pattern message pattern.
     * @param data send data.
     */
    send<TResult = WritePacket, TInput = any>(pattern: Pattern, data: TInput): Observable<TResult> {
        if (!this.client) {
            this.client = this.injector.get(ClientFactory).create({
                protocol: 'msg'
            });
        }
        return this.client.send(pattern, data) as Observable<TResult>;
    }

    /**
     * get log manager.
     */
    getLogManager(): LoggerManager {
        let logmgr = this.injector.get(LOGGER_MANAGER);
        if (!logmgr) {
            logmgr = this.injector.get(ConfigureLoggerManager);
            this.injector.setSingleton(LOGGER_MANAGER, logmgr);
        }
        return logmgr;
    }

    get baseURL(): string {
        return this.injector.get(PROCESS_ROOT);
    }

    getAnnoation<TM extends ModuleMetadata>(): TM {
        return this.injector.moduleReflect?.annotation as TM;
    }

    /**
     * configuration merge metadata config and all application config.
     */
    getConfiguration(): ApplicationConfiguration {
        return this.injector.get(CONFIGURATION);
    }

    /**
     * get configure manager.
     *
     * @returns {ConfigureManager}
     */
    getConfigureManager(): ConfigureManager {
        return this.injector.get(ConfigureManager);
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
        this.initOption(ctx, option);
        return ctx;
    }

    initOption<T>(ctx: ApplicationContext, option?: EnvironmentOption) {
        if (!option) return;

        const mgr = ctx.getConfigureManager();
        if (option.configures && option.configures.length) {
            option.configures.forEach(cfg => {
                mgr.useConfiguration(cfg);
            });
        } else {
            // load default config.
            mgr.useConfiguration();
        }
    }

    protected createInstance(inj: ModuleRef, option?: InvokeArguments) {
        return new DefaultApplicationContext(inj, option);
    }
}

